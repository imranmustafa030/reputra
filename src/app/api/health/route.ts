import mongoose from "mongoose";
import { db } from "@/lib/db";

// GET /api/health: is the app up and can it reach MongoDB? Handy right after a deploy.
export async function GET() {
  try {
    await db();
    await mongoose.connection.db!.admin().ping();
    return Response.json({ ok: true, database: "connected" });
  } catch (err) {
    console.error("[health]", err);
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
