import "server-only";
import type { Category } from "@/models/Business";

// Review drafts for the customer review page. The customer taps what stood out ("Friendly staff",
// "Tasty biryani") and an AI writes three versions in their own language, from those picks only,
// so every review is genuinely theirs and worded differently (Google filters copy-paste praise).
// Gemini's free tier does the writing; without a key, or if it's slow or over its daily limit,
// the drafts are put together from the picks with plain sentence templates, so the page never
// breaks. The owner's description never reaches the drafts (a small model lets its details slip
// in, which would put words in the customer's mouth); it shapes the picks instead, made once
// when it's saved.

export type Lang = "en" | "roman" | "ur";
export type Drafts = { veryShort: string; short: string; medium: string };
export type Chips = Record<Lang, string[]>;

// The light Flash model with thinking kept to a minimum: short reviews need no reasoning, and it
// answers in about 3 seconds where the full model, thinking first, took over 30.
const MODEL = () => process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const THINKING = () => process.env.GEMINI_THINKING || "minimal";
const TIMEOUT_MS = 9000;

const LANGUAGE: Record<Lang, string> = {
  en: "English. Plain, natural, everyday English as a customer in Pakistan would write it.",
  roman:
    "Roman Urdu: Urdu written in the Latin alphabet, the way people in Pakistan type on WhatsApp (e.g. \"Bohat acha khana tha, staff bhi friendly tha\"). Mix in common English words where people naturally do. Never use Urdu script.",
  ur: "Urdu in Urdu script (Nastaliq/Naskh letters), simple everyday wording. Never use the Latin alphabet except for a brand name.",
};

// The voice of the drafts. Kept strict on honesty: Google removes reviews that don't reflect the
// reviewer's own experience, and identical praise across many reviews gets filtered as spam.
const DRAFTS_SYSTEM = `You help a real customer put their own experience of a local business into words for a Google review. You are writing in the customer's voice, in the first person.

Honesty rules (most important):
- Use ONLY what the customer picked or wrote.
- Never invent facts, names, prices, dates, numbers, staff names, or comparisons with other businesses.
- The longer versions are longer because of how the customer felt (enjoyed it, would come back, would recommend it), never because of extra details. Do not add an atmosphere, a dish, a use of the place or anything else the customer did not pick or write.
- Match the star rating. 5: warm and clearly positive. 4: positive, can be a little measured. 3: balanced, fair. 1-2: honest and calm about what was wrong, never insulting, no threats, no all-caps.
- Never say the review was written by AI or suggested, never ask for anything in return, never mention discounts or offers.

Style rules:
- Sound like a real person, not marketing. Simple words. No hashtags, no emojis, no exclamation marks in a row, at most one exclamation mark in total.
- Mention the business name at most once, and not in the very short version.
- Write the business name exactly as given, in its own letters; never transliterate it into another script. In Urdu script, leave the name out.
- In Urdu and Roman Urdu, the customer may be a man or a woman: never use first-person verbs that show gender (gaya/gayi, aaunga/aaungi, karunga, گیا/گئی, کروں گا/گی, آؤں گا/گی). Use neutral forms: "hamara visit acha raha", "dobara zaroor aana hai", "yahan aa kar acha laga", "ہمارا وزٹ اچھا رہا", "دوبارہ ضرور آنا ہے", "یہاں آ کر اچھا لگا".
- Each of the three versions must open differently and use different wording, not be the same sentence made longer.
- Lengths: very_short is 3 to 10 words. short is 12 to 25 words, one or two sentences. medium is 28 to 55 words, two to four sentences.

Return JSON only, matching the schema.`;

const DRAFTS_SCHEMA = {
  type: "OBJECT",
  properties: { very_short: { type: "STRING" }, short: { type: "STRING" }, medium: { type: "STRING" } },
  required: ["very_short", "short", "medium"],
};

