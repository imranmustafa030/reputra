import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireOwner } from "@/lib/auth";
import { reviewLink } from "@/lib/links";
import { WhatsAppSender } from "./sender";

export const metadata: Metadata = { title: "Send on WhatsApp" };

export default async function SendPage() {
  const { business } = await requireOwner();
  return (
    <>
      <PageHeader
        title="Send on WhatsApp"
        lede="Type the customer's name and number. WhatsApp opens on this phone with the message ready; it goes from your own number and costs nothing."
      />
      <WhatsAppSender template={business.whatsappMessage} business={business.name} link={await reviewLink(business.slug, "wa")} />
    </>
  );
}
