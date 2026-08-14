// ============================================================================
//  CONTENT FILE  —  edit this file to update your site's text & data.
//  The template reads everything from here. You don't need to touch page.tsx
//  to change name, books, articles, tutorials, social links, etc.
// ============================================================================

export type Lang = "en" | "de" | "fa";

export const DEFAULT_LANG: Lang = "en";
export const LANGS: Lang[] = ["en", "de", "fa"];

// ----------------------------------------------------------------------------
//  PERSONAL INFO  —  replace with your own
// ----------------------------------------------------------------------------
export const PERSONAL = {
  // Display name / handle shown in the navbar, hero, footer
  // This is your username/brand name (e.g. "max_mustermann" or "your_name")
  handle: "your_name",
  fullName: {
    en: "Your Name",
    de: "Ihr Name",
    fa: "اسم شما",
  },
  // Short tagline shown under the hero name
  tagline: {
    en: "RF/Microwave Researcher · AI/ML Programmer · Writer & Translator",
    de: "RF/Mikrowellen-Forscher · AI/ML-Programmierer · Autor & Übersetzer",
    fa: "پژوهشگر RF/مایکروویو · برنامه‌نویس AI/ML · نویسنده و مترجم",
  },
  // No public email shown on site — admin sees messages via panel or Bale
  // Admin password to view messages at #admin
  adminPassword: "admin123",
};

// ----------------------------------------------------------------------------
//  RF LAB EQUIPMENT — shown as a styled "equipment rack" in the About section
//  These names reinforce the RF/electronic engineering identity.
// ----------------------------------------------------------------------------
export const RF_EQUIPMENT = [
  { id: "vna", name: "Vector Network Analyzer", model: "Keysight PNA-X", status: "online" },
  { id: "sa", name: "Spectrum Analyzer", model: "R&S FSW", status: "online" },
  { id: "sg", name: "Signal Generator", model: "Keysight EXG", status: "online" },
  { id: "osc", name: "Oscilloscope", model: "Tektronix MSO64", status: "standby" },
  { id: "pm", name: "Power Meter", model: "Anritsu ML2495", status: "online" },
  { id: "fc", name: "Frequency Counter", model: "Keysight 53220A", status: "standby" },
  { id: "ac", name: "Anechoic Chamber", model: "ETS-Lindgren", status: "online" },
  { id: "sim", name: "EM Simulator", model: "CST Studio / HFSS", status: "online" },
];

