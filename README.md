# Reputra

One project, one Vercel deployment: the marketing website, sign-up and checkout, the owner dashboard, the admin side, the customer review pages and the backend API.

For what the product does and where it's heading, in plain words, read [PROJECT-GUIDE.md](PROJECT-GUIDE.md).

| URL | What it is | Code |
|---|---|---|
| `/` | Marketing website (plain HTML, served exactly as written) | `public/index.html`, `public/site.css`, `public/site.js`, `public/card3d.js`, `public/img/` |
| `/signup?plan=…`, `/login` | Owner accounts. The website's plan buttons land on sign-up with the plan chosen | `src/app/signup`, `src/app/login` |
| `/checkout` | Choose plan, give the delivery address (first payment), pay. Also used for renewals | `src/app/checkout` |
| `/dashboard/…` | Owner dashboard: overview, Ask on WhatsApp, stand & card, private notes, plan & billing, settings | `src/app/dashboard` |
| `/admin/…` | Reputra team: overview, payments to check, setup packs, businesses, settings (prices, payment accounts) | `src/app/admin` |
| `/r/<slug>` | The page customers reach from the counter stand (`?s=qr`), tap card (`?s=nfc`) or WhatsApp (`?s=wa`) | `src/app/r/[slug]` |
| `/r/<slug>/go` | Counts the tap, then sends the customer to the Google review form | `src/app/r/[slug]/go/route.ts` |
| `/api/health` | Is the app up and is MongoDB reachable? | `src/app/api/health/route.ts` |
| `/api/events` | The review page reports a visit | `src/app/api/events/route.ts` |

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, MongoDB through Mongoose, encrypted cookie sessions (iron-session), bcrypt passwords, lucide icons.

## The database

Every collection has one model file in `src/models/`:

| Model | One document is… | Key fields |
|---|---|---|
| `User` | a login: an owner or a Reputra admin | `email` (unique), `role` owner/admin, `status`, `sessionVersion` (bumped on password reset, signs out other devices) |
| `Business` | one business, one per owner | `owner` (unique), `slug` (the review page address, never changes), `googleReviewUrl`, `whatsappMessage`, `status` active/suspended |
| `Plan` | a price list entry | `code` basic/pro/business, `monthlyPrice`, `yearlyPrice` (whole rupees), `features` |
| `Subscription` | a business's plan, created by its first payment | `business` (unique), `plan`, `interval`, `currentPeriodEnd` (paid until) |
| `Payment` | one payment | `reference` (RP-XXXXXX receipt), `method`, `transactionId` (unique per method), `status` pending/submitted/confirmed/rejected/failed, `periodStart`/`periodEnd` (the time it bought), `delivery` (first payment) |
| `SetupPack` | the free stand and card sent with the first payment | `status` new → printing → on_the_way → installed, `history` |
| `PaymentAccount` | where owners send transfers (Raast, JazzCash, Easypaisa, bank) | `method` (unique), `accountTitle`, `accountNumber`, `iban`, `active` |
| `Event` | one visit, Google click, WhatsApp request or note | `business`, `type`, `source` qr/nfc/wa/direct, `at` |
| `Feedback` | a private note from a customer | `message`, optional `name`/`phone`, `read` |
| `RateLimit` | a counter for login and payment attempts | deleted automatically when its window ends (TTL index) |

Customers' phone numbers are never stored: WhatsApp requests are typed or pasted at the moment of sending, and only the count is recorded.

## How paying works

- Plans are prepaid. Every payment adds one month or one year after the current paid-until date (`src/lib/billing.ts`).
- **Transfer** (Raast, JazzCash, Easypaisa, bank): the owner sends the money, enters the transaction ID, and the plan switches on at once with the payment marked "Checking". An admin then marks it Received, or Not received, which takes back exactly the time it added. The same transaction ID can't be used twice.
- **First payment** creates the setup pack (free stand and card) from the delivery address given at checkout.
- **Online gateway** (card or wallet): `src/lib/gateway.ts` holds the interface. `PAYMENT_GATEWAY=test` shows a pretend gateway for trying the flow; it's refused in production unless `ALLOW_TEST_PAYMENTS=1`. To add Safepay, PayFast or JazzCash once Reputra has a merchant account, follow the three steps at the top of that file.
- **After the paid-until date**: 5 days before it, the dashboard asks to renew; after it, 7 days of grace; then the dashboard locks to Plan & billing. The customer review page keeps working. An admin can pause an account, which also switches its review page off.