const CHIPS_SYSTEM = `You write short tap-to-pick options for a review page of a local business in Pakistan. Customers tap up to three to say what stood out in their visit.

Rules:
- 8 options, each 1 to 3 words, things a customer could genuinely experience at THIS business, based on its description and type (for example a specific signature dish or service named in the description, staff, cleanliness, speed, value, atmosphere).
- Simple everyday words a customer would use, positive or neutral (they describe what stood out). No superlatives like "best ever", no prices, no emojis.
- Give the same 8 options in three languages, in the same order:
  - en: plain English.
  - roman: Roman Urdu, real Urdu words in the Latin alphabet as people type on WhatsApp in Pakistan ("Mazedar khana", "Achi service", "Saaf jagah", "Friendly staff"). A dish or product keeps the name people use, with Urdu around it where natural ("Mazedar cold brew", "Taaza naan"). Never just the English option copied.
  - ur: Urdu script.

Return JSON only, matching the schema.`;

const CHIPS_SCHEMA = {
  type: "OBJECT",
  properties: {
    en: { type: "ARRAY", items: { type: "STRING" } },
    roman: { type: "ARRAY", items: { type: "STRING" } },
    ur: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["en", "roman", "ur"],
};

async function gemini<T>(system: string, prompt: string, schema: object, temperature: number): Promise<T | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL())}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: "application/json", responseSchema: schema, thinkingConfig: { thinkingLevel: THINKING() } },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("Gemini failed:", (err as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const clean = (s: unknown, max: number) =>
  typeof s === "string"
    ? s
        .replace(/[#*_`]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

export type DraftInput = { name: string; category: Category; description: string; rating: number; picks: string[]; issues: string[]; note: string; lang: Lang };

export async function writeDrafts(input: DraftInput): Promise<{ drafts: Drafts; ai: boolean }> {
  const prompt = [
    `Business: ${input.name} (${input.category}).`,
    `Stars the customer gave: ${input.rating} out of 5.`,
    input.picks.length ? `What the customer liked: ${input.picks.join("; ")}.` : "",
    input.issues.length ? `What the customer felt could be better: ${input.issues.join("; ")}.` : "",
    !input.picks.length && !input.issues.length ? "The customer didn't pick anything specific." : "",
    input.note ? `In the customer's own words: "${input.note}"` : "",
    `Write in: ${LANGUAGE[input.lang]}`,
  ]
    .filter(Boolean)
    .join("\n");
  const out = await gemini<{ very_short?: string; short?: string; medium?: string }>(DRAFTS_SYSTEM, prompt, DRAFTS_SCHEMA, 0.95);
  const drafts = out && { veryShort: clean(out.very_short, 120), short: clean(out.short, 260), medium: clean(out.medium, 480) };
  if (drafts && [drafts.veryShort, drafts.short, drafts.medium].every((d) => d && rightScript(d, input.lang))) return { drafts, ai: true };
  return { drafts: templateDrafts(input), ai: false };
}

// A small model now and then slips into another script (a name in Bengali letters inside Urdu,
// Urdu letters in Roman Urdu). Such a draft is thrown away rather than shown.
const INDIC = /[\u0900-\u0DFF]/;
const ARABIC = /[\u0600-\u06FF]/;
function rightScript(text: string, lang: Lang) {
  if (INDIC.test(text)) return false;
  return lang === "ur" ? ARABIC.test(text) : !ARABIC.test(text);
}

export async function suggestChips(input: { name: string; category: Category; description: string }): Promise<Chips | null> {
  if (!input.description) return null;
  const out = await gemini<Partial<Chips>>(
    CHIPS_SYSTEM,
    `Business: ${input.name}\nType: ${input.category}\nDescription: ${input.description}`,
    CHIPS_SCHEMA,
    0.5,
  );
  if (!out) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => clean(x, 28)).filter(Boolean).slice(0, 8) : []);
  const chips = { en: list(out.en), roman: list(out.roman), ur: list(out.ur) };
  return chips.en.length >= 4 && chips.roman.length >= 4 && chips.ur.length >= 4 ? chips : null;
}

/* -------------------------------------------------------------------------- fallbacks */

// "Could be better", offered alongside the picks when a customer gives 1 to 3 stars, so an
// unhappy customer's review can say what went wrong instead of only what went right.
export const ISSUES: Chips = {
  en: ["Slow service", "Long wait", "Not clean", "Too pricey", "Unfriendly staff"],
  roman: ["Service slow thi", "Lamba intezar", "Safai kam thi", "Mehnga laga", "Staff ka rawayya"],
  ur: ["سروس سست تھی", "لمبا انتظار", "صفائی کم تھی", "مہنگا لگا", "عملے کا رویہ"],
};

// Picks that suit each kind of business, until the owner's description gives better ones.
const COMMON: Chips = {
  en: ["Friendly staff", "Quick service", "Clean place", "Good value"],
  roman: ["Friendly staff", "Jaldi service", "Saaf suthri jagah", "Paise wasool"],
  ur: ["خوش اخلاق عملہ", "جلدی سروس", "صاف ستھری جگہ", "مناسب قیمت"],
};
const BY_CATEGORY: Partial<Record<Category, Chips>> = {
  restaurant: { en: ["Tasty food", "Good portions", "Nice atmosphere"], roman: ["Mazedar khana", "Achi quantity", "Acha mahol"], ur: ["مزیدار کھانا", "اچھی مقدار", "اچھا ماحول"] },
  cafe: { en: ["Great coffee", "Cosy place", "Fresh food"], roman: ["Zabardast coffee", "Cosy jagah", "Taaza khana"], ur: ["زبردست کافی", "پرسکون جگہ", "تازہ کھانا"] },
  salon: { en: ["Great result", "Skilled stylist", "Relaxing visit"], roman: ["Zabardast result", "Mahir stylist", "Sukoon wala visit"], ur: ["زبردست نتیجہ", "ماہر اسٹائلسٹ", "پرسکون وزٹ"] },
  clinic: { en: ["Caring doctor", "Explained clearly", "Short wait"], roman: ["Hamdard doctor", "Achi tarah samjhaya", "Kam intezar"], ur: ["ہمدرد ڈاکٹر", "اچھی طرح سمجھایا", "کم انتظار"] },
  gym: { en: ["Good equipment", "Helpful trainers", "Good vibe"], roman: ["Acha equipment", "Madadgar trainers", "Acha mahol"], ur: ["اچھا سامان", "مددگار ٹرینر", "اچھا ماحول"] },
  shop: { en: ["Good variety", "Helpful staff", "Fair prices"], roman: ["Achi variety", "Madadgar staff", "Munasib qeemat"], ur: ["اچھی ورائٹی", "مددگار عملہ", "مناسب قیمتیں"] },
  hotel: { en: ["Comfortable room", "Helpful staff", "Great location"], roman: ["Aramdeh kamra", "Madadgar staff", "Achi location"], ur: ["آرام دہ کمرہ", "مددگار عملہ", "اچھی جگہ"] },
};

export function defaultChips(category: Category): Chips {
  const extra = BY_CATEGORY[category];
  return {
    en: [...(extra?.en ?? []), ...COMMON.en],
    roman: [...(extra?.roman ?? []), ...COMMON.roman],
    ur: [...(extra?.ur ?? []), ...COMMON.ur],
  };
}

// Plain drafts from the picks, when the AI isn't available. Honest and varied enough to read as
// a person's words; the customer can still edit before copying.
export function templateDrafts({ name, rating, picks, issues, note, lang }: DraftInput): Drafts {
  const p = picks.slice(0, 3);
  const bad = issues.slice(0, 3);
  const list = (items: string[], and: string) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`);
  const good = rating >= 4;
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const extra = note ? ` ${cap(note.replace(/[.!?۔]*$/, lang === "ur" ? "۔" : "."))}` : "";
  if (lang === "roman") {
    const l = list(p.map((x, i) => (i ? x.toLowerCase() : x)), "aur");
    return good
      ? {
          veryShort: p.length ? `${p[0]}, bohat acha laga.` : "Bohat acha experience raha.",
          short: p.length ? `${name} ka visit acha raha. ${l} khaas tor par pasand aaya.` : `${name} ka visit acha raha, dobara zaroor aayenge.`,
          medium: `Hamara visit kaafi acha raha.${p.length ? ` ${l} sab se zyada pasand aaya.` : ""}${extra} Dobara zaroor aayenge.`,
        }
      : {
          veryShort: rating === 3 ? "Theek tha, behtar ho sakta hai." : "Experience acha nahin raha.",
          short: `${name} ka visit ${rating === 3 ? "theek tha" : "umeed ke mutabiq nahin tha"}.${bad.length ? ` Masla: ${bad[0].toLowerCase()}.` : p.length ? ` ${l} acha tha.` : ""}`,
          medium: `Visit ${rating === 3 ? "theek raha, lekin kuch cheezein behtar ho sakti hain" : "umeed ke mutabiq nahin raha"}.${p.length ? ` Achi baat: ${l.toLowerCase()}.` : ""}${bad.length ? ` Masla: ${bad.join(", ").toLowerCase()}.` : ""}${extra}`,
        };
  }
  if (lang === "ur") {
    const l = list(p, "اور");
    return good
      ? {
          veryShort: p.length ? `${p[0]}، بہت اچھا لگا۔` : "بہت اچھا تجربہ رہا۔",
          short: p.length ? `${name} کا وزٹ اچھا رہا۔ ${l} خاص طور پر پسند آیا۔` : `${name} کا وزٹ اچھا رہا، دوبارہ ضرور آئیں گے۔`,
          medium: `ہمارا وزٹ کافی اچھا رہا۔${p.length ? ` ${l} سب سے زیادہ پسند آیا۔` : ""}${extra} دوبارہ ضرور آئیں گے۔`,
        }
      : {
          veryShort: rating === 3 ? "ٹھیک تھا، بہتر ہو سکتا ہے۔" : "تجربہ اچھا نہیں رہا۔",
          short: `${name} کا وزٹ ${rating === 3 ? "ٹھیک تھا" : "امید کے مطابق نہیں تھا"}۔${bad.length ? ` مسئلہ: ${bad[0]}۔` : p.length ? ` ${l} اچھا تھا۔` : ""}`,
          medium: `وزٹ ${rating === 3 ? "ٹھیک رہا، لیکن کچھ چیزیں بہتر ہو سکتی ہیں" : "امید کے مطابق نہیں رہا"}۔${p.length ? ` اچھی بات: ${l}۔` : ""}${bad.length ? ` مسئلہ: ${bad.join("، ")}۔` : ""}${extra}`,
        };
  }
  const l = list(p.map((x, i) => (i ? x.toLowerCase() : x)), "and");
  return good
    ? {
        veryShort: p.length ? `${p[0]}. Really enjoyed it.` : "Really good experience.",
        short: p.length ? `Had a good visit to ${name}. ${l} stood out for me.` : `Had a good visit to ${name}. Will come back.`,
        medium: `Our visit went really well.${p.length ? ` ${l} stood out the most.` : ""}${extra} Would happily come back.`,
      }
    : {
        veryShort: rating === 3 ? "It was okay, could be better." : "Not a great experience.",
        short: `My visit to ${name} was ${rating === 3 ? "okay overall" : "not what I expected"}.${bad.length ? ` Main issue: ${bad[0].toLowerCase()}.` : p.length ? ` ${l} was good.` : ""}`,
        medium: `The visit ${rating === 3 ? "was fine, though a few things could be better" : "didn't go as I hoped"}.${p.length ? ` On the plus side: ${l.toLowerCase()}.` : ""}${bad.length ? ` What let it down: ${bad.join(", ").toLowerCase()}.` : ""}${extra}`,
      };
}
