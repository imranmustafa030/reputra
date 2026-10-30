// Small taps under the customer's finger. Android: the vibration motor, where the browser has
// it. iPhone: Safari has no vibration, but since iOS 18 toggling a switch plays the system tick,
// so a hidden one is toggled instead. Both only play once the person has touched the page, so
// nothing buzzes on its own (the opening film stays silent). Pulses stay short on purpose: the
// cheap motors in many phones turn anything long into a rattle.

export type Haptic = "select" | "tick" | "firm" | "success" | "error";

// Vibration patterns: buzz, pause, buzz… in ms. On iPhone each buzz becomes one tick.
const PATTERNS: Record<Haptic, number[]> = {
  select: [6], // a chip or a draft chosen
  tick: [9], // a star
  firm: [14], // four stars
  success: [10, 70, 16], // five stars, review copied, note sent
  error: [14, 60, 14, 60, 14], // something needs fixing
};

let pending: ReturnType<typeof setTimeout>[] = [];

function iosTick() {
  const label = document.createElement("label");
  label.ariaHidden = "true";
  label.style.display = "none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.head.appendChild(label);
  label.click();
  label.remove();
}

/** Plays a haptic where the phone can; does nothing anywhere else. A newer one replaces it. */
export function haptic(kind: Haptic) {
  if (typeof navigator === "undefined") return;
  // Chrome refuses (and warns in the console) before the first touch.
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  const pattern = PATTERNS[kind];
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
      return;
    }
    if (!("switch" in HTMLInputElement.prototype) || !matchMedia("(pointer: coarse)").matches) return;
    pending.forEach(clearTimeout);
    pending = [];
    let at = 0;
    pattern.forEach((ms, i) => {
      // the first tick inside the tap itself: Safari may not play one from a later timer
      if (i % 2 === 0) {
        if (at) pending.push(setTimeout(iosTick, at));
        else iosTick();
      }
      at += ms;
    });
  } catch {}
}
