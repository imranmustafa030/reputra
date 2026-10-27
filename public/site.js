/* Reputra · static prototype */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("js");
  if (!reduced) root.classList.add("motion");

  /* ---------- smooth scroll, driven by GSAP's ticker so ScrollTrigger stays in step ---------- */
  let lenis = null;
  if (!reduced && window.Lenis && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    window.__lenis = lenis; // lets the screenshot script jump without smoothing
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // In-page links. "The card" lands inside the scroll film, on the card taken apart; and a long jump
  // cuts most of the way first, so the film never fast-forwards past you like a video.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", async (e) => {
      const id = a.getAttribute("href");
      const el = id === "#top" ? null : document.querySelector(id);
      if (id !== "#top" && !el) return;
      e.preventDefault();
      if (window.__card3d && id !== "#top") await window.__card3d(); // the stage's pin sets where everything below it sits
      const st = window.__stage;
      let y = id === "#top" ? 0 : el.getBoundingClientRect().top + scrollY - 24;
      if (id === "#how" && st) y = st.start + (st.end - st.start) * 0.08; // inside the film, on the first way in
      if (!lenis) { scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" }); return; }
      const near = innerHeight * 0.6;
      if (Math.abs(y - scrollY) > near * 2) lenis.scrollTo(y + (y > scrollY ? -near : near), { immediate: true, force: true });
      lenis.scrollTo(y, { duration: 1.1, force: true });
    });
  });

  /* ---------- headings rise in word by word ---------- */
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span");
            w.className = "w";
            const inner = document.createElement("span");
            inner.style.setProperty("--i", i++);
            inner.textContent = part;
            w.append(inner);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    walk(el);
    [...el.querySelectorAll(".w")].forEach((w) => w.setAttribute("aria-hidden", "true"));
    el.classList.add("words");
  }
  const heads = !reduced ? [...document.querySelectorAll("#hero-title, main .h2, .display--close")] : [];
  heads.forEach(splitWords);
  const heroTitle = document.getElementById("hero-title");
  if (heroTitle && heroTitle.classList.contains("words")) {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(() => heroTitle.classList.add("is-in")));
  }
  if (new URLSearchParams(location.search).has("dummy")) root.classList.add("show-dummy");

  /* ---------- WhatsApp links (⚑ D01: the number) ---------- */
  const WA = "923000000000";
  const FIRST = "Assalam o Alaikum! I'd like to start a free month of Reputra for my clinic.";
  document.querySelectorAll("[data-wa]").forEach((a) => {
    a.href = `https://wa.me/${WA}?text=${encodeURIComponent(a.dataset.msg || FIRST)}`;
  });

  /* ---------- nav: light text on the ink stage, ink text on bone ---------- */
  const nav = document.querySelector("[data-nav]");
  const darks = [...document.querySelectorAll(".intro, .stage, .grow, .estimate, .close, .footer")];
  function navTone() {
    if (root.dataset.theme === "light") { nav.classList.add("on-light"); return; } // in the light theme the bar is always light glass
    const y = nav.offsetHeight / 2;
    const overDark = darks.some((el) => {
      if (el.matches(".stage") && root.classList.contains("stage-opened")) return false;
      const r = el.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    });
    nav.classList.toggle("on-light", !overDark);
  }
  const links = [...document.querySelectorAll("[data-navlinks] a")];
  const pill = document.querySelector("[data-navpill]");
  const targets = links.map((a) => document.querySelector(a.getAttribute("href")));
  function navPlace() {
    nav.classList.toggle("is-scrolled", scrollY > 40);
    const line = innerHeight * 0.4;
    const i = targets.findIndex((el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top <= line && r.bottom > line; });
    links.forEach((a, j) => a.classList.toggle("is-current", j === i));
    if (!pill) return;
    if (i < 0) { pill.style.setProperty("--po", "0"); return; }
    const a = links[i], box = a.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
    pill.style.setProperty("--px", `${(r.left - box.left).toFixed(1)}px`);
    pill.style.setProperty("--pw", `${r.width.toFixed(1)}px`);
    pill.style.setProperty("--po", "1");
  }
  addEventListener("scroll", navPlace, { passive: true });
  addEventListener("resize", navPlace);
  navPlace();
  addEventListener("scroll", navTone, { passive: true });
  addEventListener("resize", navTone);
  addEventListener("stagechange", navTone);

  /* ---------- the theme: dark or light, remembered; the change spreads as a ripple from the switch ---------- */
  const themeBtn = document.querySelector("[data-theme-toggle]");
  const label = () => {
    const light = root.dataset.theme === "light";
    themeBtn.setAttribute("aria-pressed", String(light));
    themeBtn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
  };
  if (themeBtn) {
    label();
    themeBtn.addEventListener("click", () => {
      const next = root.dataset.theme === "light" ? "dark" : "light";
      const apply = () => {
        if (next === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
        try { localStorage.setItem("reputra-theme", next); } catch (e) { /* private mode: the choice lasts this visit */ }
        label();
        navTone();
      };
      if (reduced || !document.startViewTransition) { apply(); return; }
      const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.startViewTransition(apply).ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end.toFixed(0)}px at ${x}px ${y}px)`] },
          { duration: 800, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      });
    });
  }
  navTone();

  /* ---------- the world and the café, live ----------
     One map behind the hero and the stage: the real streets of Gulberg, Lahore (© OpenStreetMap contributors).
     On arrival the camera glides in from the city to MM Alam Road; on scroll it moves in to the café for the stage.
     The café and its customers are an illustration (⚑ D41, D42). */
  const world = document.querySelector("[data-world]");
  const map = document.querySelector("[data-map]");
  const pins = document.querySelector("[data-map-pins]");
  const cafe = document.querySelector("[data-system]");
  if (world && map && pins && cafe) {
    const stage = document.querySelector(".stage"), layers = [map, pins], rigs = [...world.querySelectorAll("[data-rig]")];
    const cssCamera = CSS.supports("animation-timeline: scroll()"); // the scroll path runs in the browser itself (site.css)
    const pin = pins.querySelector("[data-pin]"), others = [...pins.querySelectorAll(".pin:not([data-pin]), .map__street")]; // the neighbours and the street name leave as the camera moves in
    const CAFE = [0.46875, 0.5208], RATIO = 1760 / 2000;
    let t0 = performance.now();
    const FLY = reduced ? 0 : 2600;
    // the streets arrive as markup (preloaded in the head), so the browser draws only the tiles on screen;
    // the camera's flight starts when they are in, and an early arrival changes nothing
    const streets = map.querySelector("[data-streets]");
    fetch("img/gulberg.svg")
      .then((r) => (r.ok ? r.text() : Promise.reject(r.status)))
      .then((svg) => { streets.innerHTML = svg; })
      .catch(() => {})
      .finally(() => { if (performance.now() - t0 > 120) t0 = performance.now(); map.classList.add("is-in"); queue(); });
    let w0 = 1800, mx = 0, my = 0, px = 0, py = 0, queued = false;
    const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
    const outExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
    const phone = () => innerWidth < 861;
    const measure = () => {
      w0 = Math.max(innerWidth * (phone() ? 1.9 : 0.95), phone() ? 760 : 1300);
      layers.forEach((el) => {
        el.style.width = `${w0.toFixed(0)}px`;
        el.style.left = `${(-CAFE[0] * w0).toFixed(0)}px`;
        el.style.top = `${(-CAFE[1] * w0 * RATIO).toFixed(0)}px`;
      });
      frame();
    };
    // every write is skipped when its value has not changed: an unchanged custom property still restyles and repaints
    const last = new Map();
    const put = (el, key, value) => {
      const prev = last.get(el);
      if (prev && prev[key] === value) return;
      last.set(el, { ...prev, [key]: value });
      if (key.startsWith("--")) el.style.setProperty(key, value); else el.style[key] = value;
    };
    const frame = () => {
      queued = false;
      const away = stage.getBoundingClientRect().bottom < 0; // read before any write, so the frame never forces a layout
      px += (mx - px) * 0.08; py += (my - py) * 0.08;
      const vw = innerWidth, vh = innerHeight, y = scrollY;
      const fly = FLY ? outExpo(Math.min(1, (performance.now() - t0) / FLY)) : 1;
      const t = ease(Math.min(1, Math.max(0, (y - vh * 0.1) / (vh * 1.1))));
      // the café sits upper right in the hero (scrolling with the page), then at the counter in the stage
      const hx = vw * (phone() ? 0.14 : 0.64), hy = vh * (phone() ? 0.19 : 0.38) - y; // phones: up and left, clear of the words
      const sx = vw * (vw < 761 ? 0.5 : 0.66), sy = vh * (vw < 761 ? 0.62 : 0.6);
      // inside the rig: the flythrough (from the city in to the street) and the hand's parallax
      const near = 0.62 + 0.38 * fly;
      const inner = `translate3d(${(-px * 14).toFixed(1)}px, ${(-py * 10).toFixed(1)}px, 0) scale(${near.toFixed(3)})`;
      layers.forEach((el) => put(el, "transform", inner));
      put(pins, "--fly", near.toFixed(3));
      if (!cssCamera) { // the rig: the scroll path, here only where the browser cannot run it itself
        const zoom = (1 + 2.4 * t).toFixed(3);
        const move = `translate3d(${(hx + (sx - hx) * t).toFixed(1)}px, ${(hy + (sy - hy) * t).toFixed(1)}px, 0) scale(${zoom})`;
        rigs.forEach((el) => { put(el, "transform", move); put(el, "--zoom", zoom); });
      }
      put(world, "--z", t.toFixed(3));
      others.forEach((el) => put(el, "opacity", Math.max(0, 1 - t * 2.4).toFixed(2)));
      put(pin, "opacity", Math.max(0, 1 - Math.max(0, t - 0.55) * 4).toFixed(2)); // the café hands over to the stand
      put(cafe, "opacity", Math.max(0, 1 - t * 3).toFixed(2));
      if (world.classList.contains("is-away") !== away) world.classList.toggle("is-away", away);
      if (fly >= 1 && !window.__landed) { window.__landed = true; dispatchEvent(new Event("reputra:landed")); } // the heavy 3D stage waits for this
      if (fly < 1 || Math.abs(mx - px) > 0.002 || Math.abs(my - py) > 0.002) queue();
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    addEventListener("scroll", queue, { passive: true });
    addEventListener("resize", measure);
    if (!reduced) addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return; // a finger scrolling the page is not a hand looking around
      mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; queue();
    }, { passive: true });
    measure();

    /* the month: reviews arrive as notifications; the rating is the real average of every review */
    const out = (k) => cafe.querySelector(`[data-${k}]`);
    const toasts = out("toasts");
    const VIA = { stand: "Counter stand", card: "Tap card", wa: "WhatsApp" };
    const PEOPLE = ["Ayesha K.", "Bilal R.", "Hira S.", "Usman T.", "Zainab M.", "Hamza A.", "Sana F.", "Ali R.", "Iqra N.", "Danish H.", "Mahnoor J.", "Fahad Q."];
    const initials = (name) => name.replace(/\./g, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const stars = (k) => `<span class="panel__stars" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i${i > k ? ' class="is-off"' : ""}></i>`).join("")}</span>`;
    const counts = { 5: 8, 4: 5, 3: 3, 2: 1, 1: 1 }; // the café's 18 reviews before Reputra: a 4.0
    const TARGET = 64;
    const total = () => Object.values(counts).reduce((a, b) => a + b, 0);
    const show = () => {
      const n = total(), sum = Object.entries(counts).reduce((a, [k, v]) => a + k * v, 0), rating = (sum / n).toFixed(1);
      out("reviews").textContent = n;
      out("pinrating").textContent = rating;
      out("rank").textContent = rating >= 4.7 ? 1 : rating >= 4.45 ? 2 : 3; // the cafés around it sit at 4.3–4.5
    };
    let who = 0, arrivals = 0;
    const notify = (key, k) => {
      const name = PEOPLE[who++ % PEOPLE.length], el = document.createElement("p");
      el.className = "toast";
      el.innerHTML = `<i class="toast__avatar">${initials(name)}</i>${stars(k)}<b>${name}</b> via ${VIA[key]}`;
      toasts.append(el);
      setTimeout(() => el.remove(), 3300);
    };
    if (reduced) { counts[5] += TARGET - total(); show(); }
    else {
      show();
      const order = ["stand", "wa", "card", "stand", "card", "wa", "stand"];
      let i = 0, onScreen = false, timer = 0, running = false, started = false;
      const send = () => {
        running = false;
        if (!onScreen) return; // the loop rests while the hero is off screen
        running = true;
        const key = order[i++ % order.length], k = ++arrivals % 6 === 0 ? 4 : 5;
        // the month runs to its 64 reviews and the numbers settle there; the notifications keep coming
        if (total() < TARGET) counts[k] += 1;
        pin.classList.remove("is-hit"); void pin.offsetWidth; pin.classList.add("is-hit");
        show();
        notify(key, k);
        timer = setTimeout(send, total() < TARGET ? 1500 : 3600);
      };
      new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen && !running) { clearTimeout(timer); timer = setTimeout(send, started ? 700 : 2600); started = true; }
      }).observe(document.querySelector(".intro"));
    }
  }

  /* ---------- the customer's page, live ---------- */
  const review = document.querySelector("[data-review]");
  const body = review.querySelector(".review__body");
  const stars = [...review.querySelectorAll(".review__stars button")];
  const toast = review.querySelector("[data-toast]");
  // ⚑ D34: Urdu copy to be checked by a native writer
  const COPY = {
    en: {
      q: "How was your visit?",
      btn: "Review us on Google",
      private: "Send private feedback",
      google: "Next, Google's own review box opens. The patient writes and posts it there.",
      privateDone: "This goes only to the clinic. The Google button stays on the screen.",
      thanks: ["Sorry to hear that.", "Thank you for telling us.", "Thank you.", "Thank you!", "Thank you!"],
    },
    ro: {
      q: "Aap ka experience kaisa tha?",
      btn: "Google pe review dein",
      private: "Private feedback bhejein",
      google: "Ab Google ka apna review box khulega. Patient wahan likh kar post karta hai.",
      privateDone: "Yeh sirf clinic ko jata hai. Google ka button screen pe rehta hai.",
      thanks: ["Afsos hua.", "Batane ka shukriya.", "Shukriya.", "Shukriya!", "Bohat shukriya!"],
    },
    ur: {
      q: "آپ کا تجربہ کیسا رہا؟",
      btn: "گوگل پر ریویو دیں",
      private: "نجی رائے بھیجیں",
      google: "اب گوگل کا اپنا ریویو باکس کھلے گا۔ مریض وہاں لکھ کر پوسٹ کرتا ہے۔",
      privateDone: "یہ صرف کلینک کو جاتا ہے۔ گوگل کا بٹن اسکرین پر رہتا ہے۔",
      thanks: ["افسوس ہوا۔", "بتانے کا شکریہ۔", "شکریہ۔", "شکریہ!", "بہت شکریہ!"],
    },
  };
  let lang = "ro", rating = 0;
  function say(text) {
    toast.classList.remove("is-on");
    requestAnimationFrame(() => { toast.textContent = text; toast.classList.add("is-on"); });
  }
  function setLang(next) {
    lang = next;
    const c = COPY[lang];
    review.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    body.dir = lang === "ur" ? "rtl" : "ltr";
    body.lang = lang === "ur" ? "ur" : lang === "ro" ? "ur-Latn" : "en";
    review.querySelectorAll("[data-t]").forEach((el) => (el.textContent = c[el.dataset.t]));
    toast.classList.remove("is-on");
  }
  review.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));

  // ⚑ D15: sample businesses, one per kind
  const KINDS = {
    cafe: { logo: "BC", name: "Bloom Café", area: "MM Alam Road, Lahore", url: "bloom-cafe" },
    salon: { logo: "GS", name: "Glow Salon", area: "DHA Phase 6, Lahore", url: "glow-salon" },
    clinic: { logo: "SD", name: "Smile Dental", area: "Johar Town, Lahore", url: "smile-dental" },
    gym: { logo: "IG", name: "Iron Gym", area: "Gulberg III, Lahore", url: "iron-gym" },
    shop: { logo: "HM", name: "Hafeez Mobiles", area: "Hafeez Centre, Lahore", url: "hafeez-mobiles" },
  };
  document.querySelectorAll("[data-kind]").forEach((btn) => btn.addEventListener("click", () => {
    document.querySelectorAll("[data-kind]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    const k = KINDS[btn.dataset.kind];
    review.classList.add("is-swapping");
    setTimeout(() => {
      review.querySelector('[data-b="logo"]').textContent = k.logo;
      review.querySelector('[data-b="name"]').textContent = k.name;
      review.querySelector('[data-b="area"]').textContent = k.area;
      review.querySelector('[data-b="url"]').textContent = `reputra.pk/r/${k.url}`;
      rating = 0;
      stars.forEach((t) => { t.classList.remove("is-lit"); t.setAttribute("aria-checked", "false"); });
      toast.classList.remove("is-on");
      review.classList.remove("is-swapping");
    }, reduced ? 0 : 220);
  }));
  stars.forEach((s, i) => {
    s.addEventListener("click", () => {
      rating = i + 1;
      stars.forEach((t, j) => {
        t.classList.toggle("is-lit", j < rating);
        t.setAttribute("aria-checked", String(j === i));
        t.classList.remove("is-pop");
      });
      if (!reduced) { void s.offsetWidth; s.classList.add("is-pop"); }
      say(COPY[lang].thanks[i]);
    });
    s.addEventListener("pointerenter", () => stars.forEach((t, j) => t.classList.toggle("is-lit", j <= i)));
    s.addEventListener("pointerleave", () => stars.forEach((t, j) => t.classList.toggle("is-lit", j < rating)));
  });
  review.querySelector("[data-google]").addEventListener("click", () => say(COPY[lang].google));
  review.querySelector(".review__private").addEventListener("click", () => say(COPY[lang].privateDone));

  /* ---------- reveals ---------- */
  const revealables = [...document.querySelectorAll(".try__copy > *, .review, .grow__copy > *, .maps, .rules__head > *, .rules__list li, .founder, .promise__offer, .month__head > *, .card, .estimate__copy > *, .estimate__result, .pricing__head > *, .plan, .faq__list, .close > *")]
    .filter((el) => !el.classList.contains("words"));
  const month = document.querySelector(".month__grid");
  if (!reduced && "IntersectionObserver" in window) {
    revealables.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const sibs = [...e.target.parentElement.children].filter((c) => c.classList.contains("reveal"));
        e.target.style.transitionDelay = `${Math.max(0, sibs.indexOf(e.target)) * 80}ms`;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealables.forEach((el) => io.observe(el));
    heads.filter((h) => h.id !== "hero-title").forEach((h) => io.observe(h));

    // the month comes alive once: the count runs up, the bars grow
    const big = month.querySelector(".bigfig span:last-child");
    const mo = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      mo.disconnect();
      month.classList.add("is-live");
      count(big, 18, 64, 1600);
    }, { threshold: 0.35 });
    month.classList.add("is-waiting");
    mo.observe(month);
  }
  // Google Maps: as the reviews come in, you climb from third to first
  const maps = document.querySelector("[data-maps]");
  if (maps && !reduced && "IntersectionObserver" in window) {
    const you = maps.querySelector('[data-row="you"]');
    const r = you.querySelector("[data-r]"), nn = you.querySelector("[data-n]");
    const others = [...maps.querySelectorAll('[data-row]:not([data-row="you"])')];
    const go = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      go.disconnect();
      count(r, 4.1, 4.8, 2600, 1);
      count(nn, 18, 64, 2600, 0);
      setTimeout(() => { you.style.setProperty("--pos", 1); others[1].style.setProperty("--pos", 2); }, 1100);
      setTimeout(() => { you.style.setProperty("--pos", 0); others[0].style.setProperty("--pos", 1); }, 2100);
    }, { threshold: 0.6 });
    go.observe(maps);
  }

  // the hero chips count up once, as the page arrives
  if (!reduced) {
    document.querySelectorAll(".chips [data-count]").forEach((el) => {
      const [from, to, dp] = el.dataset.count.split(":").map(Number);
      el.textContent = from.toFixed(dp);
      setTimeout(() => count(el, from, to, 2200, dp), 1100);
    });
  }

  function count(el, from, to, ms, dp = 0) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 4);
      el.textContent = (from + (to - from) * e).toFixed(dp);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- the estimate (⚑ D12 rate, D13 days, D14 defaults) ---------- */
  const est = document.querySelector("[data-estimate]");
  const RATE = 0.08, DAYS = 26;
  const inP = est.querySelector('[data-in="patients"]'), inR = est.querySelector('[data-in="reviews"]');
  const out = (k) => est.querySelectorAll(`[data-out="${k}"]`);
  function calc() {
    const p = +inP.value, r = +inR.value, add = Math.round(p * DAYS * RATE);
    out("patients").forEach((o) => (o.textContent = p));
    out("patients2").forEach((o) => (o.textContent = p));
    out("reviews").forEach((o) => (o.textContent = r));
    out("reviews2").forEach((o) => (o.textContent = r));
    out("added").forEach((o) => (o.textContent = add));
    out("total").forEach((o) => {
      const from = +o.textContent || 0, to = r + add;
      if (reduced || from === to) o.textContent = to;
      else count(o, from, to, 450);
    });
    [inP, inR].forEach((i) => i.style.setProperty("--fill", `${((i.value - i.min) / (i.max - i.min)) * 100}%`));
  }
  [inP, inR].forEach((i) => i.addEventListener("input", calc));
  calc();
})();