// ----------------------------------------------------------------------------
//  SOCIAL LINKS  —  shown as styled chips in the hero & contact
// ----------------------------------------------------------------------------
export const SOCIALS = [
  { id: "github", label: "GitHub", url: "https://github.com/", handle: "your_handle" },
  { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/", handle: "your_handle" },
  { id: "devto", label: "dev.to", url: "https://dev.to/", handle: "your_handle" },
  { id: "medium", label: "Medium", url: "https://medium.com/@", handle: "your_handle" },
];

// ----------------------------------------------------------------------------
//  SKILLS  —  grouped by category
// ----------------------------------------------------------------------------
export const SKILLS: { category: { en: string; de: string; fa: string }; items: string[] }[] = [
  {
    category: { en: "RF & Microwave", de: "RF & Mikrowelle", fa: "RF و مایکروویو" },
    items: ["Antenna Design", "EM Simulation (CST/HFSS)", "S-Parameters", "Matching Networks", "Waveguide", "Phased Arrays"],
  },
  {
    category: { en: "AI / Machine Learning", de: "KI / Maschinelles Lernen", fa: "هوش مصنوعی / یادگیری ماشین" },
    items: ["Python", "PyTorch", "TensorFlow", "Signal Processing", "Deep Learning", "Scientific Computing"],
  },
  {
    category: { en: "Programming", de: "Programmierung", fa: "برنامه‌نویسی" },
    items: ["Python", "MATLAB", "C/C++", "JavaScript", "Bash", "LaTeX"],
  },
  {
    category: { en: "Writing & Translation", de: "Schreiben & Übersetzung", fa: "نویسندگی و ترجمه" },
    items: ["Technical Writing", "EN ↔ DE ↔ FA", "Editing", "Documentation", "Blogging"],
  },
];

// ----------------------------------------------------------------------------
//  BOOKS  —  published / translated books
// ----------------------------------------------------------------------------
export const BOOKS = [
  {
    id: "b1",
    title: {
      en: "Book Title One",
      de: "Buchtitel Eins",
      fa: "عنوان کتاب اول",
    },
    year: "2024",
    publisher: { en: "Publisher Name", de: "Verlag", fa: "ناشر" },
    description: {
      en: "A short description of what this book is about, who it's for, and the main topics it covers.",
      de: "Eine kurze Beschreibung des Buches, der Zielgruppe und der behandelten Themen.",
      fa: "توضیح کوتاهی درباره‌ی موضوع کتاب، مخاطب و مباحث اصلی.",
    },
    cover: "linear-gradient(135deg,#003b00,#00ff41)",
    link: "#",
  },
  {
    id: "b2",
    title: {
      en: "Book Title Two",
      de: "Buchtitel Zwei",
      fa: "عنوان کتاب دوم",
    },
    year: "2023",
    publisher: { en: "Another Publisher", de: "Anderer Verlag", fa: "ناشر دیگر" },
    description: {
      en: "A short description of the second book. Replace with your real publication info.",
      de: "Kurze Beschreibung des zweiten Buches. Durch echte Angaben ersetzen.",
      fa: "توضیح کوتاه کتاب دوم. با اطلاعات واقعی جایگزین کنید.",
    },
    cover: "linear-gradient(135deg,#001f3f,#0074D9)",
    link: "#",
  },
  {
    id: "b3",
    title: {
      en: "Book Title Three",
      de: "Buchtitel Drei",
      fa: "عنوان کتاب سوم",
    },
    year: "2022",
    publisher: { en: "Third Publisher", de: "Dritter Verlag", fa: "ناشر سوم" },
    description: {
      en: "Another book description. Add as many as you need in the BOOKS array.",
      de: "Weitere Buchbeschreibung. Beliebig viele im BOOKS-Array ergänzbar.",
      fa: "توضیح کتاب دیگر. به تعداد دلخواه در آرایه BOOKS اضافه کنید.",
    },
    cover: "linear-gradient(135deg,#3b0050,#a855f7)",
    link: "#",
  },
];

// ----------------------------------------------------------------------------
//  ARTICLES  —  published articles, papers, blog posts
// ----------------------------------------------------------------------------
export const ARTICLES = [
  {
    id: "a1",
    title: {
      en: "Article Title One",
      de: "Artikeltitel Eins",
      fa: "عنوان مقاله اول",
    },
    venue: { en: "Journal / Blog Name", de: "Zeitschrift / Blog", fa: "نام مجله / وبلاگ" },
    date: "2024-09",
    type: { en: "Research Paper", de: "Forschungspapier", fa: "مقاله پژوهشی" },
    summary: {
      en: "Short summary of the article's main argument, methods, or contribution.",
      de: "Kurze Zusammenfassung des Artikels: Argument, Methode, Beitrag.",
      fa: "خلاصه‌ی کوتاه مقاله: استدلال، روش یا مشارکت.",
    },
    link: "#",
  },
  {
    id: "a2",
    title: {
      en: "Article Title Two",
      de: "Artikeltitel Zwei",
      fa: "عنوان مقاله دوم",
    },
    venue: { en: "Another Venue", de: "Andere Publikation", fa: "ناشر دیگر" },
    date: "2024-04",
    type: { en: "Tutorial", de: "Tutorial", fa: "آموزش" },
    summary: {
      en: "Brief summary of what this tutorial covers and who it's for.",
      de: "Kurze Zusammenfassung des Tutorials und der Zielgruppe.",
      fa: "خلاصه‌ی کوتاه آموزش و مخاطب.",
    },
    link: "#",
  },
  {
    id: "a3",
    title: {
      en: "Article Title Three",
      de: "Artikeltitel Drei",
      fa: "عنوان مقاله سوم",
    },
    venue: { en: "Blog Post", de: "Blogbeitrag", fa: "پست وبلاگ" },
    date: "2023-11",
    type: { en: "Essay", de: "Essay", fa: "مقاله" },
    summary: {
      en: "Short description of the essay's topic and angle.",
      de: "Kurze Beschreibung des Themas und Ansatzes.",
      fa: "توضیح کوتاه موضوع و زاویه‌ی مقاله.",
    },
    link: "#",
  },
  {
    id: "a4",
    title: {
      en: "Article Title Four",
      de: "Artikeltitel Vier",
      fa: "عنوان مقاله چهارم",
    },
    venue: { en: "Conference", de: "Konferenz", fa: "کنفرانس" },
    date: "2023-06",
    type: { en: "Conference Paper", de: "Konferenzbeitrag", fa: "مقاله کنفرانسی" },
    summary: {
      en: "Brief summary of this conference paper.",
      de: "Kurze Zusammenfassung des Konferenzbeitrags.",
      fa: "خلاصه‌ی کوتاه مقاله کنفرانس.",
    },
    link: "#",
  },
];

// ----------------------------------------------------------------------------
//  TUTORIALS  —  video tutorials embedded as iframes (e.g. Aparat, YouTube)
//  embedUrl must be the EMBED url, not the watch url.
//  Aparat:  https://www.aparat.com/video/video/embed/videohash/XXXX/vframe
//  YouTube: https://www.youtube.com/embed/XXXX
// ----------------------------------------------------------------------------
export const TUTORIALS = [
  {
    id: "t1",
    title: {
      en: "Tutorial One — Intro",
      de: "Tutorial Eins — Einführung",
      fa: "آموزش اول — مقدمه",
    },
    duration: "12:34",
    level: { en: "Beginner", de: "Anfänger", fa: "مقدماتی" },
    description: {
      en: "Short description of what this tutorial covers and what you'll learn.",
      de: "Kurze Beschreibung des Tutorials und der Lerninhalte.",
      fa: "توضیح کوتاه آموزش و مباحثی که یاد می‌گیرید.",
    },
    embedUrl: "https://www.aparat.com/video/video/embed/videohash/example1/vframe",
    platform: "aparat",
  },
  {
    id: "t2",
    title: {
      en: "Tutorial Two — Hands-On",
      de: "Tutorial Zwei — Praxis",
      fa: "آموزش دوم — عملی",
    },
    duration: "23:45",
    level: { en: "Intermediate", de: "Fortgeschritten", fa: "متوسط" },
    description: {
      en: "Short description of the second tutorial.",
      de: "Kurze Beschreibung des zweiten Tutorials.",
      fa: "توضیح کوتاه آموزش دوم.",
    },
    embedUrl: "https://www.aparat.com/video/video/embed/videohash/example2/vframe",
    platform: "aparat",
  },
  {
    id: "t3",
    title: {
      en: "Tutorial Three — Deep Dive",
      de: "Tutorial Drei — Vertiefung",
      fa: "آموزش سوم — پیشرفته",
    },
    duration: "45:12",
    level: { en: "Advanced", de: "Fortgeschritten", fa: "پیشرفته" },
    description: {
      en: "Short description of the third tutorial.",
      de: "Kurze Beschreibung des dritten Tutorials.",
      fa: "توضیح کوتاه آموزش سوم.",
    },
    embedUrl: "https://www.aparat.com/video/video/embed/videohash/example3/vframe",
    platform: "aparat",
  },
  {
    id: "t4",
    title: {
      en: "Tutorial Four — Project",
      de: "Tutorial Vier — Projekt",
      fa: "آموزش چهارم — پروژه",
    },
    duration: "38:20",
    level: { en: "Intermediate", de: "Fortgeschritten", fa: "متوسط" },
    description: {
      en: "Short description of the fourth tutorial.",
      de: "Kurze Beschreibung des vierten Tutorials.",
      fa: "توضیح کوتاه آموزش چهارم.",
    },
    embedUrl: "https://www.aparat.com/video/video/embed/videohash/example4/vframe",
    platform: "aparat",
  },
];

// ----------------------------------------------------------------------------
//  UI STRINGS  —  interface labels in all 3 languages
// ----------------------------------------------------------------------------
export const UI = {
  en: {
    dir: "ltr",
    nav: { about: "about", skills: "skills", books: "books", articles: "articles", tutorials: "tutorials", chat: "chat", contact: "contact" },
    hero: {
      prompt: "guest@portfolio:~$",
      greeting: "Hello, world.",
      intro: "Type `help` and press Enter to explore.",
      cta: "View work",
      ctaContact: "Contact",
    },
    about: {
      num: "01", label: "about",
      title: "Whoami",
      p1: "I'm a researcher working at the intersection of RF/Microwave engineering and AI. My work spans antenna design, electromagnetic simulation, and machine-learning applied to signals and RF systems.",
      p2: "Beyond the lab, I write technical articles, translate between EN/DE/FA, and produce video tutorials to make complex topics approachable. Always open to collaboration on research and writing.",
      stats: [
        { v: "5+", l: "Years in research" },
        { v: "20+", l: "Publications" },
        { v: "100+", l: "Tutorials published" },
        { v: "3", l: "Languages written in" },
      ],
      factsTitle: "/etc/info",
      facts: [
        { k: "location", v: "Earth 🌍" },
        { k: "languages", v: "EN · DE · FA" },
        { k: "focus", v: "RF · AI · Writing" },
        { k: "status", v: "available" },
      ],
    },
    skills: {
      num: "02", label: "skills",
      title: "Toolbox",
      subtitle: "// what I work with",
    },
    books: {
      num: "03", label: "books",
      title: "Books",
      subtitle: "// written & translated",
      year: "Year",
      publisher: "Publisher",
      view: "open →",
    },
    articles: {
      num: "04", label: "articles",
      title: "Articles & Papers",
      subtitle: "// selected writing",
      read: "read →",
    },
    tutorials: {
      num: "05", label: "tutorials",
      title: "Tutorials",
      subtitle: "// video lessons",
      watch: "watch →",
      close: "close [esc]",
      duration: "Duration",
      level: "Level",
    },
    contact: {
      num: "06", label: "contact",
      title: "Open Channel",
      subtitle: "// open a channel",
      desc: "Have a project, question, or just want to talk? Drop a message via the form below — I read everything and reply within a day or two. No email exposed; your message goes straight to my private inbox.",
      socialsLabel: "channels",
      form: {
        name: "Name", namePh: "Jane Doe",
        email: "Your Email (for reply)", emailPh: "jane@example.com",
        message: "Message", messagePh: "Type your message...",
        submit: "send [enter]",
        sending: "transmitting...",
        success: "✓ message received. thank you!",
        errors: {
          missing: "All fields required.",
          email: "Invalid email format.",
          short: "Message too short (min 10 chars).",
          rate: "Rate limit. Try again in 10 min.",
          spam: "Message flagged as spam.",
          server: "Server error. Try later.",
        },
      },
    },
    terminal: {
      welcome: "Welcome. Type `help` for available commands.",
      unknown: (cmd: string) => `command not found: ${cmd}. Type 'help'.`,
      help: [
        "Available commands:",
        "  help     — show this list",
        "  about    — who I am",
        "  skills   — what I do",
        "  books    — published books",
        "  articles — articles & papers",
        "  tutorials— video tutorials",
        "  contact  — how to reach me",
        "  social   — social links",
        "  whoami   — short intro",
        "  clear    — clear terminal",
        "  date     — current UTC time",
        "  scan     — scan RF spectrum",
        "  chat     — jump to AI chat",
      ].join("\n"),
      cleared: "",
    },
    footer: { built: "Built with care.", admin: "admin" },
    toTop: "Back to top",
    admin: {
      title: "// MESSAGE LOG",
      subtitle: "Authenticated. Messages stored in DB.",
      passwordLabel: "Password",
      passwordPh: "enter admin password",
      unlock: "unlock",
      wrong: "Wrong password.",
      empty: "No messages yet.",
      from: "from",
      at: "at",
      back: "← back to site",
    },
  },
  de: {
    dir: "ltr",
    nav: { about: "über", skills: "fähigkeiten", books: "bücher", articles: "artikel", tutorials: "tutorials", chat: "chat", contact: "kontakt" },
    hero: {
      prompt: "guest@portfolio:~$",
      greeting: "Hallo, Welt.",
      intro: "`help` eingeben und Enter drücken zum Erkunden.",
      cta: "Arbeiten ansehen",
      ctaContact: "Kontakt",
    },
    about: {
      num: "01", label: "über",
      title: "Whoami",
      p1: "Ich bin Forscher an der Schnittstelle von RF/Mikrowellentechnik und KI. Meine Arbeit umfasst Antennendesign, elektromagnetische Simulation und maschinelles Lernen für Signale und RF-Systeme.",
      p2: "Neben der Forschung schreibe ich technische Artikel, übersetze zwischen EN/DE/FA und erstelle Video-Tutorials, um komplexe Themen zugänglich zu machen. Immer offen für Zusammenarbeit.",
      stats: [
        { v: "5+", l: "Jahre Forschung" },
        { v: "20+", l: "Publikationen" },
        { v: "100+", l: "Tutorials" },
        { v: "3", l: "Sprachen" },
      ],
      factsTitle: "/etc/info",
      facts: [
        { k: "ort", v: "Erde 🌍" },
        { k: "sprachen", v: "EN · DE · FA" },
        { k: "fokus", v: "RF · AI · Schreiben" },
        { k: "status", v: "verfügbar" },
      ],
    },
    skills: {
      num: "02", label: "fähigkeiten",
      title: "Werkzeugkasten",
      subtitle: "// womit ich arbeite",
    },
    books: {
      num: "03", label: "bücher",
      title: "Bücher",
      subtitle: "// geschrieben & übersetzt",
      year: "Jahr",
      publisher: "Verlag",
      view: "öffnen →",
    },
    articles: {
      num: "04", label: "artikel",
      title: "Artikel & Papiere",
      subtitle: "// ausgewählte Texte",
      read: "lesen →",
    },
    tutorials: {
      num: "05", label: "tutorials",
      title: "Tutorials",
      subtitle: "// Video-Lektionen",
      watch: "ansehen →",
      close: "schließen [esc]",
      duration: "Dauer",
      level: "Niveau",
    },
    contact: {
      num: "06", label: "kontakt",
      title: "Kanal öffnen",
      subtitle: "// Kanal öffnen",
      desc: "Projekt, Frage oder einfach Hallo? Nachricht über das Formular — ich antworte innerhalb von 1–2 Tagen. Keine E-Mail öffentlich; Nachricht geht an meinen privaten Posteingang.",
      socialsLabel: "kanäle",
      form: {
        name: "Name", namePh: "Max Mustermann",
        email: "Deine E-Mail (für Antwort)", emailPh: "max@example.com",
        message: "Nachricht", messagePh: "Nachricht eingeben...",
        submit: "senden [enter]",
        sending: "übertrage...",
        success: "✓ Nachricht erhalten. Danke!",
        errors: {
          missing: "Alle Felder erforderlich.",
          email: "Ungültiges E-Mail-Format.",
          short: "Nachricht zu kurz (min 10).",
          rate: "Rate-Limit. In 10 Min. erneut.",
          spam: "Nachricht als Spam markiert.",
          server: "Serverfehler. Später erneut.",
        },
      },
    },
    terminal: {
      welcome: "Willkommen. `help` für verfügbare Befehle.",
      unknown: (cmd: string) => `Befehl nicht gefunden: ${cmd}. 'help' eingeben.`,
      help: [
        "Verfügbare Befehle:",
        "  help     — diese Liste",
        "  about    — wer ich bin",
        "  skills   — was ich tue",
        "  books    — veröffentlichte Bücher",
        "  articles — Artikel & Papiere",
        "  tutorials— Video-Tutorials",
        "  contact  — Kontakt",
        "  social   — soziale Links",
        "  whoami   — kurze Vorstellung",
        "  clear    — Terminal leeren",
        "  date     — aktuelle UTC-Zeit",
        "  scan     — RF-Spektrum scannen",
        "  chat     — zum KI-Chat",
      ].join("\n"),
      cleared: "",
    },
    footer: { built: "Mit Sorgfalt erstellt.", admin: "admin" },
    toTop: "Nach oben",
    admin: {
      title: "// NACHRICHTEN-PROTOKOLL",
      subtitle: "Authentifiziert. Nachrichten in DB gespeichert.",
      passwordLabel: "Passwort",
      passwordPh: "Admin-Passwort eingeben",
      unlock: "entsperren",
      wrong: "Falsches Passwort.",
      empty: "Keine Nachrichten.",
      from: "von",
      at: "um",
      back: "← zurück zur Site",
    },
  },
  fa: {
    dir: "rtl",
    nav: { about: "درباره", skills: "مهارت‌ها", books: "کتاب‌ها", articles: "مقالات", tutorials: "آموزش‌ها", chat: "گفت‌وگو", contact: "تماس" },
    hero: {
      prompt: "guest@portfolio:~$",
      greeting: "سلام، دنیا.",
      intro: "برای کاوش، `help` را تایپ و Enter بزن.",
      cta: "نمونه‌کارها",
      ctaContact: "تماس",
    },
    about: {
      num: "۰۱", label: "درباره",
      title: "whoami",
      p1: "پژوهشگری در مرز مهندسی RF/مایکروویو و هوش مصنوعی هستم. کار من شامل طراحی آنتن، شبیه‌سازی الکترومغناطیسی و یادگیری ماشین برای سیگنال‌ها و سیستم‌های RF است.",
      p2: "بیرون از آزمایشگاه، مقاله‌ی فنی می‌نویسم، بین EN/DE/FA ترجمه می‌کنم و آموزش ویدیویی می‌سازم تا مباحث پیچیده دسترس‌پذیر بشن. همیشه آماده‌ی همکاری.",
      stats: [
        { v: "+۵", l: "سال پژوهش" },
        { v: "+۲۰", l: "انتشار" },
        { v: "+۱۰۰", l: "آموزش" },
        { v: "۳", l: "زبان" },
      ],
      factsTitle: "/etc/info",
      facts: [
        { k: "موقعیت", v: "زمین 🌍" },
        { k: "زبان‌ها", v: "EN · DE · FA" },
        { k: "تمرکز", v: "RF · AI · نوشتن" },
        { k: "وضعیت", v: "آماده" },
      ],
    },
    skills: {
      num: "۰۲", label: "مهارت‌ها",
      title: "جعبه‌ابزار",
      subtitle: "// با چی کار می‌کنم",
    },
    books: {
      num: "۰۳", label: "کتاب‌ها",
      title: "کتاب‌ها",
      subtitle: "// نوشته‌شده و ترجمه‌شده",
      year: "سال",
      publisher: "ناشر",
      view: "باز کردن →",
    },
    articles: {
      num: "۰۴", label: "مقالات",
      title: "مقالات و پژوهش‌ها",
      subtitle: "// نوشته‌های منتخب",
      read: "خواندن →",
    },
    tutorials: {
      num: "۰۵", label: "آموزش‌ها",
      title: "آموزش‌ها",
      subtitle: "// درس‌های ویدیویی",
      watch: "تماشا →",
      close: "بستن [esc]",
      duration: "مدت",
      level: "سطح",
    },
    contact: {
      num: "۰۶", label: "تماس",
      title: "باز کردن کانال",
      subtitle: "// باز کردن کانال",
      desc: "پروژه، سؤال یا فقط سلام؟ از طریق فرم زیر پیام بذار — همه رو می‌خونم و ظرف ۱–۲ روز جواب می‌دم. ایمیل عمومی در سایت قرار داده نشده؛ پیام مستقیم به صندوق خصوصی من می‌رسه.",
      socialsLabel: "کانال‌ها",
      form: {
        name: "نام", namePh: "مثلاً مهدی رضایی",
        email: "ایمیل شما (برای پاسخ)", emailPh: "example@domain.com",
        message: "پیام", messagePh: "پیام خود را بنویسید...",
        submit: "ارسال [enter]",
        sending: "در حال ارسال...",
        success: "✓ پیام دریافت شد. ممنون!",
        errors: {
          missing: "همه‌ی فیلدها لازم است.",
          email: "فرمت ایمیل نامعتبر.",
          short: "پیام خیلی کوتاه (حداقل ۱۰).",
          rate: "محدودیت نرخ. ۱۰ دقیقه بعد دوباره.",
          spam: "پیام به‌عنوان اسپم علامت خورد.",
          server: "خطای سرور. بعداً تلاش کنید.",
        },
      },
    },
    terminal: {
      welcome: "خوش آمدید. برای دیدن دستورات `help` را بزن.",
      unknown: (cmd: string) => `دستور یافت نشد: ${cmd}. 'help' را بزن.`,
      help: [
        "دستورات موجود:",
        "  help     — نمایش این لیست",
        "  about    — من که هستم",
        "  skills   — چه می‌کنم",
        "  books    — کتاب‌های منتشرشده",
        "  articles — مقالات و پژوهش‌ها",
        "  tutorials— آموزش‌های ویدیویی",
        "  contact  — راه‌های تماس",
        "  social   — لینک‌های اجتماعی",
        "  whoami   — معرفی کوتاه",
        "  clear    — پاک‌سازی ترمینال",
        "  date     — زمان فعلی UTC",
        "  scan     — اسکن طیف RF",
        "  chat     — پرش به گفت‌وگو",
      ].join("\n"),
      cleared: "",
    },
    footer: { built: "ساخته‌شده با عشق.", admin: "ادمین" },
    toTop: "بازگشت به بالا",
    admin: {
      title: "// لاگ پیام‌ها",
      subtitle: "احراز هویت شد. پیام‌ها در DB ذخیره شده‌اند.",
      passwordLabel: "رمز",
      passwordPh: "رمز ادمین را وارد کنید",
      unlock: "باز کردن",
      wrong: "رمز اشتباه.",
      empty: "هنوز پیامی نیست.",
      from: "از",
      at: "در",
      back: "← بازگشت به سایت",
    },
  },
};
