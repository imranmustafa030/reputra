import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePaidOwner } from "@/lib/auth";
import { reviewLink } from "@/lib/links";
import { PasswordForm, SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, business } = await requirePaidOwner();
  return (
    <>
      <PageHeader title="Settings" lede={`${business.name} · signed in as ${user.email}`} />
      <SettingsForm
        business={{
          name: business.name,
          category: business.category,
          city: business.city,
          googleReviewUrl: business.googleReviewUrl,
          whatsappMessage: business.whatsappMessage,
          introAnimation: business.introAnimation !== false,
        }}
        pageUrl={await reviewLink(business.slug, "direct")}
        waLink={await reviewLink(business.slug, "wa")}
      />
      <PasswordForm />
      <form action="/logout" method="post" className="mt-10 lg:hidden">
        <button type="submit" className="btn btn-secondary w-full">
          Log out
        </button>
      </form>
    </>
  );
}
