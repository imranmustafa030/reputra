import type { Metadata } from "next";
import { requirePaidOwner } from "@/lib/auth";
import { getPaymentAccounts } from "@/lib/billing";
import { db } from "@/lib/db";
import { formatPhone } from "@/lib/labels";
import { SetupPack } from "@/models/SetupPack";
import { Shop } from "./shop";

export const metadata: Metadata = { title: "Shop" };

// Printed items for more places to ask: counter stands, tap cards and tap stickers.
// The delivery details start from the owner's last delivery.
export default async function ShopPage() {
  const { business, user } = await requirePaidOwner();
  await db();
  const [accounts, last] = await Promise.all([
    getPaymentAccounts(),
    SetupPack.findOne({ business: business.id }).sort({ createdAt: -1 }).select("contactName contactPhone address city").lean(),
  ]);
  return (
    <Shop
      businessName={business.name}
      accounts={accounts}
      delivery={{
        contactName: last?.contactName ?? user.name,
        contactPhone: last?.contactPhone ? formatPhone(last.contactPhone) : user.phone ? formatPhone(user.phone) : "",
        address: last?.address ?? "",
        city: last?.city ?? business.city,
      }}
    />
  );
}
