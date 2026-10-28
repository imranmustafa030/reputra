// Every word on the customer review page, in the three languages the website promises.
// Roman Urdu is how most customers write on WhatsApp; Urdu is set right-to-left in Nastaliq.

export const LANGS = ["en", "roman", "ur"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_NAMES: Record<Lang, string> = { en: "English", roman: "Roman Urdu", ur: "اردو" };

export type Copy = {
  thanks: string;
  question: string;
  hint: string;
  labels: [string, string, string, string, string];
  starName: (n: number) => string;
  happy: string;
  unhappy: string;
  google: string;
  // Google's own review box can't be opened with stars already filled in, so the customer is
  // told exactly what to tap there: the same number they just chose.
  googleNote: (stars: number) => string;
  opening: string;
  skip: string;
  private: string;
  form: { message: string; name: string; phone: string; optional: string; send: string; sending: string; only: string; cancel: string };
  sent: string;
  sentNote: string;
  noGoogle: string;
};

export const COPY: Record<Lang, Copy> = {
  en: {
    thanks: "Thank you for visiting",
    question: "How was your visit?",
    hint: "Tap a star",
    labels: ["Bad", "Not good", "Okay", "Good", "Excellent"],
    starName: (n) => `${n} ${n === 1 ? "star" : "stars"}`,
    happy: "Thank you! Would you say that on Google? It takes about 30 seconds and helps other people find us.",
    unhappy: "Thank you for being honest. Tell the owner what went wrong, or share your review on Google.",
    google: "Post it on Google",
    googleNote: (n) => `Google opens its own review box: tap ${n} ${n === 1 ? "star" : "stars"} there again, then write a line.`,
    opening: "Opening Google…",
    skip: "Go straight to Google",
    private: "Tell the owner privately",
    form: {
      message: "What should the owner know?",
      name: "Your name",
      phone: "Phone, for a reply",
      optional: "optional",
      send: "Send to the owner",
      sending: "Sending…",
      only: "Only the owner sees this. It is not posted anywhere.",
      cancel: "Cancel",
    },
    sent: "Sent to the owner",
    sentNote: "Thank you. Your note went straight to the owner, and nobody else sees it.",
    noGoogle: "Our Google review link is being set up. Meanwhile, you can send the owner a note.",
  },
  roman: {
    thanks: "Aane ka shukriya",
    question: "Aap ka visit kaisa raha?",
    hint: "Star par tap karein",
    labels: ["Bura", "Theek nahin", "Theek tha", "Acha", "Bohat acha"],
    starName: (n) => `${n} star`,
    happy: "Shukriya! Kya aap Google par bhi bata denge? Sirf 30 second lagte hain aur doosron ko hamein dhoondne mein madad milti hai.",
    unhappy: "Sach batane ka shukriya. Owner ko batayein kya ghalat hua, ya Google par apna review dein.",
    google: "Google par review dein",
    googleNote: (n) => `Google apna review box kholega: wahan dobara ${n} star dabayein, phir ek line likhein.`,
    opening: "Google khul raha hai…",
    skip: "Seedha Google par jayein",
    private: "Owner ko privately batayein",
    form: {
      message: "Owner ko kya batana chahte hain?",
      name: "Aap ka naam",
      phone: "Phone, jawab ke liye",
      optional: "zaroori nahin",
      send: "Owner ko bhejein",
      sending: "Bhej rahe hain…",
      only: "Yeh sirf owner dekhega. Kahin post nahin hota.",
      cancel: "Wapis",
    },
    sent: "Owner ko bhej diya",
    sentNote: "Shukriya. Aap ka message seedha owner tak pohanch gaya, aur koi aur nahin dekhega.",
    noGoogle: "Hamara Google review link abhi set ho raha hai. Tab tak aap owner ko message bhej sakte hain.",
  },
  ur: {
    thanks: "آنے کا شکریہ",
    question: "آپ کا وزٹ کیسا رہا؟",
    hint: "ستارے پر ٹیپ کریں",
    labels: ["برا", "ٹھیک نہیں", "ٹھیک تھا", "اچھا", "بہت اچھا"],
    starName: (n) => `${n} ستارے`,
    happy: "شکریہ! کیا آپ گوگل پر بھی بتا دیں گے؟ صرف تیس سیکنڈ لگتے ہیں اور دوسروں کو ہمیں ڈھونڈنے میں مدد ملتی ہے۔",
    unhappy: "سچ بتانے کا شکریہ۔ مالک کو بتائیں کہ کیا غلط ہوا، یا گوگل پر اپنا ریویو دیں۔",
    google: "گوگل پر ریویو دیں",
    googleNote: (n) => `گوگل اپنا ریویو باکس کھولے گا: وہاں دوبارہ ${n} ستارے دبائیں، پھر ایک سطر لکھیں۔`,
    opening: "گوگل کھل رہا ہے…",
    skip: "سیدھا گوگل پر جائیں",
    private: "مالک کو نجی طور پر بتائیں",
    form: {
      message: "آپ مالک کو کیا بتانا چاہتے ہیں؟",
      name: "آپ کا نام",
      phone: "فون، جواب کے لیے",
      optional: "اختیاری",
      send: "مالک کو بھیجیں",
      sending: "بھیج رہے ہیں…",
      only: "یہ صرف مالک دیکھے گا۔ کہیں پوسٹ نہیں ہوتا۔",
      cancel: "واپس",
    },
    sent: "مالک کو بھیج دیا",
    sentNote: "شکریہ۔ آپ کا پیغام سیدھا مالک تک پہنچ گیا، اور کوئی اور نہیں دیکھے گا۔",
    noGoogle: "ہمارا گوگل ریویو لنک ابھی تیار ہو رہا ہے۔ تب تک آپ مالک کو پیغام بھیج سکتے ہیں۔",
  },
};
