import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { listBusinesses, type BusinessRow } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { ACCESS_LABEL, CATEGORY_NAMES, formatDay, formatPhone, PLAN_NAMES } from "@/lib/labels";
import type { Category } from "@/models/Business";

export const metadata: Metadata = { title: "Businesses" };

const VIEWS: Record<string, { label: string; match: (b: BusinessRow) => boolean }> = {
  all: { label: "All", match: () => true },
  paying: { label: "Paying", match: (b) => !b.demo && !b.suspended && ["active", "renew_soon", "grace"].includes(b.access.state) },
  due: { label: "Due or lapsed", match: (b) => ["grace", "locked"].includes(b.access.state) },
  unpaid: { label: "Not paid yet", match: (b) => b.access.state === "none" },
  paused: { label: "Paused", match: (b) => b.suspended },
};

export default async function BusinessesPage({ searchParams }: PageProps<"/admin/businesses">) {
  await requireAdmin();
  const q = await searchParams;
  const view = typeof q.view === "string" && q.view in VIEWS ? q.view : "all";
  const term = typeof q.q === "string" ? q.q.trim().toLowerCase() : "";
  const all = await listBusinesses();
  const digits = term.replace(/\D/g, "");
  const searched = term
    ? all.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.owner.name.toLowerCase().includes(term) ||
          b.owner.email.includes(term) ||
          b.slug.includes(term) ||
          (digits.length >= 4 && (b.owner.phone.includes(digits) || b.owner.phone.includes(digits.replace(/^0/, "92")))),
      )
    : all;
  const rows = searched.filter(VIEWS[view].match);
  const qs = (v: string) => {
    const p = new URLSearchParams();
    if (v !== "all") p.set("view", v);
    if (term) p.set("q", term);
    const s = p.toString();
    return `/admin/businesses${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Businesses" lede={`${all.length} signed up · ${all.filter(VIEWS.paying.match).length} paying`}>
        <Link href="/admin/businesses/new" className="btn btn-sm">
          Add business
        </Link>
      </PageHeader>

      <Tabs
        current={view}
        tabs={Object.entries(VIEWS).map(([key, v]) => ({ key, label: v.label, href: qs(key), count: searched.filter(v.match).length }))}
      />

      <form className="mb-5 flex flex-wrap items-center justify-between gap-3" role="search">
        {view !== "all" && <input type="hidden" name="view" value={view} />}
        <div className="relative w-full sm:w-[320px]">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
          <input
            name="q"
            type="search"
            defaultValue={term}
            placeholder="Name, owner, email or phone"
            aria-label="Search businesses"
            className="input min-h-9 py-1.5 pl-9 text-sm"
          />
        </div>
        <p className="text-sm text-muted">
          {rows.length} {rows.length === 1 ? "business" : "businesses"}
          {term && (
            <>
              {" "}
              matching “{term}” ·{" "}
              <Link href={qs(view).replace(/[?&]q=[^&]*/, "")} className="link">
                Clear
              </Link>
            </>
          )}
        </p>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-control px-5 py-8 text-center text-sm text-muted">No businesses here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="tbl min-w-[860px]">
            <thead>
              <tr>
                <th>Business</th>
                <th>Owner</th>
                <th>Plan</th>
                <th>Paid until</th>
                <th>Joined</th>
                <th className="r">Status</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {rows.map((b) => {
                const s = b.demo ? { label: "Demo", tone: "" } : b.suspended ? { label: "Paused", tone: "pill-negative" } : ACCESS_LABEL[b.access.state];
                return (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/admin/businesses/${b.id}`} className="font-medium hover:underline">
                        {b.name}
                      </Link>
                      <span className="block text-xs text-muted">
                        {CATEGORY_NAMES[b.category as Category] ?? "Other"} · {b.city}
                      </span>
                    </td>
                    <td>
                      {b.owner.name}
                      <span className="num block text-xs text-muted">{formatPhone(b.owner.phone)}</span>
                    </td>
                    <td>{b.access.plan ? PLAN_NAMES[b.access.plan] : <span className="text-muted">—</span>}</td>
                    <td className="whitespace-nowrap">{b.access.paidUntil ? formatDay(b.access.paidUntil) : <span className="text-muted">—</span>}</td>
                    <td className="whitespace-nowrap text-muted">{formatDay(b.createdAt)}</td>
                    <td className="r">
                      <span className={`pill ${s.tone}`}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
