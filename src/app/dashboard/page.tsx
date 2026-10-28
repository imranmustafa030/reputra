import Link from "next/link";
import { Suspense } from "react";
import Loading from "./loading";
import { Star } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { DailyBars } from "@/components/daily-bars";
import { CountUp } from "@/components/motion/count-up";
import { StepTrack, type Step } from "@/components/step-track";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { requirePaidOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay, formatWhen, PACK_STEPS, PLAN_NAMES } from "@/lib/labels";
import { businessLinks } from "@/lib/tags";
import { formatPKR } from "@/lib/plans";
import { countUnreadNotes, firstCounterVisit, getDaily, getFeedback, getStats, SOURCE_LABELS } from "@/lib/stats";
import { Payment } from "@/models/Payment";
import { SetupPack } from "@/models/SetupPack";

// The owner's home: where setup stands, then what it earned.
// Question: "Is Reputra sending my customers to Google?"
// Its own Suspense boundary, so switching here from another page in the menu streams in place.
export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const { business, access } = await requirePaidOwner();
  await db();
  const [stats, daily, notes, unread, pack, firstVisit, checking, pageUrl] = await Promise.all([
    getStats(business.id, 30),
    getDaily(business.id, 30),
    getFeedback(business.id, 3),
    countUnreadNotes(business.id),
    SetupPack.findOne({ business: business.id, status: { $ne: "canceled" } }).sort({ createdAt: -1 }).lean(),
    firstCounterVisit(business.id),
    Payment.findOne({ business: business.id, status: "submitted" }).sort({ createdAt: -1 }).lean(),
    businessLinks(business.id).then((l) => l.plain),
  ]);

  const packIndex = pack ? PACK_STEPS.findIndex((s) => s.status === pack.status) : -1;
  const steps: Step[] = [
    {
      title: "Plan paid",
      detail: checking ? `${formatPKR(checking.amount)} · we’re checking the transfer` : `${PLAN_NAMES[access.plan!]} · until ${formatDay(access.paidUntil!)}`,
      state: "done",
    },
    business.googleReviewUrl
      ? { title: "Google link added", detail: "Customers land on your review box", state: "done" }
      : {
          title: "Add your Google link",
          detail: "So the button opens your review box",
          state: "current",
          href: "/dashboard/settings#google",
          lede: "Next: add your Google review link, so the button on your review page opens your review box.",
        },
    pack?.status === "installed"
      ? { title: "Stand & card installed", detail: formatDay(pack.updatedAt), state: "done" }
      : pack
        ? {
            title: "Stand & card on the way",
            detail: PACK_STEPS[packIndex]?.owner ?? "Being prepared",
            state: business.googleReviewUrl ? "current" : "next",
            lede: "Your stand and card are being prepared. Until they arrive, ask customers on WhatsApp.",
          }
        : { title: "Stand & card", detail: "Arranged with the Reputra team", state: "next" },
    firstVisit
      ? { title: "First customer at the counter", detail: formatDay(firstVisit), state: "done" }
      : {
          title: "First customer at the counter",
          detail: "The first scan or tap marks this done",
          state: pack?.status === "installed" ? "current" : "next",
          lede: "Your stand is in place. Ask the next customer at the counter to scan or tap it.",
        },
  ];
  const setupDone = steps.every((s) => s.state === "done");
  const rate = stats.visits ? (stats.googleClicks / stats.visits) * 100 : 0;
  const ways = stats.bySource.filter((w) => w.source !== "direct" || w.visits > 0);

  const finding =
    access.state === "renew_soon" || access.state === "grace"
      ? access.daysLeft > 0
        ? `Your plan ends in ${access.daysLeft} ${access.daysLeft === 1 ? "day" : "days"}. Renew to keep everything running.`
        : `Your plan ended on ${formatDay(access.paidUntil!)}. Renew before ${formatDay(access.locksOn!)} to keep the dashboard.`
      : unread > 0
        ? `${unread} new private ${unread === 1 ? "note" : "notes"} from customers.`
        : !setupDone
          ? (steps.find((s) => s.state === "current")?.lede ?? "Almost set up. We’ll message you on WhatsApp about your stand and card.")
          : `${stats.googleClicks} ${stats.googleClicks === 1 ? "customer" : "customers"} went on to Google in the last 30 days.`;

  return (
    <>
      <PageHeader title="Overview" lede={finding}>
        <Link href="/dashboard/send" className="btn btn-sm">
          Ask a customer
        </Link>
      </PageHeader>

      {(access.state === "renew_soon" || access.state === "grace") && (
        <div className="notice mb-4">
          <span className="flex-1">
            {access.state === "grace" ? "Payment due." : "Renewal coming up."} Paid until {formatDay(access.paidUntil!)}.
          </span>
          <Link href="/checkout" className="btn btn-sm">
            Renew now
          </Link>
        </div>
      )}

      {!setupDone && <StepTrack steps={steps} label="Setup" className="enter mb-4" />}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="enter panel p-5 sm:p-6" style={{ "--i": 1 } as React.CSSProperties} aria-labelledby="pulse">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <div>
              <h2 id="pulse" className="text-sm text-muted">
                Customers sent to Google
              </h2>
              <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <CountUp value={stats.googleClicks} className="text-[2rem] leading-10 font-semibold tracking-[-0.02em]" />
                <span className="text-sm text-muted">
                  of <span className="num text-ink">{stats.visits}</span> who opened your page
                  {stats.visits > 0 && <> · <span className="num text-ink">{rate.toFixed(0)}%</span> went on</>}
                </span>
              </p>
            </div>
            <p className="text-sm text-muted">Last 30 days</p>
          </div>

          <div className="mt-6">
            <DailyBars label="Customers sent to Google per day, last 30 days" days={daily.map((d) => ({ day: d.day, value: d.google }))} />
          </div>

          <table className="tbl mt-6">
            <thead>
              <tr>
                <th>Way in</th>
                <th className="r">Opened the page</th>
                <th className="r">Went to Google</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {ways.map((w) => (
                <tr key={w.source}>
                  <td className="font-medium">{SOURCE_LABELS[w.source]}</td>
                  <td className="r num">
                    {w.visits}
                    <span className="block text-xs text-muted">{w.visits ? `${Math.round((w.toGoogle / w.visits) * 100)}% went on` : "—"}</span>
                  </td>
                  <td className="r num text-base font-semibold">{w.toGoogle}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-muted">
            <span className="num text-ink">{stats.whatsappSent}</span> WhatsApp {stats.whatsappSent === 1 ? "request" : "requests"} sent in 30 days
            {stats.rating && (
              <>
                {" "}· customers rated their visit{" "}
                <span className="num font-medium text-ink">{stats.rating.average.toFixed(1)}</span>
                <Star aria-label="stars" className="mb-0.5 ml-0.5 inline size-3.5 fill-amber text-amber" strokeWidth={0} /> on average ({stats.rating.count})
              </>
            )}
            .
          </p>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
          <section className="enter" style={{ "--i": 2 } as React.CSSProperties} aria-labelledby="notes-title">
            <SectionTitle
              action={
                <Link href="/dashboard/feedback" className="text-sm text-muted hover:text-ink">
                  View all
                </Link>
              }
            >
              <span id="notes-title">Private notes</span>
            </SectionTitle>
            <div className="panel px-5">
              {notes.length === 0 ? (
                <p className="py-5 text-sm text-muted">No private notes yet. When a customer writes to you instead of Google, it lands here.</p>
              ) : (
                <ul>
                  {notes.map((n, i) => (
                    <li key={n.id} className={`py-4 ${i ? "border-t border-rule" : ""}`}>
                      <p className="line-clamp-2 text-[0.9375rem]">“{n.message}”</p>
                      <p className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                        {!n.read && <span className="pill pill-amber h-5 px-2">New</span>}
                        {SOURCE_LABELS[n.source]} · {formatWhen(n.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="enter" style={{ "--i": 3 } as React.CSSProperties} aria-labelledby="plan-title">
            <SectionTitle>
              <span id="plan-title">Plan</span>
            </SectionTitle>
            <div className="panel flex items-center justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{PLAN_NAMES[access.plan!]}</p>
                <p className="mt-0.5 text-sm text-muted">Paid until {formatDay(access.paidUntil!)}</p>
              </div>
              <Link href="/dashboard/billing" className="btn btn-secondary btn-sm">
                Billing
              </Link>
            </div>
          </section>

          <section className="enter" style={{ "--i": 4 } as React.CSSProperties} aria-labelledby="page-title">
            <SectionTitle>
              <span id="page-title">Your review page</span>
            </SectionTitle>
            <div className="panel p-5">
              <div className="flex items-stretch">
                <code className="flex min-w-0 flex-1 items-center rounded-l-[10px] border border-r-0 border-control bg-frame px-3 font-mono text-[0.8125rem]">
                  <span className="min-w-0 truncate">{pageUrl.replace(/^https?:\/\//, "")}</span>
                </code>
                <CopyButton text={pageUrl} />
              </div>
              <p className="mt-3 text-sm text-muted">
                The stand, card and WhatsApp all open this page.{" "}
                <Link href="/dashboard/links" className="link">
                  QR and links
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
