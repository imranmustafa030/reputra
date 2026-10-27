import type { Metadata } from "next";
import QRCode from "qrcode";
import { Download, ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { PageHeader, SectionTitle } from "@/components/page-header";
import { packSteps, StepTrack } from "@/components/step-track";
import { requirePaidOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay, PACK_STEPS } from "@/lib/labels";
import { reviewLink } from "@/lib/links";
import { SetupPack } from "@/models/SetupPack";

export const metadata: Metadata = { title: "Stand & card" };

// Each way in gets its own link, so the overview can tell the stand, the tap card and WhatsApp apart.
export default async function LinksPage() {
  const { business } = await requirePaidOwner();
  await db();
  const [qr, nfc, wa, plain, pack] = await Promise.all([
    reviewLink(business.slug, "qr"),
    reviewLink(business.slug, "nfc"),
    reviewLink(business.slug, "wa"),
    reviewLink(business.slug, "direct"),
    SetupPack.findOne({ business: business.id, status: { $ne: "canceled" } }).sort({ createdAt: -1 }).lean(),
  ]);
  const qrSvg = await QRCode.toString(qr, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#0b0c0e", light: "#ffffff" } });
  const step = pack ? PACK_STEPS.find((s) => s.status === pack.status) : null;

  return (
    <>
      <PageHeader
        title="Stand & card"
        lede={
          pack
            ? pack.status === "installed"
              ? `Your stand and card were installed on ${formatDay(pack.updatedAt)}. Every scan and tap opens the same review page.`
              : `${step?.owner ?? "Being prepared"}. Every scan and tap will open the same review page.`
            : "Every scan and tap opens the same review page."
        }
      >
        <a href={plain} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
          Open review page
          <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
        </a>
      </PageHeader>

      {pack && pack.status !== "installed" && <StepTrack steps={packSteps(pack.status, PACK_STEPS)} label="Your stand and card" className="mb-4" />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="panel p-5 sm:p-6" aria-labelledby="qr-title">
          <h2 id="qr-title" className="font-medium">
            Counter stand · QR code
          </h2>
          <p className="mt-1 text-sm text-muted">Printed on your acrylic stand. Customers point their camera at it.</p>
          <div
            className="mx-auto mt-6 aspect-square w-full max-w-[220px] overflow-hidden rounded-xl border border-edge [&>svg]:size-full"
            role="img"
            aria-label={`QR code for ${qr}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="mt-6 flex justify-center">
            <a className="btn btn-secondary btn-sm" download={`${business.slug}-review-qr.svg`} href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}>
              <Download aria-hidden="true" className="size-4" strokeWidth={1.75} />
              Download for print
            </a>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
          <LinkRow
            title="Tap card · NFC"
            hint="Already written on your card and stand. To write a new tag, use the free NFC Tools app: Write → Add record → URL."
            url={nfc}
          />
          <LinkRow title="WhatsApp" hint="Ask on WhatsApp adds this one for you. Paste it yourself in any chat." url={wa} />
          <LinkRow title="Plain link" hint="For your Instagram bio, receipts or email. Counted as “Plain link”." url={plain} />
        </div>
      </div>

      <div className="mt-8">
        <SectionTitle>Where they go</SectionTitle>
        <p className="max-w-[70ch] text-sm text-muted">
          Every link opens your review page, which shows every customer the “Review us on Google” button and a private note option. The
          address never changes, so printed stands keep working even if you rename the business.
        </p>
      </div>
    </>
  );
}

function LinkRow({ title, hint, url }: { title: string; hint: string; url: string }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <div className="mt-4 flex items-stretch">
        <code className="flex min-w-0 flex-1 items-center rounded-l-[10px] border border-r-0 border-control bg-frame px-3 font-mono text-[0.8125rem]">
          <span className="min-w-0 truncate">{url}</span>
        </code>
        <CopyButton text={url} />
      </div>
    </section>
  );
}
