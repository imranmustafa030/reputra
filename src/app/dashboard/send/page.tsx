import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requirePaidOwner } from "@/lib/auth";
import { reviewLink } from "@/lib/links";
import { WhatsAppSender } from "./sender";

export const metadata: Metadata = { title: "Ask on WhatsApp" };

export default async function SendPage() {
  const { business } = await requirePaidOwner();
  return (
    <>
      <PageHeader
        title="Ask on WhatsApp"
        lede="For customers who have already left. WhatsApp opens with the message ready and it goes from your own number, free."
      >
        <Link href="/dashboard/settings#message" className="btn btn-secondary btn-sm">
          Edit message
        </Link>
      </PageHeader>
      <WhatsAppSender template={business.whatsappMessage} business={business.name} link={await reviewLink(business.slug, "wa")} />
    </>
  );
}
