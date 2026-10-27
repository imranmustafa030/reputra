"use client";

import { useEffect } from "react";

// Counts one visit per browser tab, so a refresh doesn't inflate the numbers.
export function VisitBeacon({ slug, source }: { slug: string; source: string }) {
  useEffect(() => {
    const key = `reputra:visit:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode can block storage; counting anyway is fine.
    }
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, source }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, source]);

  return null;
}
