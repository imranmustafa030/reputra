import type { Metadata } from "next";
import QRCode from "qrcode";
import { CopyButton } from "@/components/copy-button";
import { PageHeader } from "@/components/page-header";
import { requireOwner } from "@/lib/auth";
import { reviewLink } from "@/lib/links";

export const metadata: Metadata = { title: "Stand, card & links" };

// Each way in gets its own link, so the overview can tell the stand, the tap card and WhatsApp apart.
export default async function LinksPage() {
  const { business } = await requireOwner();
  const [qr, nfc, wa, plain] = await Promise.all([
    reviewLink(business.slug, "qr"),
    reviewLink(business.slug, "nfc"),
    reviewLink(business.slug, "wa"),
    reviewLink(business.slug, "direct"),
  ]);
  const qrSvg = await QRCode.toString(qr, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#0b0c0e", light: "#ffffff" } });

  return (
    <>
      <PageHeader title="Stand, card & links" lede="The three ways a customer reaches your review page. All of them open the same page.">
        <a href={plain} target="_blank" rel="noopener" className="btn btn-ghost">
          Open your review page
        </a>
      </PageHeader>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="panel p-5 md:p-6">
          <h2 className="font-medium">Counter stand · QR code</h2>
          <p className="mt-1 text-sm text-stone">Print this on the acrylic stand. Customers point their camera at it.</p>
          <div
            className="mx-auto mt-5 aspect-square w-full max-w-[240px] overflow-hidden rounded-xl border border-line [&>svg]:size-full"
            role="img"
            aria-label={`QR code for ${qr}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <a
              className="btn btn-ghost min-h-9 px-4 text-sm"
              download={`${business.slug}-review-qr.svg`}
              href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
            >
              Download for print (SVG)
            </a>
          </div>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-3">
          <LinkRow title="Tap card · NFC" hint="Write this link onto the NFC card or stand with any NFC writer app." url={nfc} />
          <LinkRow title="WhatsApp" hint="Used automatically by Send on WhatsApp. Paste it yourself in any chat." url={wa} />
          <LinkRow title="Plain link" hint="For Instagram bio, receipts or email. Counted as “Direct link”." url={plain} />
        </div>
      </div>
    </>
  );
}

function LinkRow({ title, hint, url }: { title: string; hint: string; url: string }) {
  return (
    <section className="panel p-5 md:p-6">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-stone">{hint}</p>
      <div className="mt-4 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-paper-2 px-3 py-2 text-sm">{url}</code>
        <CopyButton text={url} />
      </div>
    </section>
  );
}
