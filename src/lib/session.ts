import "server-only";
import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE = "reputra_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type SessionData = { userId?: string };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return value;
}

export async function getSession(): Promise<SessionData> {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sealed) return {};
  try {
    return await unsealData<SessionData>(sealed, { password: secret(), ttl: MAX_AGE });
  } catch {
    return {};
  }
}

export async function startSession(userId: string) {
  const sealed = await sealData({ userId } satisfies SessionData, { password: secret(), ttl: MAX_AGE });
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
