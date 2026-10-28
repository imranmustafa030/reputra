import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicBusiness } from "@/lib/public";
import { businessLinks } from "@/lib/tags";
import { ReviewShell, ReviewSkeleton } from "./review-shell";

export const metadata: Metadata = { title: "Leave a review", robots: { index: false } };

// The old address, by business name. Every link now uses a code (/t/K7X9Q2) that doesn't show
// the name, so anything that still points here is sent on to the business's own code.
export default function OldReviewPage({ params, searchParams }: PageProps<"/r/[slug]">) {
  return (
    <ReviewShell>
      <Suspense fallback={<ReviewSkeleton />}>
        <SendOn params={params} searchParams={searchParams} />
      </Suspense>
    </ReviewShell>
  );
}

async function SendOn({ params, searchParams }: Pick<PageProps<"/r/[slug]">, "params" | "searchParams">): Promise<React.ReactNode> {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const business = await getPublicBusiness(slug);
  if (!business) notFound();
  const links = await businessLinks(business.id);
  redirect(`/t/${query.s === "wa" ? links.waCode : links.plainCode}${query.preview === "1" ? "?preview=1" : ""}`);
}
