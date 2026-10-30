"use client";

import { useSyncExternalStore } from "react";

// Small taps under the customer's finger, played two ways:
// - Android: `haptic()` runs the vibration motor, once the person has touched the page (so
//   nothing buzzes on its own and the opening film stays silent). Pulses stay short on purpose:
//   the cheap motors in many phones turn anything long into a rattle.
// - iPhone: Safari has no vibration, but toggling a switch plays the system tick. Since iOS 26.5
//   only a real finger on the switch does (a page clicking it from code stays silent), so the
//   tap targets carry `<HapticTap />`: an invisible label over the element, tied to a hidden
//   switch. One tick per tap, whatever `haptic()` was asked for.

export type Haptic = "select" | "tick" | "firm" | "success" | "error";

// Vibration patterns: buzz, pause, buzz… in ms.
const PATTERNS: Record<Haptic, number[]> = {
  select: [6], // a chip or a draft chosen
  tick: [9], // a star
  firm: [14], // four stars
  success: [10, 70, 16], // five stars, review copied, note sent
  error: [14, 60, 14, 60, 14], // something needs fixing
};

/** Vibrates where the phone can (Android); does nothing anywhere else. A newer one replaces it. */
export function haptic(kind: Haptic) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  // Chrome refuses (and warns in the console) before the first touch.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
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
 * `off` lets taps through to what is underneath (a draft being edited) without unmounting it.
 */
export function HapticTap({ off = false }: { off?: boolean }) {
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  if (!ios) return null;
  return (
    <label
      aria-hidden="true"
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
