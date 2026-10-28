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
  en: "Very simple, everyday English: short, common words and short sentences, the way a customer who doesn't write much English would put it.",
  roman:
    "Roman Urdu: Urdu written in the Latin alphabet, the way people in Pakistan type on WhatsApp (e.g. \"Khana bohat mazedar tha, staff ka rawaiya bhi acha tha\"). Use Urdu words; keep only the English words people really say (coffee, staff, service). Never use Urdu script.",
  ur: "Simple spoken Urdu in Urdu script, the plain words people use every day (no formal or bookish Urdu), with real Urdu words, not English words written in Urdu letters (say عملہ not اسٹاف, تجربہ not ایکسپیرینس, ماحول not ایمبیئنس). Only a name with no Urdu word may stay. Simple everyday Urdu. Never use the Latin alphabet except for the business name.",
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
- In Urdu and Roman Urdu, the customer may be a man or a woman: never use first-person verbs that show gender (gaya/gayi, aaunga/aaungi, karunga, گیا/گئی, کروں گا/گی, آؤں گا/گی). Use neutral forms: "hamara visit acha raha", "dobara zaroor aana hai", "yahan aa kar acha laga", "یہاں آ کر اچھا لگا", "دوبارہ ضرور آنا ہے", "یہاں آ کر اچھا لگا".
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
- 6 options. Each one says WHAT was good, not just a thing: a thing plus how it was, in 2 to 4 simple words. "Cold brew" or "Quiet corners" alone mean nothing; "Coffee was great" and "Calm place to sit" do. Examples:
  - en (the simplest English, short common words only): "Tasty cold coffee", "Kind staff", "Calm place", "Good wifi", "Clean place"
  - roman (Roman Urdu as typed on WhatsApp): "Thandi coffee mazedar thi", "Staff ka rawaiya acha", "Sukoon wali jagah", "Wifi acha chalta hai"
  - ur (simple spoken Urdu that everyone understands, the same plain words as the Roman Urdu but in Urdu letters; no formal or bookish words, and never English written in Urdu letters): "ٹھنڈی کافی مزیدار تھی", "عملہ اچھا تھا", "سکون والی جگہ", "انٹرنیٹ اچھا چلتا ہے"
- A dish or product always comes with how it was ("Tasty cold coffee", never just "Cold coffee"; "Rolls taaza the", never just "Fresh rolls" in Roman Urdu).
- Choose the 6 that matter most for THIS business: at most 2 about a dish or product named in its description (in plain words: "cold brew" becomes "cold coffee" if that is simpler), the rest about staff, speed, cleanliness, price or the place. Never two options that mean the same thing.
- Positive or neutral only. No superlatives like "best ever", no prices, no emojis.
- The same 6 options in all three languages, in the same order, each one natural in its own language, never a word-for-word translation.

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
  // Urdu ends its sentences with "۔", which the model often swaps for a Latin full stop.
  const stops = (t: string) => (input.lang === "ur" ? t.replace(/\.(\s|$)/g, "۔$1") : t);
  const drafts = out && { veryShort: stops(clean(out.very_short, 120)), short: stops(clean(out.short, 260)), medium: stops(clean(out.medium, 480)) };
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
  const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => clean(x, 32)).filter(Boolean).slice(0, 6) : []);
  const chips = { en: list(out.en), roman: list(out.roman), ur: list(out.ur) };
  return chips.en.length >= 4 && chips.roman.length >= 4 && chips.ur.length >= 4 ? chips : null;
}

/* -------------------------------------------------------------------------- fallbacks */

// "Could be better", offered alongside the picks when a customer gives 1 to 3 stars, so an
// unhappy customer's review can say what went wrong instead of only what went right.
export const ISSUES: Chips = {
  en: ["Slow service", "Long wait", "Not clean", "Too costly", "Staff not polite"],
  roman: ["Service slow thi", "Intezar lamba tha", "Safai nahin thi", "Bohat mehnga tha", "Staff ka rawaiya theek nahin"],
  ur: ["بہت دیر لگی", "انتظار لمبا تھا", "صفائی نہیں تھی", "بہت مہنگا تھا", "عملے کا رویہ ٹھیک نہیں"],
};

