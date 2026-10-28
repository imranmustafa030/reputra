import type { Metadata } from "next";
import { cache } from "react";
import { LogOut, Search } from "lucide-react";
import { AppShell, type ShellData } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { SetupPack } from "@/models/SetupPack";
import { ScopeCard } from "@/components/scope-card";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Reputra admin" }, robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell side="admin" load={shellData}>
      {children}
    </AppShell>
  );
}

const shellData = cache(async (): Promise<ShellData> => {
  const admin = await requireAdmin();
  await db();
  const [payments, packs] = await Promise.all([
    Payment.countDocuments({ status: "submitted" }),
    SetupPack.countDocuments({ status: { $in: ["new", "printing", "on_the_way"] } }),
  ]);
  return {
    scope: <ScopeCard name="Reputra team" meta="Admin" />,
    counts: { payments, packs },
    topBar: (
      <form action="/admin/businesses" className="relative w-full max-w-[420px]" role="search">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
        <input
          name="q"
          type="search"
          placeholder="Find a business, owner or phone"
          aria-label="Find a business"
          className="h-8 w-full rounded-full border border-edge bg-sheet pr-3 pl-9 text-sm placeholder:text-faint focus:border-ink focus:outline-none"
        />
      </form>
    ),
    account: (
      <div className="flex items-center gap-2 border-t border-shell-edge px-1 pt-3">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-active text-xs font-semibold">
          {admin.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{admin.name}</span>
          <span className="block truncate text-xs text-muted">{admin.email}</span>
        </span>
        <form action="/logout" method="post">
          <button type="submit" className="grid size-9 place-items-center rounded-full text-muted hover:bg-shell-hover hover:text-ink" aria-label="Log out" title="Log out">
            <LogOut aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    ),
  };
});
