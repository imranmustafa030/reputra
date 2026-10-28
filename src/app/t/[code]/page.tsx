import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicEntry } from "@/lib/public";
import { sourceFor } from "@/lib/tags";
import type { TagKind } from "@/models/Tag";
import { COPY } from "@/app/r/[slug]/copy";
import { Intro } from "@/app/r/[slug]/intro";
import { ReviewFlow } from "@/app/r/[slug]/review-flow";
import { ReviewShell, ReviewSkeleton } from "@/app/r/[slug]/review-shell";
import { VisitBeacon } from "@/app/r/[slug]/visit-beacon";

// The link preview in WhatsApp names the business, so the customer knows who is asking.
export async function generateMetadata({ params }: PageProps<"/t/[code]">): Promise<Metadata> {
  const { code } = await params;
  const entry = await getPublicEntry(code.toUpperCase());
  const name = entry && !entry.off ? entry.business.name : null;
  const title = name ? `Review ${name}` : "Leave a review";
  const description = name ? `How was your visit at ${name}? Tap a star, it takes 30 seconds.` : "How was your visit? Tap a star, it takes 30 seconds.";
  return { title, description, robots: { index: false }, openGraph: { title, description }, twitter: { title, description } };
}

// The page a customer lands on from a printed item or a link: reputra.pk/t/K7X9Q2.
// The code says which item it is (a stand's NFC chip adds ?s=nfc), never the business name.
// Stars first, then Google or a private note. Both choices are shown for every rating:
// Google's rules forbid steering only happy customers to a review.
export default function ReviewPage({ params, searchParams }: PageProps<"/t/[code]">) {
  return (
    <ReviewShell>
      <Suspense fallback={<ReviewSkeleton />}>
        <Review params={params} searchParams={searchParams} />
      </Suspense>
    </ReviewShell>
  );
}

async function Review({ params, searchParams }: Pick<PageProps<"/t/[code]">, "params" | "searchParams">) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const entry = await getPublicEntry(code.toUpperCase());
  if (!entry) notFound();
  if (entry.off) return <SwitchedOff name={entry.business.name} item={ITEM_NAMES[entry.kind] ?? "link"} />;

  const source = sourceFor(entry.kind, query.s);
  // The owner's "Preview" link from Settings: plays the opening every time and counts nothing.
  const preview = query.preview === "1";
  // The code stands in for the business everywhere the page reports back (visits, stars, notes).
  const business = { ...entry.business, slug: entry.code, base: `/t/${entry.code}` };

  return (
    <>
      <Intro enabled={business.intro} name={business.name} slug={entry.code} force={preview} thanks={{ en: COPY.en.thanks, roman: COPY.roman.thanks, ur: COPY.ur.thanks }} />
      {!preview && <VisitBeacon slug={entry.code} source={source} />}
      <ReviewFlow business={business} source={source} preview={preview} />
    </>
  );
}

// A lost or replaced item the owner switched off. Says so plainly instead of a dead end.
const ITEM_NAMES: Partial<Record<TagKind, string>> = { stand: "stand", card: "card", sticker: "sticker" };

function SwitchedOff({ name, item }: { name: string; item: string }) {
  return (
    <div className="my-auto py-16 text-center">
      <p className="text-sm text-(--rv-fg3)">{name}</p>
      <h1 className="mt-3 text-[1.75rem] leading-9 font-semibold tracking-[-0.02em]">This {item} no longer works</h1>
      <p className="mx-auto mt-3 max-w-[32ch] text-(--rv-fg2)">The business has switched it off. Please ask at the counter for their review link.</p>
    </div>
  );
}
