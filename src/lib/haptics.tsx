"use client";

import { useSyncExternalStore } from "react";

// Small taps under the customer's finger, played two ways:
// - Android: `haptic()` runs the vibration motor, once the person has touched the page (so
//   nothing buzzes on its own and the opening film stays silent). Firm, clear pulses, each kind
//   its own shape, so a finger can tell a choice from a refusal without looking.
// - iPhone: Safari has no vibration, but toggling a switch plays the system tick. Since iOS 26.5
//   only a real finger on the switch does (a page clicking it from code stays silent), so the
//   tap targets carry `<HapticTap />`: an invisible label over the element, tied to a hidden
//   switch. One tick per tap, whatever `haptic()` was asked for, and nothing while a finger slides.

export type Haptic = "tap" | "select" | "success" | "error" | "deny";

// Vibration patterns: buzz, pause, buzz… in ms.
const PATTERNS: Record<Haptic, number[]> = {
  tap: [18], // any button
  select: [22], // a chip or a draft chosen
  success: [30, 60, 50], // five stars, review copied, note sent: a rising double
  error: [40, 60, 40, 60, 40], // something needs fixing: three knocks
  deny: [60, 40, 60], // no more room (a fourth pick): two heavy thuds
};
// Stars from light to strong: the tick when one is chosen.
const STARS = [12, 18, 26, 34, 44];
// A finger held on the stars hums, stronger the higher the star under it. A page can't set the
// motor's strength, only when it runs, so strength is the share of each 40ms it is on: short
// pulses for one star, unbroken for five.
const HUM: [number, number][] = [
  [8, 32],
  [14, 26],
  [21, 19],
  [29, 11],
  [40, 0],
];
let humming: ReturnType<typeof setInterval> | undefined;

/** Vibrates where the phone can (Android); does nothing anywhere else. A newer one replaces it. */
export function haptic(kind: Haptic) {
  vibrate(PATTERNS[kind]);
}

/** The star under the finger, 1 to 5, light to strong. */
export function starHaptic(n: number) {
  vibrate([STARS[Math.min(5, Math.max(1, n)) - 1]]);
}

/** Starts (or changes) the hum for the star under a held finger; `stopHum` ends it. */
export function humStar(n: number) {
  const [on, off] = HUM[Math.min(5, Math.max(1, n)) - 1];
  // Chrome takes at most 99 steps per pattern, so about two seconds is queued and renewed before it runs out
  const play = () => vibrate(off ? Array.from({ length: 98 }, (_, i) => (i % 2 ? off : on)) : [4000]);
  clearInterval(humming);
  play();
  humming = setInterval(play, off ? 1900 : 3800);
}

export function stopHum() {
  if (humming === undefined) return;
  clearInterval(humming);
  humming = undefined;
  vibrate([0]);
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
  // Chrome refuses (and warns in the console) before the first touch.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(pattern);
    last = performance.now();
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
