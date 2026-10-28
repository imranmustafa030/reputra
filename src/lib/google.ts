import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

// Two ways to connect a business to its Google listing, both ending in the same review link:
// - search: the owner picks their business from Google's own list (Places API, server key);
// - account: the owner signs in with Google and picks a business they manage (Business Profile API).
// Each one switches on when its keys are set, so the dashboard only offers what works.

export type GooglePlace = { id: string; name: string; address: string; via: "search" | "account" };

export const searchEnabled = () => Boolean(process.env.GOOGLE_MAPS_API_KEY);
export const accountEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Google's own "write a review" link for a place; it opens the review box straight away.
export const writeReviewUrl = (placeId: string) => `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;

/* ------------------------------------------------------------------ search (Places API) */

// Google gives about 10,000 free calls a month for each of these. Reputra stops itself at 300 a day
// across every business, so it never goes past the free amount and never runs up a bill.
export const PLACES_DAILY_CAP = 300;

export type Suggestion = { id: string; name: string; address: string };

// One search box session (typing, then one pick) shares a token, so Google bills it as one lookup.
export async function suggestPlaces(input: string, sessionToken: string): Promise<Suggestion[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY! },
    body: JSON.stringify({ input, sessionToken, languageCode: "en", regionCode: "pk" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places autocomplete ${res.status}: ${await res.text()}`);
  const data: { suggestions?: { placePrediction?: PlacePrediction }[] } = await res.json();
  return (data.suggestions ?? []).flatMap(({ placePrediction: p }) =>
    p ? [{ id: p.placeId, name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "", address: p.structuredFormat?.secondaryText?.text ?? "" }] : [],
  );
}
type PlacePrediction = { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } };

// Looked up again on the server, so a connected place is always one Google knows. Only the
// Essentials fields (id, address) are asked for, which keeps the lookup in Google's cheapest tier;
// the name comes from the suggestion the owner picked.
export async function placeDetails(placeId: string, sessionToken?: string): Promise<{ id: string; address: string } | null> {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);
  const res = await fetch(url, {
    headers: { "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!, "X-Goog-FieldMask": "id,formattedAddress" },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Place details ${res.status}: ${await res.text()}`);
  const p: { id: string; formattedAddress?: string } = await res.json();
  return { id: p.id, address: p.formattedAddress ?? "" };
}

/* ------------------------------------------------------- account (OAuth + Business Profile) */

const GOOGLE_COOKIE = "reputra_google";
const GOOGLE_COOKIE_AGE = 60 * 10; // the sign-in and the pick happen within minutes
const SCOPE = "https://www.googleapis.com/auth/business.manage";

// The OAuth state while the owner is at Google, then the short-lived access token for the picker.
// Nothing from Google is kept once a business is picked.
type GoogleCookie = { state?: string; token?: string };

function secret() {
  return process.env.SESSION_SECRET!;
}

async function writeGoogleCookie(data: GoogleCookie) {
  const sealed = await sealData(data, { password: secret(), ttl: GOOGLE_COOKIE_AGE });
  (await cookies()).set(GOOGLE_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GOOGLE_COOKIE_AGE,
  });
}

export async function readGoogleCookie(): Promise<GoogleCookie> {
  const sealed = (await cookies()).get(GOOGLE_COOKIE)?.value;
  if (!sealed) return {};
  try {
    return await unsealData<GoogleCookie>(sealed, { password: secret(), ttl: GOOGLE_COOKIE_AGE });
  } catch {
    return {};
  }
}

export async function clearGoogleCookie() {
  (await cookies()).delete(GOOGLE_COOKIE);
}

// The callback lives on whatever domain the dashboard is open on; each one is listed in Google Cloud.
const redirectUri = (origin: string) => `${origin}/api/google/callback`;

export async function signInUrl(origin: string) {
  const state = crypto.randomUUID();
  await writeGoogleCookie({ state });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "online",
    prompt: "select_account",
  }).toString();
  return url;
}

// Swaps the code Google sent back for an access token, after checking it answers our own request.
export async function finishSignIn(origin: string, code: string, state: string) {
  const saved = await readGoogleCookie();
  if (!saved.state || saved.state !== state) return false;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) return false;
  const { access_token, scope }: { access_token?: string; scope?: string } = await res.json();
  if (!access_token || !scope?.includes(SCOPE)) return false; // the owner unticked Business Profile access
  await writeGoogleCookie({ token: access_token });
  return true;
}

export type OwnedLocation = { name: string; title: string; address: string; placeId: string; reviewUrl: string };

// "not-approved": Google hasn't switched the Business Profile API on for our Cloud project yet
// (every new project starts at zero requests until Google approves the access form).
export class GoogleApiError extends Error {
  constructor(public kind: "expired" | "not-approved" | "failed") {
    super(kind);
  }
}

async function businessApi<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.ok) return res.json();
  if (res.status === 401) throw new GoogleApiError("expired");
  if (res.status === 403 || res.status === 429) throw new GoogleApiError("not-approved");
  throw new GoogleApiError("failed");
}

const READ_MASK = "name,title,storefrontAddress,metadata";
type RawLocation = {
  name: string;
  title?: string;
  storefrontAddress?: { addressLines?: string[]; locality?: string };
  metadata?: { placeId?: string; newReviewUri?: string };
};

function toOwned(l: RawLocation): OwnedLocation | null {
  // A business that isn't on Maps yet (unverified, or still in review) has no place to review.
  if (!l.metadata?.placeId) return null;
  const address = [...(l.storefrontAddress?.addressLines ?? []), l.storefrontAddress?.locality].filter(Boolean).join(", ");
  return {
    name: l.name,
    title: l.title ?? "",
    address,
    placeId: l.metadata.placeId,
    reviewUrl: l.metadata.newReviewUri || writeReviewUrl(l.metadata.placeId),
  };
}

// Every business the signed-in Google account manages, across its personal and shared accounts.
export async function ownedLocations(token: string) {
  const { accounts = [] } = await businessApi<{ accounts?: { name: string }[] }>(token, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
  const all: OwnedLocation[] = [];
  let pending = 0;
  for (const account of accounts) {
    let pageToken = "";
    do {
      const url = new URL(`https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`);
      url.search = new URLSearchParams({ readMask: READ_MASK, pageSize: "100", ...(pageToken ? { pageToken } : {}) }).toString();
      const page = await businessApi<{ locations?: RawLocation[]; nextPageToken?: string }>(token, url.toString());
      for (const l of page.locations ?? []) {
        const owned = toOwned(l);
        if (owned) all.push(owned);
        else pending++;
      }
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
  }
  return { locations: all, pending };
}

// Read again by its name with the owner's token, so they can only connect a business they manage.
export async function ownedLocation(token: string, name: string) {
  if (!/^locations\/\d+$/.test(name)) return null;
  const l = await businessApi<RawLocation>(token, `https://mybusinessbusinessinformation.googleapis.com/v1/${name}?readMask=${READ_MASK}`);
  return toOwned(l);
}
