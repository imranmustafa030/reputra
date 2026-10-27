"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { slugify, toWhatsAppNumber } from "@/lib/format";
import { fieldErrors, keep, type FormState } from "@/lib/form-state";
import { allow, clearLimit } from "@/lib/rate-limit";
import { startSession } from "@/lib/session";
import { User, type Role } from "@/models/User";
import { Business } from "@/models/Business";
import { PLAN_CODES } from "@/models/Plan";

// In the order the fields appear on the sign-up slip, so the first error is the top-most one.
const signupSchema = z.object({
  business: z.string().trim().min(2, "Enter your business name.").max(80),
  name: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => toWhatsAppNumber(v))
    .refine((v): v is string => v !== null, "Enter your WhatsApp number, e.g. 0300 1234567."),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters for the password.").max(200),
  plan: z.enum(PLAN_CODES).catch("pro"),
});

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, "name", "business", "phone", "email", "plan");
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error.issues);
    const field = Object.keys(errors)[0];
    return { error: errors[field], field, errors, values };
  }
  const { name, business, phone, email, password, plan } = parsed.data;

  if (!(await allow(`signup:${await clientIp()}`, 10, 3600))) {
    return { error: "Too many sign-ups from this connection. Try again in an hour.", values };
  }
  await db();
  if (await User.exists({ email })) {
    const error = "An account with this email already exists. Log in instead.";
    return { error, field: "email", errors: { email: error }, values };
  }

  const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 10) });
  let slug = slugify(business);
  if (await Business.exists({ slug })) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  await Business.create({ owner: user._id, name: business, slug });

  await startSession(String(user._id), 0);
  redirect(`/checkout?plan=${plan}`);
}

const loginSchema = z.object({
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, "email");
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error.issues);
    const field = Object.keys(errors)[0];
    return { error: errors[field], field, errors, values };
  }
  const { email, password } = parsed.data;

  // 8 wrong tries per email per 15 minutes, 30 per connection: enough for typos, not for guessing.
  const emailKey = `login:${email}`;
  if (!(await allow(emailKey, 8, 900)) || !(await allow(`login-ip:${await clientIp()}`, 30, 900))) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", values };
  }

  await db();
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = "That email and password don’t match.";
    return { error, field: "password", errors: { password: error }, values };
  }
  if (user.status !== "active") return { error: "This account is switched off. Message Reputra to turn it back on.", values };

  await clearLimit(emailKey);
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  await startSession(String(user._id), user.sessionVersion);

  const home = homeFor(user.role as Role);
  const next = String(form.get("next") ?? "");
  // Only ever send people back into their own side of the app, never to another site.
  redirect(next.startsWith(`${home}/`) || next === home ? next : home);
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    password: z.string().min(8, "Use at least 8 characters for the new password.").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two new passwords don’t match.", path: ["confirm"] });

// Changing the password signs out every other device and keeps this one logged in.
export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/logout");
  const parsed = passwordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await allow(`password:${me.id}`, 8, 900))) return { error: "Too many attempts. Wait 15 minutes and try again." };

  await db();
  const user = await User.findById(me.id).select("+passwordHash");
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) return { error: "Your current password isn’t right." };
  user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  user.sessionVersion += 1;
  await user.save();
  await startSession(String(user._id), user.sessionVersion);
  return { ok: "Password changed. Other devices have been logged out." };
}
