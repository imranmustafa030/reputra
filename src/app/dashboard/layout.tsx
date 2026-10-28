import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { AppShell, type ShellData } from "@/components/app-shell";
import { requireOwner } from "@/lib/auth";
import { countUnreadNotes } from "@/lib/stats";
import { businessLinks } from "@/lib/tags";
import { PLAN_NAMES } from "@/lib/labels";
import { ScopeCard } from "@/components/scope-card";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Reputra" }, robots: { index: false } };

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <AppShell side="owner" load={shellData}>
      <Suspense>
        <DemoNotice />
      </Suspense>
      {children}
    </AppShell>
  );
}

// Sample accounts say so on every screen, so nobody mistakes their numbers for real results.
async function DemoNotice() {
  const { business } = await requireOwner();
  if (!business.demo) return null;
  return <p className="mb-5 rounded-xl border border-edge bg-frame px-4 py-3 text-sm text-muted">Sample data: this is a demo account, and every number on it is made up.</p>;
}

const shellData = cache(async (): Promise<ShellData> => {
  const { user, business, access } = await requireOwner();
  const [notes, links] = await Promise.all([access.state === "none" ? 0 : countUnreadNotes(business.id), businessLinks(business.id)]);
  return {
    scope: <ScopeCard name={business.name} meta={`${access.plan ? `${PLAN_NAMES[access.plan]} plan` : "No plan yet"} · ${business.city}`} />,
    counts: { notes },
    topBar: (
      <a
        href={`${links.plain}?preview=1`} // the opening film every time, and the owner's own look isn't counted
        target="_blank"
        rel="noopener"
        className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition-colors hover:bg-shell-hover hover:text-ink"
      >
        Your review page
        <ExternalLink aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
      </a>
    ),
    account: (
      <div className="flex items-center gap-2 border-t border-shell-edge px-1 pt-3">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-active text-xs font-semibold">
          {user.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-xs text-muted">{user.email}</span>
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
