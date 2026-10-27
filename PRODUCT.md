# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Three audiences use one app:

- **Business owners and managers** of local businesses in Pakistan whose customers choose them on Google Maps: cafés and restaurants, salons, clinics, gyms, shops. Lahore first. They open the dashboard on a phone (often budget Android on 4G) between customers or after closing, for a quick look: did reviews come in, did anyone leave a private complaint, is the plan paid. Only the owner logs in; staff never get accounts (on Pro, each staff member gets their own link instead).
- **Their customers**, who reach the public review page by scanning the counter stand, tapping the NFC card or opening a WhatsApp message. Seconds, one-handed, no app, no login.
- **The Reputra team** (admin), on a laptop, running the business: confirming payments, printing and delivering stands and cards, watching renewals.

## Product Purpose
Reputra is a review-growth system. It asks every happy customer for a Google review at the right moment, so the business's review count and rating climb, it rises on Google Maps, and more people walk in. The one question every screen answers: how many customers did Reputra send to Google for this business, and is it working?

Success for an owner: a steady stream of customers going on to Google, seen at a glance, and nothing to manage. Success for Reputra: owners sign up and pay online without a phone call, and the team can run every account from the admin side.

## Positioning
Reputra sells growth, not hardware. Customers reach one review page three ways: a counter stand (QR plus NFC tap), a tap card, or a WhatsApp message sent one at a time from the business's own number. The page opens without an app and sends them straight to Google's own review box. Built for how Pakistan works: WhatsApp-first, Urdu-first, priced in rupees, paid by Raast, JazzCash, Easypaisa or bank transfer.

## Operating Context
- Sign-up and payment happen online: choose a plan, give a delivery address, pay. The first payment includes the acrylic counter stand and the NFC tap card free; the team prints, delivers and installs them.
- Paying at launch is a transfer (Raast, JazzCash, Easypaisa, bank) with the transaction ID entered in the app: the plan switches on at once and the team confirms the payment afterwards. An online gateway (Safepay, PayFast or similar) plugs in once Reputra has a merchant account; until then it runs in test mode only.
- Plans are prepaid by the month or the year. Renewal is the same checkout. A lapsed plan locks the dashboard after a grace period; the customer review page keeps working.
- Owners do not keep customer lists in Reputra. The stand and card need no contacts; WhatsApp requests are typed or pasted at the moment of sending and are not stored.

## Capabilities and Constraints
- Plans (PKR, monthly): Basic 3,999 · Pro 7,999 · Business 14,999. Yearly = 10 months' price. No free month and no free plan: payment from the start. The setup pack (stand + card) is free with the first payment.
- Plan features beyond Basic (staff links and leaderboard, alerts, monthly WhatsApp report, branches) are planned; gating is per plan.
- Stack: one Next.js 16 app on Vercel (website in `public/`, dashboard, admin, API), MongoDB Atlas through Mongoose.
- Google's rules are product law: the Google button is shown to every customer, no gifts for reviews, no fake reviews, no bulk WhatsApp.
- Not built yet: self-service password reset (the team resets passwords from admin), email or WhatsApp notifications, Urdu review page.

## Brand Commitments
- Name: Reputra. Domain reputra.pk. Logo: a dot and one ripple arc (a tap and the signal it sends).
- Visual world approved on the website (26 Oct 2026): near-black and near-white, one amber accent, Geist. The app shares that palette and face.
- The owner wants award-level, premium, serious-company craft and an extremely easy interface; never toy effects, fake device mockups or stock photos.

## Evidence on Hand
- No customers, testimonials or results exist yet. Never fabricate them. Demo numbers in seeds are labelled sample data.
- Payment account details (Raast ID, JazzCash, Easypaisa, bank IBAN) are placeholders until the owner supplies real ones; they are edited in admin.

## Product Principles
1. A busy owner on a phone understands the screen in five seconds and acts in one tap.
2. Show the result (customers sent to Google), never vanity numbers.
3. Honest before impressive: real zeros, no invented proof, Google-policy honesty.
4. Nothing to manage: no contact lists, no setup chores the team can do for them.
5. Paying is as easy as sending a JazzCash transfer, and it switches the plan on immediately.

## Accessibility & Inclusion
Budget Android on 4G is the norm: light pages, 44px touch targets, 4.5:1 text contrast. English UI first; Urdu and Roman Urdu are first-class on the customer review page.
