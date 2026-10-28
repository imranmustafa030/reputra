// One continuous glide that brings an element's top edge to just under the top of the screen.
// It re-reads where the element is on every frame, so when the phone keyboard slides up or a
// step grows and the page shifts, the glide bends to follow instead of jumping or restarting.
// It never passes the page's real end, so it slows into place instead of hitting the bottom,
// and a touch stops it at once, so it never fights the customer's finger. Returns a stop.
export function glideTo(el: HTMLElement | null, gap = 16): () => void {
  const target = () => {
    const end = document.documentElement.scrollHeight - window.innerHeight;
    return el ? Math.min(end, Math.max(0, el.getBoundingClientRect().top + window.scrollY - gap)) : window.scrollY;
  };
  if (!el) return () => {};
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, target());
    return () => {};
  }
  const from = window.scrollY;
  const start = performance.now();
  const duration = 620;
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("wheel", stop);
  };
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p); // expo-out, like the rest of the page
    window.scrollTo(0, from + (target() - from) * eased);
    if (p < 1) frame = requestAnimationFrame(step);
    else stop();
  };
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("wheel", stop, { passive: true });
  frame = requestAnimationFrame(step);
  return stop;
}
