import { Suspense } from "react";
import { Brand } from "./brand";
import { MobileNav, NavItems, NavList, type NavCounts } from "./app-nav";

// The frame for the dashboard and the admin side: one warm stone L (sidebar and a
// 48px top bar, no rule between them) holding a white sheet inset 8px from the window's
// right and bottom edges. Below 1024px the frame folds away and the sheet is the screen.
//
// The frame itself is static; everything that needs the session is loaded inside each slot
// (`load` is per-request cached), so navigation stays instant.

export type ShellData = {
  scope: React.ReactNode; // whose account this is
  counts: NavCounts;
  topBar: React.ReactNode;
  account: React.ReactNode;
};

export function AppShell({ side, load, children }: { side: "owner" | "admin"; load: () => Promise<ShellData>; children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:grid-rows-[48px_minmax(0,1fr)]">
      <Suspense fallback={<MobileNav side={side} title={null} footer={null} />}>
        <MobileSlot side={side} load={load} />
      </Suspense>

      <aside className="shell-zone sticky top-0 row-span-2 hidden h-dvh flex-col px-3 pt-3 pb-3 lg:flex">
        <div className="flex h-9 items-center px-2.5">
          <Brand href={side === "admin" ? "/admin" : "/dashboard"} className="text-[1.15rem]" />
        </div>
        <div className="mt-4 mb-5 min-h-[56px]">
          <Suspense fallback={<div className="h-[56px]" />}>
            <Slot load={load} pick="scope" />
          </Suspense>
        </div>
        <nav aria-label="Main">
          <Suspense fallback={<NavItems side={side} pathname="" />}>
            <CountedNav side={side} load={load} />
          </Suspense>
        </nav>
        <div className="mt-auto">
          <Suspense>
            <Slot load={load} pick="account" />
          </Suspense>
        </div>
      </aside>

      <div className="shell-zone hidden items-center justify-end gap-2 pr-4 pl-6 lg:flex">
        <Suspense>
          <Slot load={load} pick="topBar" />
        </Suspense>
      </div>

      <main className="app-sheet min-w-0 bg-sheet px-4 pt-6 pb-16 sm:px-6 lg:mr-2 lg:mb-2 lg:rounded-2xl lg:border lg:border-edge lg:px-8 lg:pt-7 lg:pb-12">
        <div className="mx-auto w-full max-w-[1240px]">{children}</div>
      </main>
    </div>
  );
}

async function Slot({ load, pick }: { load: () => Promise<ShellData>; pick: "scope" | "topBar" | "account" }) {
  return (await load())[pick];
}

async function CountedNav({ side, load }: { side: "owner" | "admin"; load: () => Promise<ShellData> }) {
  const { counts } = await load();
  return <NavList side={side} counts={counts} />;
}

async function MobileSlot({ side, load }: { side: "owner" | "admin"; load: () => Promise<ShellData> }) {
  const { scope, counts, account, topBar } = await load();
  return <MobileNav side={side} counts={counts} title={scope} footer={account} extra={topBar} />;
}
