import "server-only";
import { headers } from "next/headers";
import type { Source } from "@/models/Event";

// SITE_URL pins the domain printed on stands and cards; without it the current host is used.
export async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function reviewLink(slug: string, source: Source) {
  return `${await siteOrigin()}/r/${slug}${source === "direct" ? "" : `?s=${source}`}`;
}
