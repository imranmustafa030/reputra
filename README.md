# Reputra

One project, one Vercel deployment: the marketing website, the owner dashboard, the customer review pages and the backend API.

| URL | What it is | Code |
|---|---|---|
| `/` | Marketing website (plain HTML, served exactly as written) | `public/index.html`, `public/site.css`, `public/site.js`, `public/card3d.js`, `public/img/` |
| `/signup`, `/login` | Owner accounts | `src/app/signup`, `src/app/login` |
| `/dashboard/…` | Owner dashboard: overview, WhatsApp sender, stand/card/links + QR, private notes, settings | `src/app/dashboard` |
| `/r/<slug>` | The page customers reach from the counter stand (`?s=qr`), tap card (`?s=nfc`) or WhatsApp (`?s=wa`) | `src/app/r/[slug]` |
| `/r/<slug>/go` | Counts the tap, then sends the customer to the Google review form | `src/app/r/[slug]/go/route.ts` |
| `/api/health` | Is the app up and is MongoDB reachable? | `src/app/api/health/route.ts` |
| `/api/events` | The review page reports a visit | `src/app/api/events/route.ts` |

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4, MongoDB through Mongoose, encrypted cookie sessions (iron-session), bcrypt passwords.

## Where things go when you add code

```
public/              the website: edit these files directly, nothing compiles them
src/
  app/
    actions/         server actions (form submits): auth.ts, business.ts, feedback.ts
    api/             JSON endpoints (route.ts files)
    dashboard/       one folder per dashboard page
    r/[slug]/        the public review page
  components/        shared UI (brand, form buttons, copy button, page header)
  lib/
    db.ts            the MongoDB connection (call `await db()` before a query)
    auth.ts          requireOwner(): the logged-in owner and their business; use it in every dashboard page and action
    session.ts       login cookie
    stats.ts         dashboard numbers
  models/            Mongoose models: User, Business, Event, Feedback
  proxy.ts           sends logged-out visitors from /dashboard to /login
```

Rules that keep it safe:
- Every dashboard page and server action starts with `await requireOwner()` and only queries with the `business.id` it returns. Never trust an id sent from the browser.
- With Cache Components on, anything that reads cookies or the database must sit inside a `<Suspense>` boundary (each dashboard page already does, through `dashboard/loading.tsx`). `next build` tells you if one is missing.
- The review page always shows both “Review us on Google” and “Tell the owner privately”. Google's policy forbids showing the Google button only to happy customers.

## Run it on your computer

```bash
npm install
cp .env.example .env.local     # then fill in the values
npm run dev                    # http://localhost:3000
```

For a local database without Atlas (Docker):

```bash
docker start reputra-mongo || docker run -d --name reputra-mongo -p 127.0.0.1:27017:27017 mongo:7
# .env.local → MONGODB_URI=mongodb://127.0.0.1:27017/reputra
```

`npm run build` runs the same build Vercel runs; run it before you push.

## Go live (one time)

### 1. MongoDB Atlas (free M0 cluster, 512 MB)
1. Create a free account at https://www.mongodb.com/cloud/atlas and create an **M0 Free** cluster. Pick the region closest to your Vercel region (Mumbai `ap-south-1` is the closest to Pakistan).
2. **Database Access** → add a database user with a password (letters and numbers only keeps the URL simple).
3. **Network Access** → add `0.0.0.0/0`. Vercel's servers don't have fixed IP addresses, so Atlas has to accept any address; the username and password still protect it.
4. **Connect → Drivers** → copy the connection string. Put `/reputra` before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/reputra?retryWrites=true&w=majority`

### 2. Vercel
1. Push this folder to a GitHub repository (this folder is the repository root).
2. On https://vercel.com → **Add New → Project** → import the repository. Vercel detects Next.js; leave the build settings as they are.
3. Before deploying, add **Environment Variables** (all environments):
   - `MONGODB_URI`: the Atlas string from above
   - `SESSION_SECRET`: generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `SITE_URL` (optional, once you have your domain): e.g. `https://reputra.pk`. It is the address printed on QR codes and sent on WhatsApp.
4. Deploy. Open `https://<your-project>.vercel.app/api/health`: it should say `{"ok":true,"database":"connected"}`.
5. Pick the Vercel **Function Region** under Project → Settings → Functions to match the Atlas region (e.g. `bom1` Mumbai).

From then on every `git push` deploys the website, dashboard and backend together.

Set `SITE_URL` before printing stands or NFC cards, so they point at your final domain and never change.
