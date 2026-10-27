import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireOwner } from "@/lib/auth";
import { reviewLink } from "@/lib/links";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, business } = await requireOwner();
  return (
    <>
      <PageHeader title="Settings" lede={`Signed in as ${user.email}.`} />
      <SettingsForm
        business={{ name: business.name, googleReviewUrl: business.googleReviewUrl, whatsappMessage: business.whatsappMessage }}
        pageUrl={await reviewLink(business.slug, "direct")}
      />
      <form action="/logout" method="post" className="mt-10 md:hidden">
        <button type="submit" className="btn btn-ghost w-full">Log out</button>
      </form>
    </>
  );
}
