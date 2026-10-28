"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requirePaidOwner } from "@/lib/auth";
import { createShopOrder, DuplicateTransactionError, getPaymentAccounts } from "@/lib/billing";
import { db } from "@/lib/db";
import { toWhatsAppNumber } from "@/lib/format";
import { keep, type FormState } from "@/lib/form-state";
import { entryTag } from "@/lib/public";
import { allow } from "@/lib/rate-limit";
import { MAX_QTY, PRODUCT_KINDS, type CartLine } from "@/lib/shop";
import { ITEM_KINDS, Tag } from "@/models/Tag";
import { TRANSFER_METHODS } from "@/models/PaymentAccount";

const FIELDS = ["method", "transactionId", "payerName", "contactName", "contactPhone", "address", "city", ...PRODUCT_KINDS.map((k) => `qty_${k}`)];

const orderSchema = z.object({
  method: z.enum(TRANSFER_METHODS, "Choose how you’ll pay."),
  transactionId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{6,64}$/, "Enter the transaction ID (TID) from your payment receipt. It’s 6 or more letters and numbers."),
  payerName: z.string().trim().max(80).optional().default(""),
  contactName: z.string().trim().min(2, "Who should receive the order?").max(80),
  contactPhone: z
    .string()
    .trim()
    .transform((v) => toWhatsAppNumber(v))
    .refine((v): v is string => v !== null, "Enter a phone number for the delivery, e.g. 0300 1234567."),
  address: z.string().trim().min(8, "Enter the full delivery address.").max(300),
  city: z.string().trim().min(2, "Enter the city.").max(60),
});

// A shop order: printed items paid by transfer. Nothing is printed until the team finds the
// transfer; then the order becomes a delivery with one code per item.
export async function placeOrder(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, ...FIELDS);
  const { business } = await requirePaidOwner();

  const items: CartLine[] = PRODUCT_KINDS.flatMap((kind) => {
    const qty = Math.trunc(Number(form.get(`qty_${kind}`)) || 0);
    return qty > 0 ? [{ kind, qty: Math.min(qty, MAX_QTY) }] : [];
  });
  if (!items.length) return { error: "Add at least one item to your order.", values };

  const parsed = orderSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: issue.message, field: String(issue.path[0] ?? ""), values };
  }
  const accounts = await getPaymentAccounts();
  if (!accounts.some((a) => a.method === parsed.data.method)) return { error: "That way of paying isn’t open right now. Choose another.", field: "method", values };

  if (!(await allow(`shop:${business.id}`, 6, 3600))) return { error: "Too many orders in a row. Wait an hour, or message Reputra on WhatsApp.", values };

  const { method, transactionId, payerName, ...delivery } = parsed.data;
  try {
    const order = await createShopOrder({ businessId: business.id, items, method, transactionId, payerName, delivery });
    revalidatePath("/dashboard", "layout");
    return { ok: order.reference, values: { amount: String(order.amount) } };
  } catch (err) {
    if (err instanceof DuplicateTransactionError) {
      return { error: "This transaction ID has already been used for a payment. Check the TID on your receipt.", field: "transactionId", values };
    }
    throw err;
  }
}

// Lost, stolen or copied: the owner switches one printed item off (or back on). Its code then
// opens a "no longer works" page, and nothing it brings in is counted.
export async function switchItem(form: FormData) {
  const { business } = await requirePaidOwner();
  const on = form.get("to") === "on";
  await db();
  const tag = await Tag.findOneAndUpdate(
    { _id: String(form.get("id")), business: business.id, kind: { $in: ITEM_KINDS } },
    { $set: { status: on ? "active" : "off", offAt: on ? null : new Date() } },
    { returnDocument: "after" },
  );
  if (!tag) return;
  updateTag(entryTag(tag.code));
  revalidatePath("/dashboard/links");
}
