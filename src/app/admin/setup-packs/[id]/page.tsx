import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import QRCode from "qrcode";
import { ArrowLeft, Download } from "lucide-react";
import { Types } from "mongoose";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { PACK_LABEL } from "@/lib/labels";
import { productOf } from "@/lib/shop";
import { ensurePackTags, tagUrl } from "@/lib/tags";
import { Business } from "@/models/Business";
import { SetupPack, type PackStatus } from "@/models/SetupPack";
import { ITEM_KINDS, Tag } from "@/models/Tag";

export const metadata: Metadata = { title: "Print files" };

// Everything the team needs to make a delivery: one row per item, with its own code. Stands get a
// QR file (no suffix) and an NFC address (?s=nfc); cards and stickers get an NFC address.
// Only the team sees these; owners order new items from the shop.
export default function PrintFilesPage({ params }: PageProps<"/admin/setup-packs/[id]">) {
  return (
    <Suspense fallback={<div className="h-40 rounded-xl bg-hover" aria-busy="true" />}>
      <PrintFiles params={params} />
    </Suspense>
  );
}

async function PrintFiles({ params }: Pick<PageProps<"/admin/setup-packs/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();
  await db();
  await ensurePackTags(id);
  const pack = await SetupPack.findById(id).lean();
  if (!pack) notFound();
  const [business, tags] = await Promise.all([Business.findById(pack.business).select("name").lean(), Tag.find({ pack: pack._id }).sort({ kind: 1, createdAt: 1 }).lean()]);

  const rows = await Promise.all(
    tags.map(async (t) => {
      const nfc = await tagUrl(t.code, t.kind === "stand");
      const qrUrl = t.kind === "stand" ? await tagUrl(t.code) : null;
      const qr = qrUrl ? await QRCode.toString(qrUrl, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#0b0c0e", light: "#ffffff" } }) : null;
      return { id: String(t._id), code: t.code, kind: t.kind as (typeof ITEM_KINDS)[number], off: t.status === "off", nfc, qr, qrUrl };
    }),
  );

  return (
    <>
      <Link href="/admin/setup-packs" className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Setup packs
      </Link>
      <PageHeader title="Print files" lede={`${business?.name ?? "—"} · ${rows.length} ${rows.length === 1 ? "item" : "items"} · ${PACK_LABEL[pack.status as PackStatus]}`} />

      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <section key={r.id} className={`panel p-5 ${r.off ? "opacity-60" : ""}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-medium">{productOf(r.kind).name}</h2>
              <span className="font-mono text-sm tracking-wider">{r.code}</span>
            </div>
            {r.off && <p className="mt-1 text-sm text-negative">Switched off by the owner</p>}
            {r.qr && (
              <>
                <div className="mx-auto mt-4 aspect-square w-full max-w-[180px] overflow-hidden rounded-lg border border-edge [&>svg]:size-full" role="img" aria-label={`QR code for ${r.qrUrl}`} dangerouslySetInnerHTML={{ __html: r.qr }} />
                <a className="btn btn-secondary btn-sm mt-4 w-full" download={`reputra-${r.code}-qr.svg`} href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(r.qr)}`}>
                  <Download aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  QR for print
                </a>
              </>
            )}
            <p className="mt-4 text-xs font-medium text-muted">Write into the NFC chip</p>
            <div className="mt-1.5 flex items-stretch">
              <code className="flex min-w-0 flex-1 items-center rounded-l-[10px] border border-r-0 border-control bg-frame px-3 font-mono text-[0.75rem]">
                <span className="min-w-0 truncate">{r.nfc}</span>
              </code>
              <CopyButton text={r.nfc} />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
