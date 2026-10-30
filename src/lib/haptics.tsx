"use client";

import { useSyncExternalStore } from "react";

// Small taps under the customer's finger, played two ways:
// - Android: `haptic()` runs the vibration motor, once the person has touched the page (so
//   nothing buzzes on its own and the opening film stays silent). Firm, clear pulses, each kind
//   its own shape, so a finger can tell a choice from a refusal without looking.
// - iPhone: Safari has no vibration, but toggling a switch plays the system tick. Since iOS 26.5
//   only a real finger on the switch does (a page clicking it from code stays silent), so the
//   tap targets carry `<HapticTap />`: an invisible label over the element, tied to a hidden
//   switch. One tick per tap, whatever `haptic()` was asked for, and nothing while a finger slides
//   (a slide is never a tap, so no page can make an iPhone tick during one).

export type Haptic = "tap" | "select" | "success" | "error" | "deny";

// Vibration patterns: buzz, pause, buzz… in ms.
const PATTERNS: Record<Haptic, number[]> = {
  tap: [18], // any button
  select: [22], // a chip or a draft chosen
  success: [30, 60, 50], // five stars, review copied, note sent: a rising double
  error: [40, 60, 40, 60, 40], // something needs fixing: three knocks
  deny: [60, 40, 60], // no more room (a fourth pick): two heavy thuds
};
// One firm tick for each star that lights up or goes dark under a finger, stronger the higher the
// star. A page can't set the motor's strength, only how long it runs, and a phone motor needs
// 20-30ms just to spin up, so the lightest is 22ms.
const STARS = [22, 30, 38, 48, 60];

/** Vibrates where the phone can (Android); does nothing anywhere else. A newer one replaces it. */
export function haptic(kind: Haptic) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate !== "function") debug?.(`${kind}: this browser has no vibration`);
  vibrate(PATTERNS[kind]);
}

/** The star under the finger, 1 to 5, light to strong. */
export function starHaptic(n: number) {
  vibrate([STARS[Math.min(5, Math.max(1, n)) - 1]]);
}

// `?debug=haptics` on a review link: what the stars receive and what the browser answers to each
// vibration, printed on the page, for checking on a real phone.
let debug: ((line: string) => void) | null = null;
export function hapticDebug(fn: ((line: string) => void) | null) {
  debug = fn;
}
export function hlog(line: string) {
  debug?.(line);
}

/**
 * For a whole screen's clicks: a plain tap on any button or link, unless something inside a
 * `data-haptic` element (which plays its own) or a haptic of its own just played.
 */
export function tapHaptic(e: React.MouseEvent) {
  const target = e.target as Element;
  if (!target.closest("button, a, [role=radio]") || target.closest("[data-haptic]")) return;
  if (performance.now() - last < 120) return;
  haptic("tap");
}

let last = -Infinity;
function vibrate(pattern: number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const ua = navigator.userActivation;
  const what = JSON.stringify(pattern);
  // Chrome refuses (and warns in the console) before the first touch.
  if (ua && !ua.hasBeenActive) {
    debug?.(`${what}: not sent, no tap on the page yet`);
    return;
  }
  try {
    const ok = navigator.vibrate(pattern);
    last = performance.now();
    debug?.(`${what} → ${ok ? "accepted" : "REFUSED"} · tapped ${ua?.hasBeenActive} · active ${ua?.isActive}`);
  } catch {}
}

// iPadOS reports itself as a Mac; the touch points give it away.
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
const noSubscribe = () => () => {};

/**
 * The iPhone tick for the tap target it sits in (which must be positioned). The finger lands on
 * this label, the label toggles its switch (the tick), and the tap goes on to the element's own
 * click as usual; the switch's own click is stopped so the element never gets it twice.
 * The label takes the tap's default action (toggling the switch) from a link or submit button
 * it covers, so those are followed by hand once the click has been handled.
 * `off` lets taps through to what is underneath (a draft being edited) without unmounting it.
 */
export function HapticTap({ off = false }: { off?: boolean }) {
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  if (!ios) return null;
  return (
    <label
      aria-hidden="true"
      onClick={(e) => {
        const host = e.currentTarget.parentElement;
        const event = e.nativeEvent;
        if (host instanceof HTMLAnchorElement) setTimeout(() => event.defaultPrevented || location.assign(host.href));
        else if (host instanceof HTMLButtonElement && host.type === "submit") setTimeout(() => event.defaultPrevented || host.form?.requestSubmit(host));
      }}
      style={{ position: "absolute", inset: 0, touchAction: "manipulation", WebkitTapHighlightColor: "transparent", pointerEvents: off ? "none" : undefined }}
    >
      {/* never under the finger: WebKit treats a touch that starts on a switch as handled and cancels the scroll */}
      <input
        type="checkbox"
        {...{ switch: "" }}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", width: 1, height: 1, margin: 0, visibility: "hidden" }}
      />
    </label>
  );
}
