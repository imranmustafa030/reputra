"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth";
import { applyPayment, confirmPayment, createPayment, DuplicateTransactionError, getPlans, markPaymentFailed } from "@/lib/billing";
import { db } from "@/lib/db";
import { toWhatsAppNumber } from "@/lib/format";
import { keep, type FormState } from "@/lib/form-state";
import { activeGateway } from "@/lib/gateway";
import { allow } from "@/lib/rate-limit";
import { INTERVALS, PLAN_CODES } from "@/models/Plan";
import { Payment } from "@/models/Payment";
import { TRANSFER_METHODS } from "@/models/PaymentAccount";

const FIELDS = ["plan", "interval", "method", "transactionId", "payerName", "contactName", "contactPhone", "address", "city"];

const checkoutSchema = z.object({
  plan: z.enum(PLAN_CODES, "Choose a plan."),
  interval: z.enum(INTERVALS).catch("month"),
  method: z.enum([...TRANSFER_METHODS, "card"], "Choose how you’ll pay."),
  transactionId: z.string().trim().max(64).optional().default(""),
  payerName: z.string().trim().max(80).optional().default(""),
});

const deliverySchema = z.object({
  contactName: z.string().trim().min(2, "Who should receive the stand and card?").max(80),
  contactPhone: z
    .string()
    .trim()
    .transform((v) => toWhatsAppNumber(v))
    .refine((v): v is string => v !== null, "Enter a phone number for the delivery, e.g. 0300 1234567."),
  address: z.string().trim().min(8, "Enter the full address of your business.").max(300),
  city: z.string().trim().min(2, "Enter the city.").max(60),
});

// One form pays for a new plan or renews one. The plan switches on as soon as a transfer's
// transaction ID is submitted; an admin confirms the money afterwards.
export async function checkout(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, ...FIELDS);
  const { business, access } = await requireOwner();
  if (business.suspended) return { error: "This account is paused. Message Reputra on WhatsApp to sort it out.", values };

  const parsed = checkoutSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const { interval, method, transactionId, payerName } = parsed.data;

  const plan = (await getPlans()).find((p) => p.code === parsed.data.plan);
  if (!plan) return { error: "That plan isn’t available any more. Choose another.", values };

  // First payment: the free stand and card need somewhere to go.
  let delivery = null;
  if (access.state === "none") {
    const d = deliverySchema.safeParse(Object.fromEntries(form));
    if (!d.success) return { error: d.error.issues[0].message, values };
    delivery = d.data;
  }

  if (!(await allow(`checkout:${business.id}`, 6, 3600))) {
    return { error: "Too many payment attempts. Wait an hour, or message Reputra on WhatsApp.", values };
  }

  if (method === "card") {
    const gateway = activeGateway();
    if (!gateway) return { error: "Online payment isn’t available yet. Pay by transfer instead.", values };
    const payment = await createPayment({ businessId: business.id, plan, interval, method, provider: gateway.id, status: "pending", delivery });
    const { redirectUrl } = await gateway.start({ id: String(payment._id), reference: payment.reference, amount: payment.amount });
    redirect(redirectUrl);
  }

  if (!/^[A-Za-z0-9-]{6,64}$/.test(transactionId)) {
    return { error: "Enter the transaction ID (TID) from your payment receipt. It’s 6 or more letters and numbers.", values };
  }

  let reference: string;
  try {
    const payment = await createPayment({
      businessId: business.id,
      plan,
      interval,
      method,
      provider: "manual",
      status: "submitted",
      transactionId,
      payerName,
      delivery,
    });
    await applyPayment(payment._id);
    reference = payment.reference;
  } catch (err) {
    if (err instanceof DuplicateTransactionError) {
      return { error: "This transaction ID has already been used for a payment. Check the TID on your receipt.", values };
    }
    throw err;
  }

  revalidatePath("/dashboard", "layout");
  redirect(`/checkout/done?ref=${reference}`);
}

// The pretend gateway's two buttons. Only reachable when PAYMENT_GATEWAY=test.
export async function finishTestPayment(form: FormData) {
  const { business } = await requireOwner();
  if (activeGateway()?.id !== "test") redirect("/checkout");
  const reference = String(form.get("ref") ?? "");
  await db();
  const payment = await Payment.findOne({ reference, business: business.id, provider: "test", status: "pending" }).lean();
  if (!payment) redirect("/checkout");

  if (form.get("outcome") === "paid") {
    await confirmPayment(String(payment._id), null, ["pending"]);
    revalidatePath("/dashboard", "layout");
    redirect(`/checkout/done?ref=${reference}`);
  }
  await markPaymentFailed(String(payment._id));
  redirect(`/checkout?plan=${payment.plan}&interval=${payment.interval}&failed=1`);
}
