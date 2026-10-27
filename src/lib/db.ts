import "server-only";
import mongoose from "mongoose";
import { attachDatabasePool } from "@vercel/functions";

// One connection per server instance. The cache lives on globalThis so hot
// reloads in dev and warm serverless invocations reuse it instead of opening a
// new pool on every request (which would exhaust the free Atlas tier quickly).
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const g = globalThis as typeof globalThis & { _mongoose?: Cache };
const cache = (g._mongoose ??= { conn: null, promise: null });

export async function db() {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");

  cache.promise ??= mongoose
    .connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      maxIdleTimeMS: 30_000,
      serverSelectionTimeoutMS: 8_000,
    })
    .then((m) => {
      // Lets Vercel close idle connections before a function instance is suspended.
      attachDatabasePool(m.connection.getClient());
      return m;
    });

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
