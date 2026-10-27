import type { Metadata } from "next";
import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Checkout", template: "%s · Reputra" }, robots: { index: false } };

// Paying is a focused task: no sidebar, just the brand, who is paying, and a way out.
export default function CheckoutLayout({ children }: LayoutProps<"/checkout">) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <Suspense>
          <Who />
        </Suspense>
      </header>
      <main className="mx-auto w-full max-w-[1120px] px-4 pt-4 pb-20 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}

async function Who() {
  const { user, access } = await requireOwner();
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden text-muted sm:inline">{user.email}</span>
      {access.state !== "none" && access.state !== "locked" ? (
        <a href="/dashboard" className="link">
          Back to dashboard
        </a>
      ) : (
        <form action="/logout" method="post">
          <button type="submit" className="link">
            Log out
          </button>
        </form>
      )}
    </div>
  );
}
