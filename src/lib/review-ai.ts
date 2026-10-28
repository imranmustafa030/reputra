import "server-only";
import type { Category } from "@/models/Business";

// The writing help on the customer review page, both halves done by AI on the spot:
// 1. The tap-to-pick words ("Staff acha tha", "Jagah saaf thi"), made for this business, in the
//    customer's language and for their rating. Mostly general; a dish or product only when the
//    owner's description clearly says they offer it, because a guess would put a false claim in
//    a customer's review. Kept for half an hour per business and language, so most customers
//    get them at once and the free quota lasts.
// 2. Three drafts of the review, from what the customer tapped and typed only, so every review
//    is genuinely theirs and worded differently (Google filters copy-paste praise). The owner's
//    description never reaches the drafts: a small model lets its details slip in.
// Gemini's free tier does both. Without a key, or if it's slow or over its daily limit, a few
// general picks and plain sentence templates stand in, so the page never breaks.

export type Lang = "en" | "roman" | "ur";
export type Drafts = { veryShort: string; short: string; medium: string };
export type Picks = { good: string[]; bad: string[] };

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

const PICKS_SYSTEM = `You write the tap-to-pick words on the review page of a local business in Pakistan. A customer taps up to three to say how their visit was, and their picks are then written up into their review, so every option must be something this customer could truly say.

What to write:
- "good": 6 options about what was good. When asked for them, "bad": 4 options about what could have been better.
- Mostly GENERAL things any customer of this kind of business can judge: the staff, the service, speed or waiting time, cleanliness, price or value, the place itself. Choose what customers of this type of business care about most (a clinic: the doctor and the wait; a salon: the result; a restaurant: the taste of the food).
- A SPECIFIC dish, product or service only when the description says clearly and directly that the business offers it ("we serve biryani", "known for our cold brew"). At most 1 such option in "good", none in "bad". With no description, or a vague one, use none. Never guess what they sell.
- Every option says HOW it was, with a describing word: "Staff acha tha", "Jagah saaf thi", never just "Staff" or "Free wifi".
- "good" options are positive; "bad" options are calm and polite. No superlatives, prices, numbers, emojis or punctuation.
- No two options that mean the same thing.

Size (strict): each option is 2 to 4 words and at most 22 characters, spaces included. Plain words anyone understands.

Languages: write "roman" first, then "en" and "ur" saying exactly the same things in the same order.
- roman: Roman Urdu as people type it on WhatsApp in Pakistan, Latin letters only. Common English words people say (staff, service, coffee) are fine. Good: "Staff acha tha", "Service jaldi thi", "Jagah saaf thi", "Qeemat munasib", and for a dish "Biryani mazedar thi". Bad: "Service slow thi", "Intezar lamba tha". Spell words the common way (mazedar, acha, saaf, jaldi, sukoon).
- en: the simplest English, short common words. Good: "Kind staff", "Quick service", "Clean place", "Fair price". Bad: "Slow service", "Long wait".
- ur: the same simple words as the Roman Urdu, in Urdu letters, swapping any English word for the everyday Urdu word (staff → عملہ, service → کام, wifi → انٹرنیٹ). No formal or bookish Urdu, never English written in Urdu letters, never Latin letters. Good: "عملہ اچھا تھا", "کام جلدی ہوا", "جگہ صاف تھی", "قیمت مناسب". Bad: "بہت دیر لگی", "انتظار لمبا تھا".

Return JSON only, matching the schema.`;

const LIST = { type: "ARRAY", items: { type: "STRING" } };
const PICKS_SCHEMA = {
  type: "OBJECT",
  properties: Object.fromEntries(
    (["roman", "en", "ur"] as const).map((l) => [l, { type: "OBJECT", properties: { good: LIST, bad: LIST }, required: ["good", "bad"] }]),
  ),
  required: ["roman", "en", "ur"],
  propertyOrdering: ["roman", "en", "ur"],
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

const PICK_MAX = 24; // characters; the prompt asks for 22, a little slack before a pick is dropped
const PICKS_FOR = 30 * 60_000;
// All three languages are made together (so they always say the same things) and kept together,
// so a customer who switches language gets them at once.
const picksCache = new Map<string, { at: number; picks: Record<Lang, Picks> }>();

type PickInput = { id: string; name: string; category: Category; description: string; lang: Lang; low: boolean };

export async function makePicks(input: PickInput): Promise<{ picks: Picks; ai: boolean }> {
  const key = [input.id, input.low ? "low" : "high", input.name, input.category, input.description].join("|");
  const hit = picksCache.get(key);
  if (hit && Date.now() - hit.at < PICKS_FOR) return { picks: hit.picks[input.lang], ai: true };

  const prompt = [
    `Business: ${input.name}`,
    `Type of business: ${input.category}`,
    input.description ? `The owner's description: ${input.description}` : "The owner has not described the business. Use general options only.",
    input.low ? 'Write "good" (6) and "bad" (4) in each language.' : 'Write "good" (6) in each language and leave "bad" empty.',
  ].join("\n");
  const out = await gemini<Partial<Record<Lang, Partial<Picks>>>>(PICKS_SYSTEM, prompt, PICKS_SCHEMA, 0.3);

  const tidy = (v: unknown, n: number, lang: Lang) => {
    const seen = new Set<string>();
    return (Array.isArray(v) ? v : [])
      .map((x) => clean(x, 60).replace(/[.!,;:۔]+$/, ""))
      .filter((x) => x && x.length <= PICK_MAX && x.split(" ").length <= 5 && rightScript(x, lang))
      .filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()))
      .slice(0, n);
  };
  const all = {} as Record<Lang, Picks>;
  for (const lang of ["roman", "en", "ur"] as const) {
    const good = tidy(out?.[lang]?.good, 6, lang);
    const bad = input.low ? tidy(out?.[lang]?.bad, 4, lang) : [];
    if (good.length < 4 || (input.low && bad.length < 3)) return { picks: FALLBACK[input.lang](input.low), ai: false };
    all[lang] = { good, bad };
  }

  if (picksCache.size > 500) picksCache.delete(picksCache.keys().next().value!);
  picksCache.set(key, { at: Date.now(), picks: all });
  return { picks: all[input.lang], ai: true };
}

/* -------------------------------------------------------------------------- fallbacks */

// Only when the AI can't answer: a few general picks any business can be judged on.
const FALLBACK: Record<Lang, (low: boolean) => Picks> = {
  en: (low) => ({
    good: ["Kind staff", "Quick service", "Clean place", "Fair price", "Nice place", "Good experience"],
    bad: low ? ["Slow service", "Long wait", "Not clean", "Too costly"] : [],
  }),
  roman: (low) => ({
    good: ["Staff acha tha", "Service jaldi thi", "Jagah saaf thi", "Qeemat munasib", "Achi jagah", "Acha tajurba"],
    bad: low ? ["Service slow thi", "Intezar lamba tha", "Safai nahin thi", "Bohat mehnga tha"] : [],
  }),
  ur: (low) => ({
    good: ["عملہ اچھا تھا", "کام جلدی ہوا", "جگہ صاف تھی", "قیمت مناسب", "اچھی جگہ", "اچھا تجربہ"],
    bad: low ? ["بہت دیر لگی", "انتظار لمبا تھا", "صفائی نہیں تھی", "بہت مہنگا تھا"] : [],
  }),
};

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
