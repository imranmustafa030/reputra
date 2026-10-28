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
  // The two ways on, shown the same way for every rating.
  chooseGoogleSub: string;
  privateSub: string;
  // Writing the Google review: the customer taps what stood out and we write it up three ways.
  write: {
    title: string;
    hint: string;
    issues: string;
    extra: string;
    go: string;
    need: string;
    writing: string;
    failed: string;
    retry: string;
    title2: string;
    hint2: string;
    versions: [string, string, string];
    again: string;
    edit: string;
    copyOpen: string;
    copied: string;
    copyFailed: string;
    openOnly: string;
    own: string;
    paste: (stars: number) => string;
    back: string;
  };
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
    chooseGoogleSub: "We’ll help you put it into words",
    privateSub: "Only the owner reads it",
    write: {
      title: "What stood out?",
      hint: "Pick up to 3. We’ll write it up in your words.",
      issues: "Could be better",
      extra: "Anything else to add?",
      go: "Write my review",
      need: "Pick at least one, or add a line.",
      writing: "Writing your review…",
      failed: "That didn’t go through. Check your internet and try again.",
      retry: "Try again",
      title2: "Your review, three ways",
      hint2: "Pick one and change anything you like. It’s your review.",
      versions: ["Very short", "Short", "A bit longer"],
      again: "Write again",
      edit: "Your review",
      copyOpen: "Copy & open Google",
      copied: "Copied. Opening Google…",
      copyFailed: "Couldn’t copy it. Press and hold the text to copy it, then open Google.",
      openOnly: "Open Google",
      own: "I’ll write my own",
      paste: (n) => `In Google, tap ${n} ${n === 1 ? "star" : "stars"}, then press and hold the box and choose Paste.`,
      back: "Back",
    },
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
    chooseGoogleSub: "Likhne mein hum madad karenge",
    privateSub: "Sirf owner parhega",
    write: {
      title: "Kya khaas laga?",
      hint: "3 tak chunein. Hum aap ke alfaaz mein likh denge.",
      issues: "Behtar ho sakta tha",
      extra: "Kuch aur batana chahenge?",
      go: "Mera review likhein",
      need: "Kam az kam ek chunein, ya ek line likhein.",
      writing: "Aap ka review likh rahe hain…",
      failed: "Nahin ho saka. Internet check kar ke dobara koshish karein.",
      retry: "Dobara koshish karein",
      title2: "Aap ka review, teen tarah se",
      hint2: "Ek chunein aur jo chahein badal dein. Review aap ka hai.",
      versions: ["Bohat chhota", "Chhota", "Thora lamba"],
      again: "Dobara likhein",
      edit: "Aap ka review",
      copyOpen: "Copy karein aur Google kholein",
      copied: "Copy ho gaya. Google khul raha hai…",
      copyFailed: "Copy nahin hua. Text ko daba kar rakhein aur copy karein, phir Google kholein.",
      openOnly: "Google kholein",
      own: "Khud likhna hai",
      paste: (n) => `Google mein ${n} star dabayein, phir box ko daba kar rakhein aur Paste chunein.`,
      back: "Wapis",
    },
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
    chooseGoogleSub: "لکھنے میں ہم مدد کریں گے",
    privateSub: "صرف مالک پڑھے گا",
    write: {
      title: "کیا خاص لگا؟",
      hint: "تین تک چنیں۔ ہم آپ کے الفاظ میں لکھ دیں گے۔",
      issues: "بہتر ہو سکتا تھا",
      extra: "کچھ اور بتانا چاہیں گے؟",
      go: "میرا ریویو لکھیں",
      need: "کم از کم ایک چنیں، یا ایک سطر لکھیں۔",
      writing: "آپ کا ریویو لکھ رہے ہیں…",
      failed: "نہیں ہو سکا۔ انٹرنیٹ چیک کر کے دوبارہ کوشش کریں۔",
      retry: "دوبارہ کوشش کریں",
      title2: "آپ کا ریویو، تین طرح سے",
      hint2: "ایک چنیں اور جو چاہیں بدل دیں۔ ریویو آپ کا ہے۔",
      versions: ["بہت مختصر", "مختصر", "تھوڑا لمبا"],
      again: "دوبارہ لکھیں",
      edit: "آپ کا ریویو",
      copyOpen: "کاپی کریں اور گوگل کھولیں",
      copied: "کاپی ہو گیا۔ گوگل کھل رہا ہے…",
      copyFailed: "کاپی نہیں ہوا۔ متن کو دبا کر رکھیں اور کاپی کریں، پھر گوگل کھولیں۔",
      openOnly: "گوگل کھولیں",
      own: "خود لکھنا ہے",
      paste: (n) => `گوگل میں ${n} ستارے دبائیں، پھر باکس کو دبا کر رکھیں اور Paste چنیں۔`,
      back: "واپس",
    },
  },
};