## Where things go when you add code

```
public/              the website: edit these files directly, nothing compiles them
scripts/seed.ts      prepares a database: indexes, prices, payment accounts, the first admin
src/
  app/
    actions/         server actions (form submits): auth, business, checkout, admin, feedback
    api/             JSON endpoints (route.ts files)
    admin/           one folder per admin page
    checkout/        plan, delivery and payment; done; the test gateway
    dashboard/       one folder per dashboard page
    r/[slug]/        the public review page
  components/        shared UI: app shell and nav, page header, tabs, chart, forms, copy button
  lib/
    db.ts            the MongoDB connection (call `await db()` before a query)
    auth.ts          requireOwner / requirePaidOwner / requireAdmin: use one in every page and action
    billing.ts       prices, access (paid until, grace, locked), payments in and out
    gateway.ts       online payment providers
    admin.ts         admin lists and totals
    stats.ts         dashboard numbers
    labels.ts        the words shown for stored values (plan names, statuses, dates)
    plans.ts         the starting price list and period maths
    rate-limit.ts    login and payment attempt limits
  models/            Mongoose models (table above)
  proxy.ts           sends logged-out visitors from /dashboard, /checkout and /admin to /login
```

Rules that keep it safe:
- Every dashboard page and owner action starts with `await requirePaidOwner()` (or `requireOwner()` for checkout and billing) and only queries with the `business.id` it returns. Every admin page and action starts with `await requireAdmin()`. Never trust an id sent from the browser for ownership.
- Prices always come from the database on the server; the checkout form never sends an amount.
- With Cache Components on, anything that reads cookies or the database must sit inside a `<Suspense>` boundary (`loading.tsx` does it for dashboard and admin pages). `next build` tells you if one is missing.
- The review page always shows both "Review us on Google" and "Tell the owner privately". Google's policy forbids showing the Google button only to happy customers.

## Run it on your computer

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run seed -- --demo         # prices, payment accounts, your admin login, and a demo café
npm run dev                    # http://localhost:3000
```

The demo café logs in as `demo@reputra.pk` / `demo-password`. Your admin login is the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`.

For a local database without Atlas (Docker):

```bash
docker start reputra-mongo || docker run -d --name reputra-mongo -p 127.0.0.1:27017:27017 mongo:7
# .env.local → MONGODB_URI=mongodb://127.0.0.1:27017/reputra
```

`npm run build` runs the same build Vercel runs; `npm run typecheck` and `npm run lint` check the code. Run them before you push.

## Go live (one time)

### 1. MongoDB Atlas (free M0 cluster, 512 MB)
1. Create a free account at https://www.mongodb.com/cloud/atlas and create an **M0 Free** cluster.
2. **Database Access** → add a database user with a long random password.
3. **Network Access** → add `0.0.0.0/0`. Vercel's servers don't have fixed IP addresses, so Atlas has to accept any address; the username and password still protect it.
4. **Connect → Drivers** → copy the connection string. Put `/reputra` before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/reputra?retryWrites=true&w=majority`
5. Prepare the production database once, from your computer:
   ```bash
   MONGODB_URI="<production string>" ADMIN_EMAIL=you@reputra.pk ADMIN_PASSWORD="<long password>" npx tsx scripts/seed.ts
   ```
   Then log in at `/login` with that email and replace the placeholder payment accounts in **Admin → Settings**.

### 2. Vercel
1. On https://vercel.com → **Add New → Project** → import the GitHub repository. Vercel detects Next.js; leave the build settings as they are.
2. Add **Environment Variables** (all environments):
   - `MONGODB_URI`: the Atlas string from above
   - `SESSION_SECRET`: generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `SITE_URL` (once you have your domain): e.g. `https://reputra.pk`. It is the address printed on QR codes and sent on WhatsApp.
   - Leave `PAYMENT_GATEWAY` unset until a real gateway is added.
3. Deploy. Open `https://<your-project>.vercel.app/api/health`: it should say `{"ok":true,"database":"connected"}`.
4. Pick the Vercel **Function Region** under Project → Settings → Functions to match the Atlas region.

From then on every `git push` deploys the website, dashboard, admin and backend together.

Set `SITE_URL` before printing stands or NFC cards, so they point at your final domain and never change.
