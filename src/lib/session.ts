import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE = "reputra_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// v is the user's sessionVersion when the cookie was issued; a password reset bumps it,
// which signs out every other device.
type SessionData = { userId?: string; v?: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return value;
}

export async function getSession(): Promise<SessionData> {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sealed) return {};
  // Unsealing checks the cookie's age against the clock, and everything signed-in depends on
  // today's date, so these screens always render per request, never from a prefetch snapshot.
  await connection();
  try {
    return await unsealData<SessionData>(sealed, { password: secret(), ttl: MAX_AGE });
  } catch {
    return {};
  }
}

export async function startSession(userId: string, version: number) {
  const sealed = await sealData({ userId, v: version } satisfies SessionData, { password: secret(), ttl: MAX_AGE });
  (await cookies()).set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
