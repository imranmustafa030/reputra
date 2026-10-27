import "server-only";
import { db } from "./db";
import { RateLimit } from "@/models/RateLimit";

// Counts one attempt against `key` and says whether it is still allowed.
// The window starts at the first attempt and ends `windowSeconds` later.
export async function allow(key: string, limit: number, windowSeconds: number) {
  await db();
  const now = new Date();
  const live = await RateLimit.findOneAndUpdate({ key, expiresAt: { $gt: now } }, { $inc: { count: 1 } }, { returnDocument: "after" });
  if (live) return live.count <= limit;

  // No live window (none yet, or an expired one MongoDB hasn't swept): start a fresh one.
  const fresh = { count: 1, expiresAt: new Date(now.getTime() + windowSeconds * 1000) };
  try {
    await RateLimit.updateOne({ key }, { $set: fresh }, { upsert: true });
  } catch {
    await RateLimit.updateOne({ key }, { $set: fresh }); // a parallel request created it first
  }
  return true;
}

export async function clearLimit(key: string) {
  await db();
  await RateLimit.deleteOne({ key });
}
