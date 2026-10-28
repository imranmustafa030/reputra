import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { connectOwnedLocation } from "@/app/actions/google";
import { SubmitButton } from "@/components/form";
import { PageHeader } from "@/components/page-header";
import { requirePaidOwner } from "@/lib/auth";
import { GoogleApiError, ownedLocations, readGoogleCookie, type OwnedLocation } from "@/lib/google";

export const metadata: Metadata = { title: "Pick your business" };

const PROBLEMS: Record<string, string> = {
  denied: "Google didn’t give Reputra access to your Business Profile. Try again and keep the “manage your Business Profile” box ticked.",
  expired: "Your Google sign-in timed out. Sign in again.",
  "not-approved": "Google hasn’t switched on Business Profile access for Reputra yet. Find your business by name in Settings, or paste your link.",
  failed: "Google didn’t answer. Try again in a minute.",
};

// After "Sign in with Google": the businesses that Google account manages, one tap to connect.
// Its own Suspense boundary, so the frame shows at once while Google answers.
export default function Page({ searchParams }: PageProps<"/dashboard/settings/google">) {
  return (
    <Suspense fallback={<Loading />}>
      <PickGoogleBusiness searchParams={searchParams} />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="max-w-[720px]" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-md bg-hover" />
      <div className="mt-2 h-5 w-96 max-w-full rounded bg-hover" />
      <div className="panel mt-6 h-[140px]" />
    </div>
  );
}

async function PickGoogleBusiness({ searchParams }: Pick<PageProps<"/dashboard/settings/google">, "searchParams">) {
  const { business } = await requirePaidOwner();
  const { error } = await searchParams;
  const { token } = await readGoogleCookie();
  if (!token && !error) redirect("/dashboard/settings#google");

  let problem = typeof error === "string" ? (PROBLEMS[error] ?? PROBLEMS.failed) : "";
  let locations: OwnedLocation[] = [];
  let pending = 0;
  if (!problem && token) {
    try {
      ({ locations, pending } = await ownedLocations(token));
    } catch (e) {
      problem = PROBLEMS[e instanceof GoogleApiError ? e.kind : "failed"];
    }
  }

  return (
    <div className="max-w-[720px]">
      <PageHeader
        title="Pick your business"
        lede={problem ? "Connecting to Google didn’t finish." : `Businesses this Google account manages. Customers of ${business.name} will review the one you pick.`}
      />

      {problem ? (
        <div className="notice notice-negative">{problem}</div>
      ) : locations.length === 0 ? (
        <div className="notice">
          {pending
            ? "Your business isn’t on Google Maps yet. Finish Google’s verification, then try again."
            : "This Google account doesn’t manage any business. Sign in with the account you use for your Business Profile."}
        </div>
      ) : (
        <ul className="panel divide-y divide-rule">
          {locations.map((l) => (
            <li key={l.name} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
              <MapPin aria-hidden="true" className="size-5 shrink-0 text-muted" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{l.title}</p>
                {l.address && <p className="mt-0.5 truncate text-sm text-muted">{l.address}</p>}
              </div>
              <form action={connectOwnedLocation}>
                <input type="hidden" name="location" value={l.name} />
                <SubmitButton pending="Connecting…" className="btn btn-sm">
                  Connect
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      {pending > 0 && locations.length > 0 && (
        <p className="hint mt-3">
          {pending === 1 ? "1 more business isn’t" : `${pending} more businesses aren’t`} on Google Maps yet, so {pending === 1 ? "it’s" : "they’re"} not
          listed.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {problem && problem !== PROBLEMS["not-approved"] && (
          <a href="/api/google/connect" className="btn btn-sm">
            Sign in again
          </a>
        )}
        <Link href="/dashboard/settings#google" className="btn btn-secondary btn-sm">
          Back to Settings
        </Link>
      </div>
    </div>
  );
}
