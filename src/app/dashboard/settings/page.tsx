import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePaidOwner } from "@/lib/auth";
import { whatsappLink } from "@/lib/contact";
import { accountEnabled, searchEnabled } from "@/lib/google";
import { businessLinks } from "@/lib/tags";
import { db } from "@/lib/db";
import { formatDay, formatWhen } from "@/lib/labels";
import { User } from "@/models/User";
import { PasswordForm } from "./password-form";
import { Row, SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, business } = await requirePaidOwner();
  await db();
  const [account, links] = await Promise.all([User.findById(user.id).select("passwordChangedAt createdAt").lean(), businessLinks(business.id)]);
  return (
    <>
      <PageHeader
        title="Settings"
        lede={`${business.name} · ${business.city}`}
      />
      <SettingsForm
        business={{
          name: business.name,
          category: business.category,
          city: business.city,
          googleReviewUrl: business.googleReviewUrl,
          googlePlace: business.googlePlace,
          whatsappMessage: business.whatsappMessage,
          introAnimation: business.introAnimation !== false,
        }}
        pageUrl={links.plain}
        waLink={links.wa}
        google={{ search: searchEnabled(), account: accountEnabled() }}
      />
      {/* A group of its own, well clear of the business form's Save, so it never reads as part of it. */}
      <section
        aria-labelledby="account-title"
        className="mt-16 max-w-[1080px] sm:mt-20"
      >
        <header className="mb-6 border-b border-edge pb-5">
          <h2
            id="account-title"
            className="text-lg leading-7 font-semibold tracking-[-0.01em]"
          >
            Your account
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            How you log in to Reputra. Only you see this.
          </p>
        </header>
        <div>
          <Row
            title="Log-in email"
            description="Where you log in, and where the Reputra team writes to you."
          >
            <p className="pt-0.5 font-medium break-all">{user.email}</p>
            <p className="mt-0.5 text-sm text-muted">
              To change it,{" "}
              <a
                href={whatsappLink(
                  `Assalam o Alaikum, please change the log-in email for ${business.name}.`,
                )}
                target="_blank"
                rel="noopener"
                className="link"
              >
                message the Reputra team
              </a>
              .
            </p>
          </Row>
          <Row
            id="account-password"
            title="Password"
            description="Changing it signs you out on every other phone and computer."
            last
          >
            <PasswordForm
              email={user.email}
              changed={passwordLine(
                account?.passwordChangedAt,
                account?.createdAt,
              )}
            />
          </Row>
        </div>
      </section>
      <form action="/logout" method="post" className="mt-10 lg:hidden">
        <button type="submit" className="btn btn-secondary w-full">
          Log out
        </button>
      </form>
    </>
  );
}

// "Last changed 3 h ago", or, for a password never changed, the day the account was made.
function passwordLine(changedAt?: Date | null, createdAt?: Date) {
  if (changedAt) {
    const when = formatWhen(changedAt);
    return `Last changed ${/^\d/.test(when) ? when : when.charAt(0).toLowerCase() + when.slice(1)}`;
  }
  return createdAt
    ? `Set when you joined, ${formatDay(createdAt)}`
    : "Set when you joined";
}
