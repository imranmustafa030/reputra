import "server-only";
import { Types } from "mongoose";
import { Event, SOURCES, type Source } from "@/models/Event";
import { Feedback } from "@/models/Feedback";

export const SOURCE_LABELS: Record<Source, string> = {
  qr: "Counter stand",
  nfc: "Tap card",
  wa: "WhatsApp",
  direct: "Plain link",
};

export const TIMEZONE = "Asia/Karachi";
const DAY = 86_400_000;

// Counts for one business over the last `days` days. Callers pass the id from requireOwner(), never from the client.
export async function getStats(businessId: string, days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const rows: { _id: { type: string; source: Source }; n: number }[] = await Event.aggregate([
    { $match: { business: new Types.ObjectId(businessId), at: { $gte: since } } },
    { $group: { _id: { type: "$type", source: "$source" }, n: { $sum: 1 } } },
  ]);

  const total = (type: string) => rows.filter((r) => r._id.type === type).reduce((sum, r) => sum + r.n, 0);
  const bySource = SOURCES.map((source) => ({
    source,
    label: SOURCE_LABELS[source],
    visits: rows.find((r) => r._id.type === "visit" && r._id.source === source)?.n ?? 0,
    toGoogle: rows.find((r) => r._id.type === "google_click" && r._id.source === source)?.n ?? 0,
  }));

  const [r] = await Event.aggregate<{ avg: number; n: number }>([
    { $match: { business: new Types.ObjectId(businessId), type: "rating", at: { $gte: since } } },
    { $group: { _id: null, avg: { $avg: "$value" }, n: { $sum: 1 } } },
  ]);

  return {
    rating: r ? { average: Math.round(r.avg * 10) / 10, count: r.n } : null,
    visits: total("visit"),
    googleClicks: total("google_click"),
    whatsappSent: total("whatsapp_sent"),
    feedback: total("feedback"),
    bySource,
  };
}

// One row per calendar day in Pakistan time, oldest first, zeros included.
export async function getDaily(businessId: string, days = 30) {
  const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d); // YYYY-MM-DD
  const keys = Array.from({ length: days }, (_, i) => dayKey(new Date(Date.now() - (days - 1 - i) * DAY)));
  const rows: { _id: { day: string; type: string }; n: number }[] = await Event.aggregate([
    {
      $match: {
        business: new Types.ObjectId(businessId),
        type: { $in: ["visit", "google_click"] },
        at: { $gte: new Date(Date.now() - (days + 1) * DAY) },
      },
    },
    { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$at", timezone: TIMEZONE } }, type: "$type" }, n: { $sum: 1 } } },
  ]);
  return keys.map((day) => ({
    day,
    visits: rows.find((r) => r._id.day === day && r._id.type === "visit")?.n ?? 0,
    google: rows.find((r) => r._id.day === day && r._id.type === "google_click")?.n ?? 0,
  }));
}

// Has any customer ever reached the page from the stand or the card? Marks the last setup step done.
export async function firstCounterVisit(businessId: string) {
  const first = await Event.findOne({ business: businessId, type: "visit", source: { $in: ["qr", "nfc"] } })
    .sort({ at: 1 })
    .select("at")
    .lean();
  return first?.at ?? null;
}

export async function getFeedback(businessId: string, limit = 100) {
  const notes = await Feedback.find({ business: businessId }).sort({ createdAt: -1 }).limit(limit).lean();
  return notes.map((n) => ({
    id: String(n._id),
    message: n.message,
    name: n.name,
    phone: n.phone,
    source: n.source as Source,
    read: n.read,
    createdAt: n.createdAt,
  }));
}

export async function countUnreadNotes(businessId: string) {
  return Feedback.countDocuments({ business: businessId, read: false });
}
