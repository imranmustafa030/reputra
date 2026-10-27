import Link from "next/link";

// The website's mark: a tap, and the ripple it sends.
// "/" is the static website (public/index.html), so it gets a plain link, not client-side navigation.
export function Brand({ href = "/", className = "" }: { href?: string; className?: string }) {
  const Anchor = href === "/" ? "a" : Link;
  return (
    <Anchor href={href} className={`inline-flex items-center gap-2 text-[1.25rem] font-semibold tracking-[-0.05em] ${className}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[20px] overflow-visible">
        <circle cx="7.5" cy="12" r="3.6" className="fill-amber" />
        <path d="M13.93 4.34A10 10 0 0 1 13.93 19.66" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      reputra
    </Anchor>
  );
}
