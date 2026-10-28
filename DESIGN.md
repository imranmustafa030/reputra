---
name: Reputra app
description: Working screens for Reputra (owner dashboard, checkout, admin, sign-up), built in the website's world of ink, paper and one amber.
colors:
  ink: "oklch(14.5% 0.004 265)"
  ink-3: "oklch(32% 0.006 265)"
  paper: "oklch(99.4% 0.001 265)"
  frame: "oklch(96.6% 0.0035 85)"
  sheet: "#ffffff"
  edge: "oklch(91.8% 0.004 85)"
  rule: "oklch(95.2% 0.003 85)"
  control: "oklch(86% 0.005 85)"
  hover: "oklch(94.2% 0.005 85)"
  active: "oklch(92.6% 0.006 85)"
  muted: "oklch(47% 0.006 265)"
  faint: "oklch(54% 0.006 265)"
  amber: "oklch(81% 0.165 76)"
  amber-ink: "oklch(52% 0.13 62)"
  amber-wash: "oklch(96.5% 0.04 85)"
  positive: "oklch(50% 0.11 155)"
  positive-wash: "oklch(96% 0.04 155)"
  negative: "oklch(53% 0.2 27)"
  negative-wash: "oklch(96% 0.025 27)"
  notice-wash: "oklch(97.6% 0.035 92)"
  notice-ink: "oklch(42% 0.1 60)"
typography:
  title:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "40px"
    letterSpacing: "-0.02em"
  section:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "22px"
  body:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  meta:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  id:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  chip: "999px"
  control: "10px"
  card: "14px"
  sheet: "16px"
spacing:
  gap: "16px"
  card-pad: "20px"
  page-pad: "32px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.chip}"
    height: "44px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.ink-3}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    height: "36px"
    padding: "0 14px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "10px 14px"
  card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.card}"
    padding: "20px"
  pill-positive:
    backgroundColor: "{colors.positive-wash}"
    textColor: "oklch(30% 0.07 155)"
    rounded: "{rounded.chip}"
    height: "22px"
  pill-notice:
    backgroundColor: "{colors.notice-wash}"
    textColor: "{colors.notice-ink}"
    rounded: "{rounded.chip}"
    height: "22px"
  nav-item-active:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "8px"
    height: "36px"
---

# Design System: Reputra app

The website (`public/`, documented in `../website/DESIGN.md`) persuades. These are the screens people work in: the owner's dashboard, checkout, sign-up and login, and the team's admin side. They share the website's ink, paper, amber and Geist, and trade its drama for calm. Tokens live in `src/app/globals.css` (`@theme`), component classes in the same file.

## Overview

**North star: the counter ledger.** An owner glances between customers. The team checks payments over a cup of tea. Both need the screen to answer one question in five seconds and offer the one action that follows. A warm stone frame holds a white sheet; on the sheet, ink does the talking and amber appears only where a customer went to Google or a step is in hand.

Key characteristics:
- One tinted L-frame (sidebar + 48px top bar, no rule between them) around a white sheet inset 8px from the window's right and bottom edges, 16px radius, 1px edge, no shadow. On phones the frame folds into a 56px top bar and a full-screen menu.
- Colour on data, not chrome: under 3% of pixels carry hue.
- Figures are type, not tiles: label above value, tabular figures, no icons in circles, no sparklines.
- Honest data: zeros print as 0, missing values as a grey dash, demo accounts say so.

## Colors

### Primary
- **Ink** (`ink`): text, the near-black primary button, the selected tab underline, focus ring.

### Accent
- **Review-star amber** (`amber`): the daily bars of customers sent to Google, the underline on the step in hand, "New" marks (as `amber-wash` with `amber-ink` text). Never a button fill on working screens, never a badge of praise.

### Neutral
- **Frame** (`frame`): the warm stone L around the sheet and wells inside cards.
- **Sheet** (white), **edge** (card and sheet borders), **rule** (row rules, one step lighter), **control** (input and button borders, one step darker).
- **Hover** and **active**: two quiet tone steps (hover rows, count chips, avatars). The selected nav row is not a tone step: it is white, like the sheet.
- **Muted** (6:1 on white) for secondary text; **faint** for placeholders and meta (≥4.5:1).

### Status
Pale wash with dark text of the same hue: positive (Paid, Done, Installed), notice (Checking, Renews soon, Payment due), negative (Not received, Lapsed, Paused).

### Named rules
**The One Hue Rule.** Amber marks the result (Google) and the step in hand. Everything else is ink and stone.
**The Status-Is-Wash Rule.** Status pills are pale washes with dark text; saturated fills with white text are not used.

## Typography

One family, Geist, for everything; Geist Mono only for identifiers (receipt numbers, TIDs, links, template tokens).

### Hierarchy
- **Title** 24/32 at 600: the page noun ("Overview", "Payments"). Never a greeting.
- **Figure** 32/40 at 600: the one answer figure (customers sent to Google). Sibling figures 20–24px.
- **Section** 15/22 at 600: headings that sit outside their card, 8px above it.
- **Body** 14/20 (forms and lists 15–16px); **meta** 12/16 in muted.
- Checkout and done pages run one step larger (28px title, 18px section legends) because they are read once, not worked in.

- **The customer review page** is the one expressive surface (customers see it once, on a phone): the business name at 40px (35px in Urdu, set in Noto Nastaliq Urdu at a 1.6 line height), body 17–18px, buttons 17px at 56px tall.

### Named rules
**The Tabular Rule.** Every figure in a table, a KPI or a total uses tabular numerals and right alignment.

## Layout

