"use client";

import Link from "next/link";
import { motion } from "motion/react";

// Underline tabs for a list's states. Each tab is its own URL, so a filtered view can be shared;
// the underline slides to the chosen tab.
export function Tabs({ tabs, current }: { tabs: { key: string; label: string; href: string; count?: number }[]; current: string }) {
  return (
    <nav className="tabs mb-5" aria-label="Filter">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={t.key === current ? "page" : undefined} className="relative">
          {t.label}
          {t.count !== undefined && <span className="count num">{t.count}</span>}
          {t.key === current && (
            <motion.span
              layoutId="tab-underline"
              className="absolute inset-x-0 -bottom-px h-0.5 bg-ink"
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </Link>
      ))}
    </nav>
  );
}
