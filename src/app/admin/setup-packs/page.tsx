import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { movePack } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/page-header";
import { Tabs } from "@/components/tabs";
import { listPacks } from "@/lib/admin";
import { PackStack } from "../mobile-lists";
import { requireAdmin } from "@/lib/auth";
import { formatDay, formatPhone, PACK_LABEL, PACK_STEPS } from "@/lib/labels";
import type { PackStatus } from "@/models/SetupPack";

export const metadata: Metadata = { title: "Setup packs" };

const VIEWS = {
  todo: { label: "To deliver", status: ["new", "printing", "on_the_way"] },
  installed: { label: "Installed", status: ["installed"] },
  canceled: { label: "Canceled", status: ["canceled"] },
} as const;
type View = keyof typeof VIEWS;

// Each free stand and card, from order to the owner's counter. One button moves it one step.
export default async function SetupPacksPage({ searchParams }: PageProps<"/admin/setup-packs">) {
  await requireAdmin();
  const q = await searchParams;
  const view: View = (Object.keys(VIEWS) as View[]).includes(q.view as View) ? (q.view as View) : "todo";
  const [packs, todo] = await Promise.all([
    listPacks({ status: [...VIEWS[view].status] as PackStatus[] }),
    view === "todo" ? null : listPacks({ status: ["new", "printing", "on_the_way"] }),
  ]);
  const open = view === "todo" ? packs.length : todo!.length;

  return (
    <>
      <PageHeader
        title="Setup packs"
        lede={view === "todo" ? (open ? `${open} to print, deliver or install. Oldest first.` : "Every pack is delivered.") : `${packs.length} ${VIEWS[view].label.toLowerCase()}`}
      />
      <Tabs
        current={view}
        tabs={(Object.keys(VIEWS) as View[]).map((k) => ({
          key: k,
          label: VIEWS[k].label,
          href: k === "todo" ? "/admin/setup-packs" : `/admin/setup-packs?view=${k}`,
          count: k === "todo" ? open : undefined,
        }))}
      />

      {packs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-control px-5 py-8 text-center text-sm text-muted">No setup packs here.</p>
      ) : (
        <div className="overflow-x-auto">
          <PackStack rows={packs} />
          <table className="tbl hidden min-w-[900px] sm:table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Deliver to</th>
                <th>Contact</th>
                <th>Payment</th>
                <th>Ordered</th>
                <th className="r">Step</th>
              </tr>
            </thead>
            <tbody className="stagger">
              {packs.map((p) => {
                const at = PACK_STEPS.findIndex((s) => s.status === p.status);
                const next = at >= 0 ? PACK_STEPS[at + 1] : undefined;
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/businesses/${p.businessId}`} className="font-medium hover:underline">
                        {p.businessName}
                      </Link>
                      <span className="block font-mono text-xs text-muted">/r/{p.slug}</span>
                    </td>
                    <td className="max-w-[260px]">
                      {p.address}
                      <span className="block text-xs text-muted">
                        {p.city} · {p.stands} stand, {p.cards} card
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      {p.contactName}
                      <a
                        href={`https://wa.me/${p.contactPhone}`}
                        target="_blank"
                        rel="noopener"
                        className="flex items-center gap-1 text-xs text-muted hover:text-ink"
                      >
                        <MessageCircle aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
                        {formatPhone(p.contactPhone)}
                      </a>
                    </td>
                    <td>
                      <span className={`pill ${p.paymentStatus === "confirmed" ? "pill-positive" : p.paymentStatus === "submitted" ? "pill-notice" : "pill-negative"}`}>
                        {p.paymentStatus === "confirmed" ? "Paid" : p.paymentStatus === "submitted" ? "Checking" : "Not received"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-muted">{formatDay(p.createdAt)}</td>
                    <td className="r">
                      {next ? (
                        <form action={movePack} className="flex items-center justify-end gap-3">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value={next.status} />
                          <span className="text-sm text-muted">{PACK_LABEL[p.status]}</span>
                          <SubmitButton pending="…" className="btn btn-secondary btn-sm">
                            Mark {next.label.toLowerCase()}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className={`pill ${p.status === "installed" ? "pill-positive" : ""}`}>{PACK_LABEL[p.status]}</span>
                      )}
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
