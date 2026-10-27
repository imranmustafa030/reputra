"use client";

import { useEffect } from "react";

// Marks the notes as seen once the owner has actually opened this page in a browser
// (not on a prefetch), so the "New" marks show this time and clear next time.
export function SeenMarker({ action }: { action: () => Promise<void> }) {
  useEffect(() => {
    const id = setTimeout(() => action().catch(() => {}), 1500);
    return () => clearTimeout(id);
  }, [action]);
  return null;
}
