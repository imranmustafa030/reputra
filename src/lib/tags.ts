import "server-only";
import { randomInt } from "node:crypto";
import { Types } from "mongoose";
import { db } from "./db";
import { siteOrigin } from "./links";
import { Event, type Source } from "@/models/Event";
import { ITEM_KINDS, Tag, type TagKind } from "@/models/Tag";
import { SetupPack } from "@/models/SetupPack";

// Six characters with no look-alikes (no 0/O, 1/I/L), upper case, so a code can never be
// mistaken for a business's lower-case slug.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
export const isCode = (value: string) => CODE_PATTERN.test(value);

function newCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

async function createTag(business: Types.ObjectId | string, kind: TagKind, pack: Types.ObjectId | null = null) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await Tag.create({ code: newCode(), business, kind, pack });
    } catch (err) {
      if ((err as { code?: number }).code === 11000 && attempt < 6) continue; // a clash, try another code
      throw err;
    }
  }
}

// How a customer arrived, from the code they came through. A stand carries the same code on its
// QR (no suffix) and in its NFC chip (?s=nfc), so the two still count apart.
export function sourceFor(kind: TagKind, s: unknown): Source {
  if (kind === "whatsapp") return "wa";
  if (kind === "link") return "direct";
  if (kind === "stand") return s === "nfc" ? "nfc" : "qr";
  return "nfc";
}

export async function tagUrl(code: string, nfc = false) {
  return `${await siteOrigin()}/t/${code}${nfc ? "?s=nfc" : ""}`;
}

// The business's WhatsApp and plain links, made the first time they're asked for.
export async function businessLinks(businessId: string) {
  await db();
  const tags = await Tag.find({ business: businessId, kind: { $in: ["whatsapp", "link"] }, status: "active" }).lean();
  const code = async (kind: "whatsapp" | "link") => tags.find((t) => t.kind === kind)?.code ?? (await createTag(businessId, kind)).code;
  const [wa, plain] = await Promise.all([code("whatsapp"), code("link")]);
  return { wa: await tagUrl(wa), plain: await tagUrl(plain), waCode: wa, plainCode: plain };
}

// One code per printed item in a delivery. Safe to call again: it only adds what's missing.
export async function ensurePackTags(packId: Types.ObjectId | string) {
  await db();
  const pack = await SetupPack.findById(packId).lean();
  if (!pack || pack.status === "canceled") return;
  const want: Record<(typeof ITEM_KINDS)[number], number> = { stand: pack.stands, card: pack.cards, sticker: pack.stickers ?? 0 };
  const have = await Tag.find({ pack: pack._id }).select("kind").lean();
  for (const kind of ITEM_KINDS) {
    const missing = want[kind] - have.filter((t) => t.kind === kind).length;
    for (let i = 0; i < missing; i++) await createTag(pack.business, kind, pack._id);
  }
}

export type ItemRow = { id: string; code: string; kind: (typeof ITEM_KINDS)[number]; status: "active" | "off"; scans: number; packStatus: string; since: Date };

// The owner's printed items with their scans over the last 30 days, newest delivery first.
// Deliveries, codes and counts load together; a delivery missing its codes (one made before
// codes existed) gets them once, and only then is anything re-read.
export async function listItems(businessId: string): Promise<ItemRow[]> {
  await db();
  const business = new Types.ObjectId(businessId);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const load = () =>
    Promise.all([
      SetupPack.find({ business, status: { $ne: "canceled" } }).select("_id status stands cards stickers").lean(),
      Tag.find({ business, kind: { $in: ITEM_KINDS } }).sort({ createdAt: -1 }).lean(),
      Event.aggregate<{ _id: Types.ObjectId; n: number }>([
        { $match: { business, type: "visit", at: { $gte: since }, tag: { $type: "objectId" } } },
        { $group: { _id: "$tag", n: { $sum: 1 } } },
      ]),
    ]);
  let [packs, tags, counts] = await load();
  const short = packs.filter((p) => tags.filter((t) => String(t.pack) === String(p._id)).length < p.stands + p.cards + (p.stickers ?? 0));
  if (short.length) {
    await Promise.all(short.map((p) => ensurePackTags(p._id)));
    [packs, tags, counts] = await load();
  }
  const packStatus = new Map(packs.map((p) => [String(p._id), p.status as string]));
  const scans = new Map(counts.map((c) => [String(c._id), c.n]));
  return tags.map((t) => ({
    id: String(t._id),
    code: t.code,
    kind: t.kind as ItemRow["kind"],
    status: t.status as "active" | "off",
    scans: scans.get(String(t._id)) ?? 0,
    packStatus: t.pack ? (packStatus.get(String(t.pack)) ?? "installed") : "installed",
    since: t.createdAt,
  }));
}
