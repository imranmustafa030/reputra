import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/lib/auth";
import { AddBusinessForm } from "./add-form";

export const metadata: Metadata = { title: "Add business" };

// For signing a business up in person: the team creates the login and hands it over.
export default async function NewBusinessPage() {
  await requireAdmin();
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/businesses" className="text-muted hover:text-ink">
          Businesses
        </Link>
      </p>
      <PageHeader title="Add business" lede="Creates the owner’s login. Record their payment on the next screen; the dashboard opens once the plan is paid." />
      <AddBusinessForm />
    </>
  );
}
