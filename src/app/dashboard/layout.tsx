import { Suspense } from "react";
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { requireOwner } from "@/lib/auth";
import { DashboardNav } from "./nav";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Reputra" }, robots: { index: false } };

// The shell is static and prerenders instantly; only the business name and each page's data wait for the session.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="bg-ink px-5 pt-5 pb-3 text-paper md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:px-4 md:py-6">
        <div className="flex items-center justify-between md:block md:px-2">
          <Brand href="/dashboard" />
          <div className="mt-0 text-sm text-paper/60 md:mt-5">
            <Suspense fallback={<span className="inline-block h-4 w-28 animate-pulse rounded bg-paper/10" />}>
              <BusinessName />
            </Suspense>
          </div>
        </div>
        <div className="mt-4 md:mt-8">
          <DashboardNav />
        </div>
        <form action="/logout" method="post" className="hidden md:mt-auto md:block md:px-2">
          <button type="submit" className="text-sm text-paper/60 transition-colors hover:text-paper">
            Log out
          </button>
        </form>
      </aside>
      <main className="mx-auto w-full max-w-[1040px] px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}

async function BusinessName() {
  const { business } = await requireOwner();
  return <span className="block max-w-[16ch] truncate md:max-w-none">{business.name}</span>;
}
