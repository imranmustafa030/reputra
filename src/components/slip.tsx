// The counter slip: a solid white sheet on the colour field, torn along the bottom like the
// slip you get at a JazzCash or bank counter. Forms live on it so they never blend into the ground.
export function Slip({ children, className = "", labelledBy }: { children: React.ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section className={`slip ${className}`} aria-labelledby={labelledBy}>
      <div className="slip-body">{children}</div>
      <svg className="slip-tear" viewBox="0 0 480 14" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 0H480V2L470 12L460 2L450 12L440 2L430 12L420 2L410 12L400 2L390 12L380 2L370 12L360 2L350 12L340 2L330 12L320 2L310 12L300 2L290 12L280 2L270 12L260 2L250 12L240 2L230 12L220 2L210 12L200 2L190 12L180 2L170 12L160 2L150 12L140 2L130 12L120 2L110 12L100 2L90 12L80 2L70 12L60 2L50 12L40 2L30 12L20 2L10 12L0 2Z" />
      </svg>
    </section>
  );
}