- Sidebar 232px; content max 1240px with 32px side padding on desktop, 16px on phones.
- Two-column screens use `minmax(0,1fr) 360px`: the answer on the left, the rail (notes, plan, link) on the right. Every grid column is `minmax(0,1fr)` so wide tables scroll inside their card instead of widening the page.
- One gap: 16px between cards, 24px between rail sections, 32px between page sections.
- Settings and admin settings use rows: a 300–340px label column beside the fields.
- Below 640px, admin tables become stacked rows (identity and amount on line one, detail on line two, the action at full width).

## Elevation & Depth

Flat. Separation is a 1px edge or one tone step. The only shadows: the 1px lift of the selected segment in a segmented control and of the selected sidebar row, and inset 2px underlines used as markers (the step in hand, the selected plan's 1px ink ring). Overlays (the phone menu) are opaque full-screen sheets.

## Shapes

Pills for every button, chip and segmented control (999px). Inputs 10px. Cards 14px. The sheet 16px. Nav rows 8px.

## Components

### Buttons
- **Primary**: near-black pill, white label, 44px (36px `btn-sm` on desktop, 44px on phones). One per screen, in the title row.
- **Secondary**: white pill with a control-colour border; every row action (Received, Reject…, Mark printing, Copy).
- **Danger**: white pill, negative text; only for Pause account and Reject.
- **Gold** is reserved for the customer review page and the website.

### Pills
22px, pale wash, 12px/500. One status mark per row.

### Cards / containers
`panel`: white, 1px edge, 14px radius, 20–24px padding, no shadow. `well`: frame-coloured inner area (payment details, price rows). Never a card inside a card.

### Inputs
44px, 10px radius, control border, ink border and soft ring on focus, label above at 14/500, hint below in muted. A read-only link joins its Copy button with square inner corners.

### Navigation
The sidebar opens with the account: an ink monogram tile (two initials, 40px, 10px radius), the name at 15/600 and one muted meta line, straight on the frame with no box. Then labelled rows with 16px outline icons (lucide, 1.75 stroke, muted; ink-3 labels); the selected row is a piece of the white sheet (`.nav-selected`: sheet fill, 1px edge, 1px lift) with ink text and a 2px-stroke ink icon, and it slides between rows; a count appears only on a queue that needs action (unread notes, payments to check, packs to deliver). Underline tabs (2px ink) filter lists, each tab its own URL.

### Step track (signature)
A row of 2–4 cells in one panel, each saying where it stands: green check + "Done", amber "Now" with a 2px inset amber underline, or a muted number + "Next". Used for setup (paid → Google link → stand & card → first customer) and for the stand & card's delivery (ordered → printing → on the way → installed). `src/components/step-track.tsx`.

### Daily bars (signature)
30 square-topped amber columns on a zero baseline, 4 faint gridlines on round steps, y scale at left, 5 date labels with "Today" at the end. An empty month draws the baseline and one sentence. `src/components/daily-bars.tsx`.

### Motion
One vocabulary in `globals.css`: expo-out (`cubic-bezier(.16,1,.3,1)`) for arrivals, quint-out for small moves, nothing bounces, exits faster than entrances. Every hidden starting state sits inside `prefers-reduced-motion: no-preference`, so reduced motion shows the finished frame.
- **Feedback** (100–300ms): button press, spinner in pending buttons, form messages that rise in (success) or shake (error), copy and status ticks that pop.
- **Continuity** (300–500ms): pages ease in (`template.tsx`), the selected nav pill and tab underline slide (Motion `layoutId`), the phone menu drops in, checkout's payment details slide in when the method changes.
- **Reveal, once**: figures count up (`CountUp`), daily bars rise from the baseline left to right, setup checks pop in turn, list rows arrive in order (`.stagger`).
- **The opening film** (review page; the owner can switch it off in Settings). A two-second film of the real tap card, authored in `film/` with Remotion and rendered to `public/film/` (portrait and wide; AV1 57 KB, or 37 KB on 3G-class connections, then VP9, then a light H.264 for iPhone; versioned filenames cached for a year): out of the dark only the gold edge catches the rim light; the card swings to face camera while the key light sweeps a glint across the varnished bands; a short push like a tap against a phone, the foil flares and two fine rings of light break off; the camera dives (exponential dolly, 10-sample motion blur) into the amber dot until the frame is flat amber. On that amber (#eeac2c, the decoded last frame) the page sets the title card, the thanks in the customer's language and the business name on masked rising lines, then the amber lifts away (520ms) and the page's paused entrance plays. ~2.8s. Run by an inline script before React: once per tab, tap or key to skip, never for reduced motion, Data Saver or 2G, dropped entirely (the page opens at once) if the film hasn't started 1.3s after the page arrived. `src/app/r/[slug]/intro.tsx`.
- **The authored moment: the review page's stars.** Stars fill one by one, the tapped star sends the brand's ripple, 5 stars adds an amber burst, the light behind the stars brightens with the rating, a light vibration on phones, then the next step slides open. Login replays this in miniature (`RatingDemo`).

## Do's and Don'ts

### Do:
- **Do** lead each screen with a noun title and one grey line stating the finding ("2 payments to check, 4 setup packs to deliver.").
- **Do** put the screen's most frequent job one click away, in the title row.
- **Do** print zeros as 0 and missing values as a grey dash; label demo data as sample data.
- **Do** keep amber on the Google result and the step in hand only.

### Don't:
- **Don't** use a dark or saturated sidebar, a welcome banner, icons in tinted circles, sparklines or gradient charts.
- **Don't** show placeholder payment details or invented proof ("Most choose this", customer counts) to owners.
- **Don't** fill a column of row buttons in black; row actions are secondary pills.
- **Don't** put a card inside a card, or stretch a short card to its neighbour's height.
