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
  skip: string;
  form: { message: string; name: string; phone: string; optional: string; send: string; sending: string; only: string };
  noGoogle: string;
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
    paste: (stars: number) => string;
    back: string;
    editHint: string;
  };
  // The private note's step, and the quieter way to Google under it (1 to 3 stars).
  note: { title: string; titleHappy: string; orGoogle: string; googleLink: string };
  // The last step.
  done: { title: string; google: (name: string) => string; note: string; again: string };
  stepOf: (step: number, of: number) => string;
};

export const COPY: Record<Lang, Copy> = {
  en: {
    thanks: "Thank you for visiting",
    question: "How was your visit?",
    hint: "Tap a star",
    labels: ["Bad", "Not good", "Okay", "Good", "Excellent"],
    starName: (n) => `${n} ${n === 1 ? "star" : "stars"}`,
    skip: "Go straight to Google",
    form: {
      message: "What should the owner know?",
      name: "Your name",
      phone: "Phone, for a reply",
      optional: "optional",
      send: "Send to the owner",
      sending: "Sending…",
      only: "Only the owner sees this. It is not posted anywhere.",
    },
    noGoogle: "Our Google review link is being set up. Meanwhile, you can send the owner a note.",
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
      paste: (n) => `In Google, tap ${n} ${n === 1 ? "star" : "stars"}, then hold the box and choose Paste.`,
      back: "Back",
      editHint: "Tap the text to change anything",
    },
    note: { title: "What went wrong?", titleHappy: "Send the owner a note", orGoogle: "Rather post it on Google?", googleLink: "Write a Google review" },
    done: { title: "Thank you!", google: (name) => `Your review helps other people find ${name}. It means a lot.`, note: "Your note went straight to the owner. Nobody else sees it.", again: "Copy again & open Google" },
    stepOf: (a, b) => `Step ${a} of ${b}`,
  },
  roman: {
    thanks: "Aane ka shukriya",
    question: "Aap ka visit kaisa raha?",
    hint: "Star par tap karein",
    labels: ["Bura", "Theek nahin", "Theek tha", "Acha", "Bohat acha"],
    starName: (n) => `${n} star`,
    skip: "Seedha Google par jayein",
    form: {
      message: "Owner ko kya batana chahte hain?",
      name: "Aap ka naam",
      phone: "Phone, jawab ke liye",
      optional: "zaroori nahin",
      send: "Owner ko bhejein",
      sending: "Bhej rahe hain…",
      only: "Yeh sirf owner dekhega. Kahin post nahin hota.",
    },
    noGoogle: "Hamara Google review link abhi set ho raha hai. Tab tak aap owner ko message bhej sakte hain.",
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
      paste: (n) => `Google mein ${n} star dabayein, phir box daba kar Paste karein.`,
      back: "Wapis",
      editHint: "Text par tap kar ke jo chahein badlein",
    },
    note: { title: "Kya ghalat hua?", titleHappy: "Owner ko message bhejein", orGoogle: "Google par likhna chahte hain?", googleLink: "Google review dein" },
    done: { title: "Shukriya!", google: (name) => `Aap ka review doosron ko ${name} tak pohanchne mein madad karta hai. Bohat shukriya.`, note: "Aap ka message seedha owner tak pohanch gaya. Koi aur nahin dekhega.", again: "Dobara copy karein aur Google kholein" },
    stepOf: (a, b) => `Step ${a} / ${b}`,
  },
  ur: {
    thanks: "آنے کا شکریہ",
    question: "آپ کا وزٹ کیسا رہا؟",
    hint: "ستارے پر ٹیپ کریں",
    labels: ["برا", "ٹھیک نہیں", "ٹھیک تھا", "اچھا", "بہت اچھا"],
    starName: (n) => `${n} ستارے`,
    skip: "سیدھا گوگل پر جائیں",
    form: {
      message: "آپ مالک کو کیا بتانا چاہتے ہیں؟",
      name: "آپ کا نام",
      phone: "فون، جواب کے لیے",
      optional: "اختیاری",
      send: "مالک کو بھیجیں",
      sending: "بھیج رہے ہیں…",
      only: "یہ صرف مالک دیکھے گا۔ کہیں پوسٹ نہیں ہوتا۔",
    },
    noGoogle: "ہمارا گوگل ریویو لنک ابھی تیار ہو رہا ہے۔ تب تک آپ مالک کو پیغام بھیج سکتے ہیں۔",
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
      paste: (n) => `گوگل میں ${n} ستارے دبائیں، پھر باکس دبا کر Paste کریں۔`,
      back: "واپس",
      editHint: "متن پر ٹیپ کر کے جو چاہیں بدلیں",
    },
    note: { title: "کیا غلط ہوا؟", titleHappy: "مالک کو پیغام بھیجیں", orGoogle: "گوگل پر لکھنا چاہتے ہیں؟", googleLink: "گوگل ریویو دیں" },
    done: { title: "شکریہ!", google: (name) => `آپ کا ریویو دوسروں کو ${name} تک پہنچنے میں مدد دیتا ہے۔ بہت شکریہ۔`, note: "آپ کا پیغام سیدھا مالک تک پہنچ گیا۔ کوئی اور نہیں دیکھے گا۔", again: "دوبارہ کاپی کریں اور گوگل کھولیں" },
    stepOf: (a, b) => `مرحلہ ${a} از ${b}`,
  },
};
