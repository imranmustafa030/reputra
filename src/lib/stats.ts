import "server-only";
import { Types } from "mongoose";
import { Event, SOURCES, type Source } from "@/models/Event";
import { Feedback } from "@/models/Feedback";

export const SOURCE_LABELS: Record<Source, string> = {
  qr: "Counter stand (QR)",
  nfc: "Tap card (NFC)",
  wa: "WhatsApp message",
  direct: "Direct link",
};

// Counts for one business over the last `days` days. Callers pass the id from requireOwner(), never from the client.
export async function getStats(businessId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows: { _id: { type: string; source: Source }; n: number }[] = await Event.aggregate([
    { $match: { business: new Types.ObjectId(businessId), at: { $gte: since } } },
    { $group: { _id: { type: "$type", source: "$source" }, n: { $sum: 1 } } },
  ]);

  const total = (type: string) => rows.filter((r) => r._id.type === type).reduce((sum, r) => sum + r.n, 0);
  const visitsBySource = SOURCES.map((source) => ({
    source,
    label: SOURCE_LABELS[source],
    visits: rows.find((r) => r._id.type === "visit" && r._id.source === source)?.n ?? 0,
    toGoogle: rows.find((r) => r._id.type === "google_click" && r._id.source === source)?.n ?? 0,
  }));

  return {
    visits: total("visit"),
    googleClicks: total("google_click"),
    whatsappSent: total("whatsapp_sent"),
    feedback: total("feedback"),
    visitsBySource,
  };
}

export async function getFeedback(businessId: string, limit = 100) {
  const notes = await Feedback.find({ business: businessId }).sort({ createdAt: -1 }).limit(limit).lean();
  return notes.map((n) => ({
    id: String(n._id),
    message: n.message,
    name: n.name,
    phone: n.phone,
    source: n.source as Source,
    createdAt: n.createdAt,
  }));
}
