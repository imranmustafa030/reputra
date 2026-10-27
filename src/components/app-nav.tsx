"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Inbox,
  LayoutGrid,
  Menu,
  MessageCircle,
  Package,
  QrCode,
  Settings,
  Store,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Brand } from "./brand";

type Item = { href: string; label: string; icon: LucideIcon; count?: "notes" | "payments" | "packs" };

const NAV: Record<"owner" | "admin", Item[]> = {
  owner: [
    { href: "/dashboard", label: "Overview", icon: LayoutGrid },
    { href: "/dashboard/send", label: "Ask on WhatsApp", icon: MessageCircle },
    { href: "/dashboard/links", label: "Stand & card", icon: QrCode },
    { href: "/dashboard/feedback", label: "Private notes", icon: Inbox, count: "notes" },
    { href: "/dashboard/billing", label: "Plan & billing", icon: CreditCard },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutGrid },
    { href: "/admin/payments", label: "Payments", icon: Wallet, count: "payments" },
    { href: "/admin/setup-packs", label: "Setup packs", icon: Package, count: "packs" },
    { href: "/admin/businesses", label: "Businesses", icon: Store },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export type NavCounts = Partial<Record<NonNullable<Item["count"]>, number>>;

function isActive(pathname: string, href: string) {
  return href === "/dashboard" || href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

type ListProps = { side: "owner" | "admin"; counts?: NavCounts; onNavigate?: () => void; group?: string };

export function NavList(props: ListProps) {
  return <NavItems {...props} pathname={usePathname()} />;
}

// The same list with no item marked: the static placeholder while the page streams in.
// The selected row is a piece of the white sheet, lifted 1px; it slides to the new row instead of
// jumping, so the eye follows the move.
export function NavItems({ side, counts = {}, onNavigate, pathname, group = "rail" }: ListProps & { pathname: string }) {
  return (
    <ul className="grid gap-0.5">
      {NAV[side].map(({ href, label, icon: Icon, count }) => {
        const active = isActive(pathname, href);
        const n = count ? (counts[count] ?? 0) : 0;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-[0.9rem] transition-colors lg:min-h-9 ${
                active ? "font-medium text-ink" : "text-ink-3 hover:bg-hover hover:text-ink"
              }`}
            >
              {active && (
                <motion.span
                  layoutId={`nav-pill-${side}-${group}`}
                  className="nav-selected absolute inset-0 rounded-lg"
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon aria-hidden="true" className={`relative size-4 shrink-0 ${active ? "" : "text-muted"}`} strokeWidth={active ? 2 : 1.75} />
              <span className="relative flex-1 truncate">{label}</span>
              {n > 0 && (
                <span className="count count-alert pop relative" aria-label={`${n} need attention`}>
                  {n}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Below 1024px the sidebar folds into a top bar with a menu button that opens the whole nav.
export function MobileNav({ side, counts, title, footer }: { side: "owner" | "admin"; counts?: NavCounts; title: React.ReactNode; footer: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const alerts = Object.values(counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 border-b border-edge bg-frame px-4">
        <Brand href={side === "admin" ? "/admin" : "/dashboard"} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative -mr-2 grid size-11 place-items-center rounded-full text-ink hover:bg-hover"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="size-5" strokeWidth={1.75} />
          {alerts > 0 && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-ink" />}
        </button>
      </div>
      <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50 flex flex-col bg-frame"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.16 } }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex h-14 items-center justify-between px-4">
            <Brand href={side === "admin" ? "/admin" : "/dashboard"} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-hover"
              aria-label="Close menu"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </div>
          <div className="px-4 pt-2 pb-4">{title}</div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto px-2">
            <NavList side={side} counts={counts} onNavigate={() => setOpen(false)} group="sheet" />
          </nav>
          <div className="border-t border-edge px-4 py-4">{footer}</div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
