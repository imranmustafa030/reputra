"use client";

import { useEffect, useRef, useState } from "react";
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
  ShoppingBag,
  Settings,
  Store,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Brand } from "./brand";

type Item = { href: string; label: string; icon: LucideIcon; count?: "notes" | "payments" | "packs" };

const NAV: Record<"owner" | "admin", Item[]> = {
  owner: [
    { href: "/dashboard", label: "Overview", icon: LayoutGrid },
    { href: "/dashboard/send", label: "Ask on WhatsApp", icon: MessageCircle },
    { href: "/dashboard/links", label: "Your items", icon: QrCode },
    { href: "/dashboard/shop", label: "Shop", icon: ShoppingBag },
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
    <ul className={`grid ${group === "sheet" ? "gap-1" : "gap-0.5"}`}>
      {NAV[side].map(({ href, label, icon: Icon, count }) => {
        const active = isActive(pathname, href);
        const n = count ? (counts[count] ?? 0) : 0;
        return (
          <motion.li key={href} variants={group === "sheet" ? ITEM_IN : undefined}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center gap-2.5 rounded-lg px-2.5 transition-colors ${group === "sheet" ? "min-h-12 text-base" : "min-h-11 text-[0.9rem] lg:min-h-9"} ${
                active ? "font-medium text-ink" : "text-ink-3 hover:bg-shell-hover hover:text-ink"
              }`}
            >
              {active &&
                (group === "sheet" ? (
                  <span className="nav-selected absolute inset-0 rounded-lg" />
                ) : (
                  <motion.span
                    layoutId={`nav-pill-${side}-${group}`}
                    className="nav-selected absolute inset-0 rounded-lg"
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  />
                ))}
              <Icon aria-hidden="true" className={`relative size-4 shrink-0 ${active ? "" : "text-muted"}`} strokeWidth={active ? 2 : 1.75} />
              <span className="relative flex-1 truncate">{label}</span>
              {n > 0 && (
                <span className="count count-alert pop relative" aria-label={`${n} need attention`}>
                  {n}
                </span>
              )}
            </Link>
          </motion.li>
        );
      })}
    </ul>
  );
}

// Below 1024px the sidebar folds into a top bar with a menu button that opens the whole nav.
// The menu opens the way the logo reads: a tap and the ripple it sends. An ink circle grows
// from the menu button until it fills the screen, then the account, the pages and the footer
// arrive top to bottom. Closing draws the ripple back into the button, faster. With reduced
// motion it is a short fade. It behaves as a modal: the page behind can't scroll or take focus,
// a tapped page, Escape and the phone's Back all close it, and focus returns to the button.
// (It reads no URL itself: it also renders as the shell's static placeholder, which is prerendered.)
const EXPO = [0.16, 1, 0.3, 1] as const;
const ORIGIN = "calc(100% - 38px) calc(28px + env(safe-area-inset-top))"; // the menu button's centre
// The ripple's radius is measured when the menu opens (the far corner from the button), so it
// grows in pixels from start to finish and never jumps between units.
const SHEET = {
  closed: { clipPath: `circle(22px at ${ORIGIN})`, transition: { duration: 0.3, ease: [0.4, 0, 0.7, 0.2] as const } },
  open: (r: number) => ({ clipPath: `circle(${r}px at ${ORIGIN})`, transition: { duration: 0.56, ease: EXPO, delayChildren: 0.1, staggerChildren: 0.035 } }),
};
const SHEET_STILL = {
  closed: { opacity: 0, transition: { duration: 0.12 } },
  open: { opacity: 1, transition: { duration: 0.16, staggerChildren: 0 } },
};
export const ITEM_IN = {
  closed: { opacity: 0, y: 10, transition: { duration: 0.12 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EXPO } },
};

export function MobileNav({
  side,
  counts,
  title,
  footer,
  extra,
}: {
  side: "owner" | "admin";
  counts?: NavCounts;
  title: React.ReactNode;
  footer: React.ReactNode;
  extra?: React.ReactNode; // what the desktop top bar holds (the owner's review page link)
}) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [radius, setRadius] = useState(1200);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (!open) return;
    // Lock the page where it is: iOS ignores overflow:hidden on <html>, so pin <body> instead
    // and put the scroll back exactly on close.
    const y = window.scrollY;
    const body = document.body.style;
    const before = { position: body.position, top: body.top, width: body.width };
    Object.assign(body, { position: "fixed", top: `-${y}px`, width: "100%" });
    returnFocus.current = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab" || !sheet.current) return;
      const items = sheet.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])");
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    // the phone's Back (or a swipe back) closes the menu as well as going back
    const onBack = () => setOpen(false);
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onBack);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onBack);
      Object.assign(body, before);
      window.scrollTo(0, y);
    };
  }, [open]);

  const alerts = Object.values(counts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const variants = reduced ? SHEET_STILL : SHEET;

  return (
    // sticky, so the menu stays one tap away however far down the page the owner is
    <div className="sticky top-0 z-40 lg:hidden">
      <div className="shell-zone flex h-[calc(56px+env(safe-area-inset-top))] items-center justify-between gap-3 border-b border-shell-edge bg-shell px-4 pt-[env(safe-area-inset-top)]">
        <Brand href={side === "admin" ? "/admin" : "/dashboard"} />
        <button
          ref={button}
          type="button"
          onClick={() => {
            setRadius(Math.ceil(Math.hypot(window.innerWidth, window.innerHeight)) + 24);
            setOpen(true);
          }}
          className="relative -mr-2 grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-shell-hover active:bg-shell-hover"
          aria-label={alerts ? `Open menu, ${alerts} need attention` : "Open menu"}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
          {alerts > 0 && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-amber ring-2 ring-shell" />}
        </button>
      </div>
      <AnimatePresence
        onExitComplete={() => {
          if (returnFocus.current) button.current?.focus();
          returnFocus.current = false;
        }}
      >
        {open && (
          <motion.div
            ref={sheet}
            key="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="app-shell shell-zone fixed inset-0 z-50 flex flex-col overscroll-contain pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] will-change-[clip-path]"
            variants={variants}
            custom={radius}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <div className="flex h-14 shrink-0 items-center justify-between px-4">
              <Brand href={side === "admin" ? "/admin" : "/dashboard"} />
              <motion.button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 grid size-11 place-items-center rounded-full transition-colors hover:bg-shell-hover active:bg-shell-hover"
                aria-label="Close menu"
                autoFocus
                initial={reduced ? false : { rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1, transition: { duration: 0.4, ease: EXPO, delay: 0.12 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
              </motion.button>
            </div>
            <motion.div variants={ITEM_IN} className="shrink-0 px-4 pt-2 pb-5">
              {title}
            </motion.div>
            <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
              <NavList side={side} counts={counts} onNavigate={() => setOpen(false)} group="sheet" />
            </nav>
            {extra && (
              <motion.div variants={ITEM_IN} className="shrink-0 px-2 pb-3">
                {extra}
              </motion.div>
            )}
            <motion.div variants={ITEM_IN} className="shrink-0 border-t border-shell-edge px-4 py-4">
              {footer}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
