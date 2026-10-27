// Prepares a database: indexes, the price list, payment accounts and the first admin.
// Safe to run again: it never overwrites prices, accounts or passwords edited since.
//
//   npm run seed                         uses .env.local
//   npm run seed -- --demo               also adds a demo café with 30 days of sample visits
//   npm run seed -- --reset-admin-password
//
// Needs MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD (ADMIN_NAME optional) in the environment.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { DEFAULT_PLANS, yearlyFromMonthly, addInterval } from "../src/lib/plans";
import { User } from "../src/models/User";
import { Business } from "../src/models/Business";
import { Plan } from "../src/models/Plan";
import { Subscription } from "../src/models/Subscription";
import { Payment } from "../src/models/Payment";
import { PaymentAccount } from "../src/models/PaymentAccount";
import { SetupPack } from "../src/models/SetupPack";
import { Event, type Source } from "../src/models/Event";
import { Feedback } from "../src/models/Feedback";
import { RateLimit } from "../src/models/RateLimit";

const args = new Set(process.argv.slice(2));

function need(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ ${name} is not set. Add it to .env.local (see .env.example).`);
    process.exit(1);
  }
  return value;
}

async function main() {
  await mongoose.connect(need("MONGODB_URI"), { serverSelectionTimeoutMS: 8000 });
  console.log(`→ Connected to ${mongoose.connection.name}`);

  for (const m of [User, Business, Plan, Subscription, Payment, PaymentAccount, SetupPack, Event, Feedback, RateLimit]) {
    await (m as mongoose.Model<unknown>).syncIndexes();
  }
  console.log("✓ Indexes in place");

  for (const [i, p] of DEFAULT_PLANS.entries()) {
    await Plan.updateOne(
      { code: p.code },
      {
        $setOnInsert: {
          code: p.code,
          name: p.name,
          tagline: p.tagline,
          monthlyPrice: p.monthlyPrice,
          yearlyPrice: yearlyFromMonthly(p.monthlyPrice),
          features: p.features,
          popular: Boolean(p.popular),
          sortOrder: i,
        },
      },
      { upsert: true },
    );
  }
  console.log(`✓ Plans: ${DEFAULT_PLANS.map((p) => p.name).join(", ")}`);

  // Placeholders: replace them in Admin → Settings before taking real payments.
  const accounts: { method: "raast" | "jazzcash" | "easypaisa" | "bank"; accountTitle: string; accountNumber: string; bankName?: string; iban?: string; sortOrder: number; placeholder: true }[] = [
    { method: "raast", accountTitle: "Reputra", accountNumber: "0300 0000000", sortOrder: 0, placeholder: true },
    { method: "jazzcash", accountTitle: "Reputra", accountNumber: "0300 0000000", sortOrder: 1, placeholder: true },
    { method: "easypaisa", accountTitle: "Reputra", accountNumber: "0345 0000000", sortOrder: 2, placeholder: true },
    { method: "bank", accountTitle: "Reputra", accountNumber: "0000 0000000000", bankName: "Meezan Bank", iban: "PK00MEZN0000000000000000", sortOrder: 3, placeholder: true },
  ];
  for (const a of accounts) await PaymentAccount.updateOne({ method: a.method }, { $setOnInsert: a }, { upsert: true });
  console.log("✓ Payment accounts (placeholders: checkout hides them until you save real details in Admin → Settings)");

  const email = need("ADMIN_EMAIL").trim().toLowerCase();
  const password = need("ADMIN_PASSWORD");
  if (password.length < 10) {
    console.error("✗ ADMIN_PASSWORD must be at least 10 characters.");
    process.exit(1);
  }
  const existing = await User.findOne({ email });
  if (!existing) {
    await User.create({ name: process.env.ADMIN_NAME || "Reputra admin", email, role: "admin", passwordHash: await bcrypt.hash(password, 12) });
    console.log(`✓ Admin created: ${email}`);
  } else {
    const update: Record<string, unknown> = { role: "admin", status: "active" };
    if (args.has("--reset-admin-password")) {
      update.passwordHash = await bcrypt.hash(password, 12);
      update.sessionVersion = existing.sessionVersion + 1;
    }
    await User.updateOne({ _id: existing._id }, { $set: update });
    console.log(`✓ Admin exists: ${email}${args.has("--reset-admin-password") ? " (password reset)" : ""}`);
  }

  if (args.has("--demo")) await seedDemo();

  await mongoose.disconnect();
  console.log("Done.");
}

// A paid demo café with believable traffic, for trying the dashboard. Clearly named as a demo.
async function seedDemo() {
  const email = "demo@reputra.pk";
  if (await User.exists({ email })) {
    console.log("✓ Demo account already there: demo@reputra.pk / demo-password");
    return;
  }
  const owner = await User.create({
    name: "Demo owner",
    email,
    phone: "923000000000",
    passwordHash: await bcrypt.hash("demo-password", 10),
  });
  const business = await Business.create({
    owner: owner._id,
    name: "Demo Café",
    slug: "demo-cafe",
    category: "cafe",
    city: "Lahore",
    googleReviewUrl: "https://g.page/r/demo-cafe/review",
    demo: true,
  });

  const paidAt = new Date(Date.now() - 24 * 86_400_000);
  const payment = await Payment.create({
    business: business._id,
    reference: "RP-DEMO01",
    plan: "pro",
    interval: "month",
    amount: 7999,
    method: "jazzcash",
    status: "confirmed",
    transactionId: "DEMO000001",
    firstPayment: true,
    applied: true,
    periodStart: paidAt,
    periodEnd: addInterval(paidAt, "month"),
    delivery: { contactName: "Demo owner", contactPhone: "923000000000", address: "Main Boulevard, Gulberg III", city: "Lahore" },
    createdAt: paidAt,
  });
  await Subscription.create({
    business: business._id,
    plan: "pro",
    interval: "month",
    currentPeriodStart: paidAt,
    currentPeriodEnd: addInterval(paidAt, "month"),
  });
  await SetupPack.create({
    business: business._id,
    payment: payment._id,
    contactName: "Demo owner",
    contactPhone: "923000000000",
    address: "Main Boulevard, Gulberg III",
    city: "Lahore",
    status: "installed",
    history: [
      { status: "new", at: paidAt },
      { status: "printing", at: new Date(paidAt.getTime() + 86_400_000) },
      { status: "on_the_way", at: new Date(paidAt.getTime() + 3 * 86_400_000) },
      { status: "installed", at: new Date(paidAt.getTime() + 4 * 86_400_000) },
    ],
  });

  // Traffic grows after the stand is installed (day 20 before today). Deterministic, so screenshots repeat.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const events: { business: unknown; type: string; source: Source; at: Date }[] = [];
  for (let daysAgo = 23; daysAgo >= 0; daysAgo--) {
    const installed = daysAgo <= 20;
    const perSource: [Source, number][] = [
      ["qr", installed ? 3 + Math.floor(rand() * 5) : 0],
      ["nfc", installed ? 1 + Math.floor(rand() * 3) : 0],
      ["wa", 1 + Math.floor(rand() * 3)],
    ];
    for (const [source, visits] of perSource) {
      for (let i = 0; i < visits; i++) {
        const at = new Date(Date.now() - daysAgo * 86_400_000 - Math.floor(rand() * 10) * 3_600_000);
        events.push({ business: business._id, type: "visit", source, at });
        if (rand() < 0.47) events.push({ business: business._id, type: "google_click", source, at: new Date(at.getTime() + 40_000) });
      }
    }
    const sent = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < sent; i++) {
      events.push({ business: business._id, type: "whatsapp_sent", source: "wa", at: new Date(Date.now() - daysAgo * 86_400_000 - i * 3_600_000) });
    }
  }
  await Event.insertMany(events);
  await Feedback.insertMany([
    { business: business._id, message: "Chai thandi thi aaj, warna sab acha tha.", source: "qr", createdAt: new Date(Date.now() - 2 * 3_600_000) },
    { business: business._id, message: "Parking dhoondna mushkil hai, koi sign laga dein.", name: "Usman", phone: "03001234567", source: "wa", createdAt: new Date(Date.now() - 30 * 3_600_000), read: true },
  ]);
  console.log(`✓ Demo café: demo@reputra.pk / demo-password (${events.length} sample events)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