// Picks for each kind of business, until the owner's description gives better ones. Each says
// what was good, in the simplest words of each language.
const BY_CATEGORY: Record<Category, Chips> = {
  restaurant: {
    en: ["Tasty food", "Fresh food", "Food came fast", "Kind staff", "Clean place", "Fair price"],
    roman: ["Khana mazedar tha", "Khana taaza tha", "Khana jaldi aaya", "Staff ka rawaiya acha", "Jagah saaf thi", "Qeemat munasib"],
    ur: ["کھانا مزیدار تھا", "کھانا تازہ تھا", "کھانا جلدی آیا", "عملہ اچھا تھا", "جگہ صاف تھی", "قیمت مناسب"],
  },
  cafe: {
    en: ["Great coffee", "Tasty food", "Calm place", "Kind staff", "Clean place", "Fair price"],
    roman: ["Coffee zabardast thi", "Khana mazedar tha", "Sukoon wali jagah", "Staff ka rawaiya acha", "Jagah saaf thi", "Qeemat munasib"],
    ur: ["کافی زبردست تھی", "کھانا مزیدار تھا", "سکون والی جگہ", "عملہ اچھا تھا", "جگہ صاف تھی", "قیمت مناسب"],
  },
  salon: {
    en: ["Great result", "Skilled staff", "Very relaxing", "No long wait", "Clean place", "Fair price"],
    roman: ["Result zabardast tha", "Staff mahir tha", "Bohat sukoon mila", "Intezar nahin karna para", "Jagah saaf thi", "Qeemat munasib"],
    ur: ["نتیجہ زبردست تھا", "عملہ ماہر تھا", "بہت سکون ملا", "انتظار نہیں کرنا پڑا", "جگہ صاف تھی", "قیمت مناسب"],
  },
  clinic: {
    en: ["Caring doctor", "Explained well", "Short wait", "Kind staff", "Clean place", "Fair fee"],
    roman: ["Doctor hamdard the", "Achi tarah samjhaya", "Intezar kam tha", "Staff ka rawaiya acha", "Jagah saaf thi", "Fees munasib"],
    ur: ["ڈاکٹر ہمدرد تھے", "اچھے سے سمجھایا", "انتظار کم تھا", "عملہ اچھا تھا", "جگہ صاف تھی", "فیس مناسب"],
  },
  gym: {
    en: ["Good machines", "Helpful trainers", "Good vibe", "Clean place", "Not crowded", "Fair fee"],
    roman: ["Machines achi hain", "Trainers madadgar hain", "Mahol acha hai", "Jagah saaf hai", "Rush nahin hota", "Fees munasib"],
    ur: ["مشینیں اچھی ہیں", "ٹرینر مددگار ہیں", "ماحول اچھا ہے", "جگہ صاف ہے", "رش نہیں ہوتا", "فیس مناسب"],
  },
  shop: {
    en: ["Lots of choice", "Helpful staff", "Good quality", "Fair price", "Quick service", "Clean shop"],
    roman: ["Cheezein bohat hain", "Staff madadgar tha", "Achi quality", "Qeemat munasib", "Kaam jaldi hua", "Dukaan saaf thi"],
    ur: ["بہت چیزیں ملیں", "عملہ مددگار تھا", "چیزیں اچھی ہیں", "قیمت مناسب", "کام جلدی ہوا", "دکان صاف تھی"],
  },
  hotel: {
    en: ["Comfy room", "Clean room", "Helpful staff", "Good location", "Quiet at night", "Fair price"],
    roman: ["Kamra aramdeh tha", "Kamra saaf tha", "Staff madadgar tha", "Location achi hai", "Raat ko sukoon tha", "Qeemat munasib"],
    ur: ["کمرہ آرام دہ تھا", "کمرہ صاف تھا", "عملہ مددگار تھا", "جگہ اچھی ہے", "رات کو سکون تھا", "قیمت مناسب"],
  },
  other: {
    en: ["Kind staff", "Quick service", "Good work", "Clean place", "Fair price", "Easy to find"],
    roman: ["Staff ka rawaiya acha", "Kaam jaldi hua", "Kaam acha tha", "Jagah saaf thi", "Qeemat munasib", "Jagah aasani se mili"],
    ur: ["عملہ اچھا تھا", "کام جلدی ہوا", "کام اچھا تھا", "جگہ صاف تھی", "قیمت مناسب", "جگہ آسانی سے ملی"],
  },
};

