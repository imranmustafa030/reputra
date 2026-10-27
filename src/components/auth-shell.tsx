import { Brand } from "./brand";

export function AuthShell({ title, lede, children, footer }: { title: string; lede: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-5 py-8 sm:py-14">
      <Brand />
      <div className="my-auto py-10">
        <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.035em] text-balance">{title}</h1>
        <p className="mt-3 text-stone">{lede}</p>
        <div className="mt-8">{children}</div>
      </div>
      <p className="text-sm text-stone">{footer}</p>
    </main>
  );
}
