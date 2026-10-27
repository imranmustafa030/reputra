import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/public";
import { toSource } from "@/models/Event";
import { PrivateFeedback } from "./private-feedback";
import { VisitBeacon } from "./visit-beacon";

export const metadata: Metadata = { title: "Leave a review", robots: { index: false } };

// The page a customer lands on from the counter stand (?s=qr), the tap card (?s=nfc) or WhatsApp (?s=wa).
// Both choices are always shown side by side: Google's rules forbid steering only happy customers to a review.
export default function ReviewPage({ params, searchParams }: PageProps<"/r/[slug]">) {
  return (
    <main className="flex min-h-dvh flex-col bg-ink px-5 pt-14 pb-8 text-paper">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <Suspense fallback={<Skeleton />}>
          <Review params={params} searchParams={searchParams} />
        </Suspense>
        <a href="/" className="mt-auto inline-flex items-center gap-1.5 self-center pt-12 text-xs text-paper/40 transition-colors hover:text-paper/70">
          Powered by
          <span className="font-semibold tracking-[-0.04em] text-paper/60">reputra</span>
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

  return (
    <>
      <VisitBeacon slug={business.slug} source={source} />
      <p className="text-paper/60">Thank you for visiting</p>
      <h1 className="mt-2 text-[2.4rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">{business.name}</h1>

      {business.hasGoogleLink ? (
        <>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-paper/75">
            If we looked after you well, a short Google review helps other people find us. It takes about 30 seconds.
          </p>
          <Stars />
          <a href={`/r/${business.slug}/go?s=${source}`} className="btn btn-gold mt-8 min-h-14 w-full text-[1.05rem]">
            Review us on Google
          </a>
        </>
      ) : (
        <p className="mt-5 leading-relaxed text-paper/75">
          Our Google review link is being set up. Meanwhile, you can send us a note below.
        </p>
      )}

      <PrivateFeedback slug={business.slug} source={source} />
    </>
  );
}

function Stars() {
  return (
    <div className="mt-8 flex gap-1.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className="size-7 fill-amber">
          <path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5L2.6 9.4l6.5-.8z" />
        </svg>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className="animate-pulse">
      <div className="h-5 w-40 rounded bg-paper/10" />
      <div className="mt-4 h-10 w-64 rounded-lg bg-paper/10" />
      <div className="mt-6 h-16 rounded-lg bg-paper/5" />
      <div className="mt-8 h-14 rounded-full bg-paper/10" />
    </div>
  );
}
