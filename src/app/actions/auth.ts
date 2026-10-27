"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { slugify } from "@/lib/format";
import { keep, type FormState } from "@/lib/form-state";
import { startSession } from "@/lib/session";
import { User } from "@/models/User";
import { Business } from "@/models/Business";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  business: z.string().trim().min(2, "Enter your business name."),
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters for the password."),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, "name", "business", "email");
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };
  const { name, business, email, password } = parsed.data;

  await db();
  if (await User.exists({ email })) return { error: "An account with this email already exists. Log in instead.", values };

  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });

  let slug = slugify(business);
  if (await Business.exists({ slug })) slug = `${slug}-${randomBytes(2).toString("hex")}`;
  await Business.create({ owner: user._id, name: business, slug });

  await startSession(String(user._id));
  redirect("/dashboard");
}

const loginSchema = z.object({
  email: z.email("Enter a valid email.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const values = keep(form, "email");
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  await db();
  const user = await User.findOne({ email: parsed.data.email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "That email and password don’t match.", values };
  }

  await startSession(String(user._id));
  const next = String(form.get("next") ?? "");
  // Only ever send people back into the dashboard, never to another site.
  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}
