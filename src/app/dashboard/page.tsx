import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireOwner } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getFeedback, getStats, SOURCE_LABELS } from "@/lib/stats";

export default async function OverviewPage() {
  const { user, business } = await requireOwner();
  const [stats, notes] = await Promise.all([getStats(business.id), getFeedback(business.id, 3)]);
  const rate = stats.visits ? Math.round((stats.googleClicks / stats.visits) * 100) : null;

  return (
    <>
      <PageHeader title={`Salam, ${user.name.split(" ")[0]}`} lede="What happened on your review page in the last 30 days." />

      {!business.googleReviewUrl && (
        <div className="panel mb-6 flex flex-wrap items-center justify-between gap-4 border-amber/60 bg-amber/10 p-5">
          <div>
            <p className="font-medium">Add your Google review link</p>
            <p className="mt-1 text-sm text-ink-3">Until it is set, the “Review us on Google” button on your page has nowhere to go.</p>
          </div>
          <Link href="/dashboard/settings" className="btn btn-gold">Add the link</Link>
        </div>
      )}

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Review page visits" value={stats.visits} />
        <Stat label="Went on to Google" value={stats.googleClicks} note={rate === null ? undefined : `${rate}% of visits`} />
        <Stat label="WhatsApp requests sent" value={stats.whatsappSent} />
        <Stat label="Private notes" value={stats.feedback} />
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="panel p-5 md:p-6">
          <h2 className="font-medium">How customers reached you</h2>
          <table className="mt-4 w-full text-[0.95rem] tabular-nums">
            <thead>
              <tr className="text-left text-sm text-stone">
                <th className="pb-2 font-normal">Way in</th>
                <th className="pb-2 text-right font-normal">Visits</th>
                <th className="pb-2 text-right font-normal">To Google</th>
              </tr>
            </thead>
            <tbody>
              {stats.visitsBySource.map((row) => (
                <tr key={row.source} className="border-t border-line">
                  <td className="py-3">{row.label}</td>
                  <td className="py-3 text-right">{row.visits}</td>
                  <td className="py-3 text-right">{row.toGoogle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel flex flex-col p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-medium">Latest private notes</h2>
            <Link href="/dashboard/feedback" className="text-sm text-stone underline-offset-4 hover:text-ink hover:underline">
              See all
            </Link>
          </div>
          {notes.length === 0 ? (
            <p className="mt-4 text-sm text-stone">
              None yet. When a customer would rather tell you something privately, it lands here, not on Google.
            </p>
          ) : (
            <ul className="mt-2">
              {notes.map((note) => (
                <li key={note.id} className="border-t border-line py-3 first:border-t-0">
                  <p className="line-clamp-2">{note.message}</p>
                  <p className="mt-1 text-sm text-stone">
                    {note.name || "Anonymous"} · {SOURCE_LABELS[note.source] ?? "Direct link"} · {formatDate(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="panel p-5">
      <p className="text-sm text-stone">{label}</p>
      <p className="mt-3 text-[2rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">{value.toLocaleString("en-PK")}</p>
      {note && <p className="mt-2 text-sm text-growth">{note}</p>}
    </div>
  );
}