export function defaultChips(category: Category): Chips {
  return BY_CATEGORY[category] ?? BY_CATEGORY.other;
}

// Plain drafts from the picks, when the AI isn't available. The picks are short statements
// ("Khana mazedar tha"), so they are joined as they are; the customer can still edit.
export function templateDrafts({ name, rating, picks, issues, note, lang }: DraftInput): Drafts {
  const good = rating >= 4;
  const ur = lang === "ur";
  const stop = ur ? "۔" : ".";
  const join = (items: string[]) =>
    items
      .slice(0, 3)
      .map((x, i) => (i && !ur ? x.charAt(0).toLowerCase() + x.slice(1) : x))
      .join(ur ? "، " : ", ");
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
  const sentence = (x: string) => (x ? ` ${cap(x.replace(/[.!?۔]*$/, ""))}${stop}` : "");
  const liked = sentence(join(picks));
  const bad = sentence(join(issues));
  const extra = sentence(note.trim());
  const first = picks[0] ? cap(picks[0]) + stop : "";

  const words = {
    en: good
      ? { very: first ? `${first} Really liked it.` : "Really good visit.", open: `Had a good visit to ${name}.`, long: "Our visit went really well.", end: " Will come again." }
      : { very: rating === 3 ? "It was okay." : "Not a good visit.", open: `My visit to ${name} was ${rating === 3 ? "okay" : "not good"}.`, long: rating === 3 ? "The visit was okay, but some things can be better." : "The visit did not go well.", end: "" },
    roman: good
      ? { very: first ? `${first} Bohat acha laga.` : "Bohat acha visit raha.", open: `${name} ka visit acha raha.`, long: "Hamara visit kaafi acha raha.", end: " Dobara zaroor aana hai." }
      : { very: rating === 3 ? "Theek tha." : "Visit acha nahin raha.", open: `${name} ka visit ${rating === 3 ? "theek tha" : "acha nahin raha"}.`, long: rating === 3 ? "Visit theek raha, lekin kuch cheezein behtar ho sakti hain." : "Visit umeed ke mutabiq nahin raha.", end: "" },
    ur: good
      ? { very: first ? `${first} بہت اچھا لگا۔` : "بہت اچھا تجربہ رہا۔", open: `${name} آ کر اچھا لگا۔`, long: "یہاں آنا بہت اچھا رہا۔", end: " دوبارہ ضرور آنا ہے۔" }
      : { very: rating === 3 ? "ٹھیک تھا۔" : "تجربہ اچھا نہیں رہا۔", open: `${name} کا تجربہ ${rating === 3 ? "ٹھیک تھا" : "اچھا نہیں رہا"}۔`, long: rating === 3 ? "تجربہ ٹھیک رہا، لیکن کچھ چیزیں بہتر ہو سکتی ہیں۔" : "تجربہ امید کے مطابق نہیں رہا۔", end: "" },
  }[lang];

  return good
    ? { veryShort: words.very, short: `${words.open}${liked}`, medium: `${words.long}${liked}${extra}${words.end}` }
    : { veryShort: words.very, short: `${words.open}${bad || liked}`, medium: `${words.long}${liked}${bad}${extra}` };
}
