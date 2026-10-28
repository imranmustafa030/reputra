# Reputra: the whole project in one file

> **How to use this file.** It is the single place that says what Reputra is, who uses it, how it works, what is built and what is next.
> Want to change something (a price, a plan, a feature, wording, the order of work)? **Change it here first**, then tell Claude: *"apply the changes in PROJECT-GUIDE.md"*. The code then follows this file.
>
> Status marks used everywhere below: ✅ built and working · 🟡 partly built · ⬜ not built yet
>
> Last updated: 27 Oct 2026

---

## 1. What Reputra is, in one breath

Local businesses in Pakistan (cafés, salons, clinics, gyms, shops) lose customers to competitors who have more Google reviews. Happy customers rarely leave a review on their own: they just forget.

Reputra makes asking easy. The customer taps a card or scans a stand at the counter, or gets a WhatsApp message, and lands on one simple page. One more tap opens Google's review box.

**The promise we sell:** more Google reviews → higher on Google Maps → more customers walking in.

**How we earn:** a monthly or yearly plan, paid online from day one (from PKR 3,999 a month). The acrylic counter stand and NFC tap card come **free with the first payment**.

---

## 2. The four sides of Reputra

Reputra is one website with four different "doors". Each person only sees their own door.

| Who | What they use it for | Web address | Status |
|---|---|---|---|
| **Visitor** (a business owner who hasn't signed up yet) | Reads about Reputra, sees prices, signs up and pays online | `reputra.pk` (the home page) → `/signup` → `/checkout` | ✅ built |
| **Customer** (the person who just visited the café or clinic) | Leaves a Google review, or sends the owner a private note | `reputra.pk/t/K7X9Q2` (each item and link has its own code; old `/r/business-name` links redirect) | ✅ built |
| **Business owner** (only the owner logs in; staff don't) | Sees who went on to Google, asks customers on WhatsApp, reads private notes, gets QR and NFC links, pays and renews | `reputra.pk/dashboard` | ✅ built |
| **Reputra team (admin: you)** | Checks payments, delivers stands and cards, sees every business, adds businesses in person, sets prices and payment accounts | `reputra.pk/admin` | ✅ built |

All four live in one project, are deployed together on Vercel, and share one MongoDB database.

---

## 3. The full journey, start to finish

1. **The owner finds us.** They see the website, or we walk in and show it on a phone.
2. **They press "Choose Pro"** (or Basic / Business, or "Get started") on the website.
3. **They create an account** (two minutes): business name, their name, WhatsApp number, email, password.
4. **They pay on the checkout page**, all on one screen:
   - choose the plan, monthly or yearly (yearly = 2 months free);
   - give the address where we bring the stand and card;
   - send the amount by Raast, JazzCash, Easypaisa or bank transfer to the account shown, then paste the **transaction ID (TID)** from the receipt.
   - Their plan **switches on immediately**. The payment shows as "Checking" until we match it.
5. **We match the transfer** in Admin → Payments and press "Received" (or "Reject…" with a reason if it never arrived, which pauses their plan again).
6. **We print and deliver.** Admin → Setup packs moves each stand and card through Ordered → Printing → On the way → Installed. The owner sees the same progress on their dashboard.
7. **The owner adds their Google review link** in Settings (the dashboard reminds them until it's done).
8. **A customer finishes their visit.** Three ways in, one page:
   - they **scan the QR** on the stand, or
   - they **tap their phone** on the card or stand, or
   - the owner **sends a WhatsApp message** from the dashboard (one customer, or a pasted list worked through one tap at a time).
9. **The customer's review page opens** (no app needed): "Review us on Google" or "Tell the owner privately".
10. **The owner sees what happened** on the Overview: customers sent to Google, per day and per way in, and private notes.
11. **Renewing**: 5 days before the paid-until date the dashboard asks them to renew (same checkout, no address needed). After the date they get 7 days of grace; then the dashboard locks until they pay. Their review page at the counter keeps working the whole time.

---

## 4. Side by side: what each one has

### 4.1 Visitor side: the marketing website ✅

| Section | What it does |
|---|---|
| Hero: "More reviews. Higher on Google. More customers." | The promise, on a live map of Gulberg, Lahore. Button: Get started |
| Three ways in. One review page. | Stand, tap card and WhatsApp all lead to one page |
| Here it is. Try it. | The visitor can tap through a real review page |
| People pick the one with more reviews. | Why reviews matter on Google Maps |
| What we will never do. | Google's rules we follow (see section 7) |
| We're new, so here is what we promise. | Founder promise; stand and card free with the first month |
| Your month, at a glance. | What the owner's dashboard shows |
| What one month could add. | Estimate of extra reviews |
| Plans in rupees. | Basic, Pro, Business; each button opens sign-up with that plan |
| Questions owners ask us. | FAQ |
| Your counter is next. | Final "Get started", plus WhatsApp / email / phone for people who'd rather talk first |

The top bar has **Log in** (for existing customers) and **Get started**.

### 4.2 Customer side: the review page ✅

- Opens from the QR code, the NFC tap or the WhatsApp link. No app, no login.
- Shows "Thank you for visiting **[Business name]**", five stars, and the two buttons.
- "Review us on Google" counts the tap, then opens Google's review box.
- "Tell the owner privately" opens a short form: message (required), name and phone (optional, for a reply).
- If the team pauses an account, its review page shows "not found".

To come:
- ⬜ Urdu and Roman Urdu versions of the page (the website promises "in Urdu or English")
- ⬜ The business's logo on the page

### 4.3 Business owner side: the dashboard ✅

| Page | What the owner does there | Status |
|---|---|---|
| Sign up, log in | One account per business; 8 wrong passwords lock the email for 15 minutes | ✅ |
| **Checkout** | Plan, delivery address (first time), payment by transfer + TID; renewals and plan changes | ✅ |
| **Overview** | New accounts: a 4-step setup track (Plan paid → Google link → Stand & card → First customer). Always: customers sent to Google in 30 days, a bar per day, a row per way in (stand, card, WhatsApp), latest private notes, their review link, their plan | ✅ |
| **Ask on WhatsApp** | One customer (name + number), or **paste a list** from Excel or a chat and press "Ask" for each. WhatsApp opens with the message ready, from their own number. Numbers are never saved | ✅ |
| **Your items** | Every printed item with its own code, status and scans in the last 30 days; "Lost it?" switches one item off (its code then shows "This stand no longer works"); delivery progress; the WhatsApp and plain links. No print files or NFC instructions: new items come from the shop | ✅ |
| **Shop** | Counter stand PKR 2,999, tap card 1,299, NFC tap sticker 599, any quantity. A turning 3D preview of each item with the business's name and a "Powered by Reputra" mark. "Your own design: coming soon" with a WhatsApp contact. Pay by transfer + TID; printing starts once the team confirms the transfer | ✅ |
| **Private notes** | Every note with "New" marks and a "Reply on WhatsApp" button | ✅ |
| **Plan & billing** | Plan, paid-until date, switch plan, renew, stand & card status, every payment with its status (Checking / Paid / Not received) | ✅ |
| **Settings** | Business name, type, city, Google review link (with how-to), WhatsApp message with live preview, change password | ✅ |
| **Connect Google** (Settings → Google review link) | Instead of pasting a link: find the business on Google by name, or sign in with Google and pick it. Code is built and tested up to Google's side; shows as "Soon" until switched on (see Later) | 🟡 |
| Alert when a private note arrives (WhatsApp or email) | Website promises this | ⬜ |
| "Before vs after": starting review count → growth | So the owner sees "18 → 64 reviews" | ⬜ |
| **Staff leaderboard** (Pro): each staff member gets their own link | Website lists it in the Pro plan | ⬜ |
| **Branches** (Business plan) | Website lists it in the Business plan | ⬜ |
| Monthly report on WhatsApp (Pro) | | ⬜ |
| Forgot password (self-service, by email) | Today the team resets it from admin | ⬜ |

### 4.4 Admin side: the Reputra team ✅

Only Reputra team accounts can open it. The first admin is created by the seed (see section 6).

| Page | What you do there | Status |
|---|---|---|
| **Overview** | What needs doing today: payments to check, setup packs to deliver, renewals coming up, people who signed up but didn't pay (each with a WhatsApp button). Totals: paying businesses, monthly revenue, collected this month, customers sent to Google | ✅ |
| **Payments** | Match transfers by TID and amount: "Received" or "Reject…" with a reason the owner sees. Plans and shop orders ("Shop · 2 stands, 6 stickers") share the queue; confirming a shop order creates its delivery. Tabs: To check, Paid, Not received, All | ✅ |
| **Setup packs** | Each delivery (the free stand and card, or a shop order) from Ordered to Installed, one button per step, with address and the contact's WhatsApp. **Print files** per delivery: each item's code, the stand's QR file and the address to write into each NFC chip (only the team sees these) | ✅ |
| **Businesses** | Every business, searchable by name, owner, email or phone; tabs: Paying, Due or lapsed, Not paid yet, Paused | ✅ |
| **One business** | Their numbers, payments, stand & card, owner contact, **record a payment** (cash or a transfer they told you about), **reset password**, **pause / turn back on**, a private team note | ✅ |
| **Add business** | Create an owner's login during an in-person visit; the password is shown once to hand over | ✅ |
| **Settings** | Prices for each plan; the Raast / JazzCash / Easypaisa / bank details shown at checkout | ✅ |

---

## 5. Plans and payments

| | Basic | Pro ⭐ | Business |
|---|---|---|---|
| Price a month | PKR 3,999 | PKR 7,999 | PKR 14,999 and up |
| Price a year (2 months free) | PKR 39,990 | PKR 79,990 | PKR 149,990 |
| For | Small salon, single shop | Clinics, restaurants, busy counters with staff | Chains with several branches |
| Review page + QR + NFC + WhatsApp asking | ✅ | ✅ | ✅ |
| Dashboard numbers, private notes | ✅ | ✅ | ✅ |
| Feedback alerts | email ⬜ | WhatsApp ⬜ | WhatsApp ⬜ |
| Staff leaderboard, monthly WhatsApp report | | ⬜ | ⬜ |
| Several branches, a named support person | | | ⬜ |

- **No free month, no free plan.** Paying starts on day one.
- **Free with the first payment:** one acrylic counter stand (QR + tap), one NFC tap card, and setup in person.
- **Paying today:** Raast, JazzCash, Easypaisa or bank transfer with the transaction ID. The plan switches on at once; we confirm the money afterwards. The same TID can't be used twice.
- **Paying by card or wallet online:** built and tested in test mode. It goes live once Reputra has a merchant account with a gateway (Safepay, PayFast or JazzCash). Opening one is free, they take about 2.5–3% of each payment, and they ask for an NTN and a business bank account.
- **Nothing renews by itself.** Stopping is simply not paying the next period; the stand and card stay with them.
- Prices can be changed in Admin → Settings without touching code. Paid periods never change.
- 🟡 Every plan currently gets every built feature. Locking Pro and Business features comes with those features (section 8, step 3).

---

## 6. Where we are now

| Part | Status |
|---|---|
| Website | ✅ done, buttons go to online sign-up (dummy content still to replace, section 9) |
| Sign-up, checkout and payments by transfer | ✅ done |
| Owner dashboard | ✅ done |
| Admin side | ✅ done |
| Database design (10 collections, see README) and the seed | ✅ done |
| Code on GitHub: `github.com/imranmustafa030/reputra` (private) | ✅ (this round not pushed yet) |
| Database (MongoDB Atlas) | 🟡 cluster created; production needs the seed run once |
| Live on the internet (Vercel) | ⬜ |
| Domain `reputra.pk` | ⬜ to buy |
| Real payment account numbers in Admin → Settings | ⬜ placeholders today |
| Online card / wallet gateway | ⬜ needs a merchant account |

**Preparing a database (the seed):** one command creates the indexes, the price list, placeholder payment accounts and your admin login. It never overwrites prices or accounts you've edited. Steps are in `README.md` → Go live.

---

## 7. Rules we never break (Google's review rules)

1. **Every customer sees the Google button**, happy or not. We never hide it from unhappy customers.
2. **No gifts or discounts for reviews.** Not once, not as a "thank you".
3. **No fake or bought reviews.** Every review comes from a real visit.
4. **No bulk WhatsApp.** One message at a time, from the business's own number, to customers who actually visited. (The pasted list still opens WhatsApp one customer per tap.)

---

## 8. Plan of work (in order)

### Step 1: Go live ⬜
- [ ] Run the seed on the production database and log in as admin
- [ ] Put the real Raast / JazzCash / Easypaisa / bank details in Admin → Settings
- [ ] Connect the GitHub repo to Vercel and add the secret settings
- [ ] Buy `reputra.pk`, connect it to Vercel, set it as the official address (`SITE_URL`)
- [ ] Replace the dummy content on the website (section 9)

### Step 2: Admin side, plans and payments ✅
- [x] Admin login, overview, businesses, one business, add business
- [x] Payments: transfer + TID, check and confirm, reject with reason, record cash
- [x] Setup pack tracking
- [x] Renewal reminders, grace period, lock, pause
- [x] Limits on wrong passwords and payment attempts; change password; admin password reset
- [ ] Self-service forgot password (needs an email service)

### Step 3: Finish what the website promises ⬜
- [ ] Urdu and Roman Urdu review page
- [ ] Alert to the owner when a private note arrives
- [ ] Staff links and leaderboard (Pro), and plans unlocking features
- [ ] "Before vs after" review growth
- [ ] Business logo on the review page

### Step 4: Keep them paying ⬜
- [ ] Monthly WhatsApp report ("You got 47 new reviews this month")
- [ ] Several branches under one owner (Business)
- [ ] Online card / wallet gateway (once the merchant account is approved)

### Later (after the first 10 paying businesses)
- **Switch on Connect Google.** The code is done; it turns on by itself when its keys are in `.env.local` / Vercel (see `.env.example`). Google Cloud project: "Reputra" (reputra-513008) on the personal Gmail.
  - *Find on Google*: needs billing on that project. Google asks a one-time, refundable US$30 prepayment for our card. Then enable Places API (New), create a key limited to it, set `GOOGLE_MAPS_API_KEY`, and add a daily quota cap in Google Cloud. Reputra already caps itself at 300 lookups a day, inside Google's free allowance.
  - *Sign in with Google*: the OAuth client exists (keys kept, commented out, in `.env.local`). Still needed: Google's approval of Business Profile API access (form at support.google.com/business/workflow/16726127; the applying account must manage a verified profile 60+ days old), then add the production redirect URL `https://<domain>/api/google/callback` to the client, and publish the consent screen.
- Automatic reminders after 2–3 days (official WhatsApp Business API, costs money)
- Show live Google reviews and reply to them from the dashboard
- Selling abroad in USD

---

## 9. Before launch: content to replace

The website still has sample content. The full checklist with IDs D01–D41 is in `website/TO-CHANGE.md` (its "where" column is out of date: everything now lives in `reputra/public/index.html`, except the WhatsApp number).

Most important first:
- **D01 WhatsApp number:** today `923000000000`, on the website (`public/site.js`) and in the app (`src/lib/contact.ts`).
- **Payment accounts:** placeholders until you edit them in Admin → Settings.
- **Founder name:** "[Your name]" in the promise section.
- **Prices**, if they change: Admin → Settings for the app, `public/index.html` for the website.

---

## 10. Where to change things yourself

If you'd rather not touch code, just edit sections 1–9 of this file and ask Claude to apply them.

| I want to change… | Where it lives |
|---|---|
| Prices | Admin → Settings (app), and `public/index.html` (website text) |
| Where owners send money (Raast ID, wallet numbers, IBAN) | Admin → Settings |
| Any website text, headline, FAQ | `public/index.html` (search for the words you see on the page) |
| Our WhatsApp number | `public/site.js` (`const WA = …`) and `src/lib/contact.ts` |
| Website colours and spacing | `public/site.css` |
| Wording on the customer review page | `src/app/r/[slug]/page.tsx`, `src/app/r/[slug]/private-feedback.tsx` |
| The default WhatsApp message for new businesses | `src/models/Business.ts` (each owner can change their own in Settings) |
| Plan features listed at checkout | `src/lib/plans.ts` (then run the seed on a fresh database, or edit in the database) |
| Menu names (dashboard and admin) | `src/components/app-nav.tsx` |
| Status words (Checking, Paid, Printing…) | `src/lib/labels.ts` |
| Grace days before the dashboard locks, reminder days | `src/lib/plans.ts` (`GRACE_DAYS`, `REMIND_DAYS`) |
| App colours | `src/app/globals.css` |
| Secret settings (database, login key, domain) | Vercel → Project → Settings → Environment Variables (never in the code) |

After any change: save, push to GitHub, and Vercel puts it live in about a minute.

---

## 11. Words you'll see

| Word | Meaning |
|---|---|
| **Vercel** | The company that runs our site on the internet. One "deployment" puts the website, dashboard, admin and backend live together. |
| **MongoDB / Atlas** | Where accounts, businesses, payments, visits and notes are stored. Atlas is MongoDB's online service; the free tier holds 512 MB. |
| **Seed** | A one-time setup command that prepares an empty database (prices, payment accounts, the first admin). |
| **TID** | Transaction ID: the number on a bank or wallet receipt. We use it to match a transfer to a payment. |
| **Gateway** | A company (Safepay, PayFast, JazzCash) that lets people pay by card or wallet on a web page. Free to open, a small cut per payment. |
| **Setup pack** | A delivery of printed items: the free stand and card sent with the first payment, or an order from the shop. |
| **Code** | Six characters like `K7X9Q2` in `reputra.pk/t/K7X9Q2`. Every printed item has its own, plus one for WhatsApp and one plain link per business. It doesn't show the business name, counts scans per item, and can be switched off on its own. A stand's NFC chip adds `?s=nfc` so scans and taps count apart. |
| **Slug** | The business's short internal name, e.g. `smile-dental-clinic`. No longer printed anywhere; old `reputra.pk/r/smile-dental-clinic` links redirect to the business's code. |
| **QR** | The square code customers scan with their camera. |
| **NFC** | The "tap" chip in the card and stand. The phone opens the link when held near it. |
| **Admin** | The Reputra team's side of the system. |
