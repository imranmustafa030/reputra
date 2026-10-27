import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-5">
      <Brand />
      <h1 className="mt-10 text-[2rem] leading-tight font-semibold tracking-[-0.035em]">This page doesn’t exist</h1>
      <p className="mt-3 text-stone">If you scanned a stand or tapped a card, ask the staff for a fresh link.</p>
      <a href="/" className="btn mt-8 self-start">Go to reputra</a>
    </main>
  );
}
