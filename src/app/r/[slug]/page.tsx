import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Noto_Nastaliq_Urdu } from "next/font/google";
import { getPublicBusiness } from "@/lib/public";
import { toSource } from "@/models/Event";
import { COPY } from "./copy";
import { FilmStage, Intro } from "./intro";
import { ReviewFlow } from "./review-flow";
import { VisitBeacon } from "./visit-beacon";

export const metadata: Metadata = { title: "Leave a review", robots: { index: false } };

// Urdu is set in Nastaliq. It only downloads when a customer switches to Urdu.
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["400", "600"], variable: "--font-nastaliq", preload: false, display: "swap" });

// The page a customer lands on from the counter stand (?s=qr), the tap card (?s=nfc) or WhatsApp (?s=wa).
// Stars first, then Google or a private note. Both choices are shown for every rating:
// Google's rules forbid steering only happy customers to a review.
export default function ReviewPage({ params, searchParams }: PageProps<"/r/[slug]">) {
  return (
    <main data-theme="light" className={`rv-page relative flex min-h-dvh flex-col overflow-hidden bg-(--rv-bg) px-5 pt-6 pb-8 text-(--rv-fg) ${nastaliq.variable}`}>
      {/* in the static shell, so the opening film starts downloading with the first bytes */}
      <FilmStage />
      <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col lg:max-w-[1320px] lg:px-[2vw]">
        <Suspense fallback={<Skeleton />}>
          <Review params={params} searchParams={searchParams} />
        </Suspense>
        <a href="/" className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-center pt-12 text-xs text-(--rv-fg3) transition-colors hover:text-(--rv-fg)">
          Powered by
          <span className="font-semibold tracking-[-0.04em] text-(--rv-fg2)">reputra</span>
        </a>
      </div>
    </main>
  );
}

async function Review({ params, searchParams }: Pick<PageProps<"/r/[slug]">, "params" | "searchParams">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  const source = toSource(query.s);
  // The owner's "Preview" link from Settings: plays the opening every time and counts nothing.
  const preview = query.preview === "1";

  return (
    <>
      <Intro
        enabled={business.intro}
        name={business.name}
        slug={business.slug}
        force={preview}
        thanks={{ en: COPY.en.thanks, roman: COPY.roman.thanks, ur: COPY.ur.thanks }}
      />
      {!preview && <VisitBeacon slug={business.slug} source={source} />}
      <ReviewFlow business={business} source={source} preview={preview} />
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true">
      <div className="ml-auto h-11 w-64 rounded-full bg-(--rv-field)" />
      <div className="mt-10 h-11 w-60 rounded-lg bg-(--rv-field)" />
      <div className="mt-4 h-6 w-72 rounded bg-(--rv-field)" />
      <div className="mt-10 flex justify-between">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="size-14 rounded-full bg-(--rv-field)" />
        ))}
      </div>
    </div>
  );
}
