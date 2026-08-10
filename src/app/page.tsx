'use client';

import { useEffect, useState, type FormEvent } from "react";
import "./personal.css";

type Lang = "fa" | "en";

const t = {
  fa: {
    dir: "rtl",
    langName: "FA",
    otherLang: "EN",
    brand: "yourname",
    nav: { about: "درباره", skills: "مهارت‌ها", projects: "پروژه‌ها", contact: "تماس" },
    hero: {
      eyebrow: "سلام، من",
      title: "اسم شما",
      subtitle: "من ", subtitleAccent: "تجربه‌های دیجیتال تمیز", subtitleEnd: " می‌سازم",
      desc: "توسعه‌دهنده‌ای پرشور با تمرکز روی ساختن محصولاتی پالایش‌شده، دسترس‌پذیر و سریع. به جزئیاتی اهمیت می‌دم که نرم‌افزار رو برای کاربر خوشایند می‌کنن.",
      cta1: "نمونه‌کارها", cta2: "تماس بگیر",
    },
    about: {
      num: "۰۱", label: "درباره",
      title: "کمی درباره من",
      p1: "توسعه‌دهنده‌ای هستم که عاشق تبدیل ایده به محصوله. طی چند سال اخیر در سراسر استک کار کردم — از طراحی دیتابیس تا رابط کاربری pixel-perfect. معتقدم نرم‌افزار عالی از همدلی با کاربر همراه با مهندسی منضبط به دست میاد.",
      p2: "وقتی کد نمی‌زنم، دارم درباره سیستم‌های طراحی می‌خونم، روی پروژه‌های جانبی کار می‌کنم، یا یه کافه‌ی جدید رو امتحان می‌کنم. همیشه آماده‌م برای گفت‌وگوهای جالب و همکاری.",
      stats: [
        { v: "+۵", l: "سال تجربه" },
        { v: "+۳۰", l: "پروژه تحویل‌شده" },
        { v: "∞", l: "فنجان قهوه" },
      ],
      cardTitle: "اطلاعات سریع",
      facts: [
        { k: "موقعیت", v: "زمین 🌍" },
        { k: "زبان‌ها", v: "فارسی، انگلیسی" },
        { k: "تمرکز", v: "وب و محصول" },
        { k: "وضعیت", v: "آماده‌ی همکاری" },
      ],
    },
    skills: {
      num: "۰۲", label: "مهارت‌ها",
      title: "ابزارهایی که باهاشون کار می‌کنم",
      cards: [
        { t: "فرانت‌اند", d: "ساخت رابط‌های واکنش‌گرا و دسترس‌پذیر با ابزار مدرن.", tags: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind"] },
        { t: "بک‌اند", d: "طراحی API و سرویس‌هایی که مقیاس‌پذیر و قابل نگهداری هستن.", tags: ["Node.js", "Express", "Python", "FastAPI", "REST", "GraphQL", "WebSocket"] },
        { t: "داده", d: "مدل‌سازی، کوئری و بهینه‌سازی ذخیره‌گاه‌های داده.", tags: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "SQLite"] },
        { t: "ابزار", d: "تحویل با اعتماد به نفس با گردش‌کار اثبات‌شده.", tags: ["Git", "Docker", "CI/CD", "Vercel", "Linux", "Figma"] },
      ],
    },
    projects: {
      num: "۰۳", label: "پروژه‌ها",
      title: "کارهای منتخب",
      items: [
        { n: "۰۱", t: "پروژه آلفا", d: "یک داشبورد SaaS برای ردیابی لحظه‌ای متریک‌ها، ساخته‌شده با Next.js و WebSocket.", tags: ["Next.js", "Prisma", "WebSocket"] },
        { n: "۰۲", t: "پروژه بتا", d: "دستیار نوشتاری هوش مصنوعی که محتوا را پیش‌نویس، ویرایش و خلاصه می‌کند.", tags: ["Python", "FastAPI", "LLM"] },
        { n: "۰۳", t: "پروژه گاما", d: "فروشگاه موبایل‌محور با سبد خرید، تسویه و پرداخت Stripe.", tags: ["React", "Stripe", "Tailwind"] },
        { n: "۰۴", t: "پروژه دلتا", d: "برنامه یادداشت‌برداری مشارکتی با همگام‌سازی لحظه‌ای و پشتیبانی آفلاین.", tags: ["Vue", "IndexedDB", "PWA"] },
      ],
      live: "نمایش زنده →", code: "کد →",
    },
    contact: {
      num: "۰۴", label: "تماس",
      title: "بیاید چیزی بسازیم",
      desc: "پروژه‌ای در ذهن دارید، سؤالی دارید، یا فقط می‌خواید سلام کنید؟ پیام بذارید تا ظرف یک دو روز جواب بدم.",
      emailLabel: "ایمیل", githubLabel: "گیت‌هاب", linkedinLabel: "لینکدین",
      form: {
        name: "نام", namePh: "مثلاً مهدی رضایی",
        email: "ایمیل", emailPh: "example@domain.com",
        message: "پیام", messagePh: "درباره ایده‌ت بنویس...",
        submit: "ارسال پیام",
        sending: "در حال ارسال...",
        success: "✓ پیام ذخیره شد. ممنون!",
        errors: {
          missing: "لطفاً همه فیلدها را پر کنید.",
          email: "لطفاً یک ایمیل معتبر وارد کنید.",
          short: "پیام باید حداقل ۱۰ کاراکتر باشد.",
          rate: "تعداد درخواست‌ها زیاد بود. ۱۰ دقیقه بعد دوباره تلاش کنید.",
          spam: "پیام شما اسپم تشخیص داده شد.",
          server: "خطای سرور. لطفاً بعداً تلاش کنید.",
        },
      },
    },
    footer: { rights: "کپی‌رایت", built: "ساخته‌شده با عشق." },
    toTop: "بازگشت به بالا",
  },
  en: {
    dir: "ltr",
    langName: "EN",
    otherLang: "FA",
    brand: "yourname",
    nav: { about: "About", skills: "Skills", projects: "Projects", contact: "Contact" },
    hero: {
      eyebrow: "Hello, I'm",
      title: "Your Name",
      subtitle: "I build ", subtitleAccent: "clean digital experiences", subtitleEnd: "",
      desc: "A passionate developer focused on creating polished, accessible, and performant products. I care about the details that make software feel great to use.",
      cta1: "View my work", cta2: "Get in touch",
    },
    about: {
      num: "01", label: "About",
      title: "A bit about me",
      p1: "I'm a developer who loves turning ideas into products. Over the past few years I've worked across the stack — from designing database schemas to polishing pixel-perfect UIs. I believe great software comes from empathy for the user combined with disciplined engineering.",
      p2: "When I'm not coding, you'll find me reading about design systems, experimenting with side projects, or exploring a new coffee shop. I'm always open to interesting conversations and collaborations.",
      stats: [
        { v: "5+", l: "Years building things" },
        { v: "30+", l: "Projects shipped" },
        { v: "∞", l: "Cups of coffee" },
      ],
      cardTitle: "Quick facts",
      facts: [
        { k: "Location", v: "Earth 🌍" },
        { k: "Languages", v: "English, Persian" },
        { k: "Focus", v: "Web & Product" },
        { k: "Availability", v: "Open to work" },
      ],
    },
    skills: {
      num: "02", label: "Skills",
      title: "Tools I work with",
      cards: [
        { t: "Frontend", d: "Building responsive, accessible interfaces with modern tooling.", tags: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind"] },
        { t: "Backend", d: "Designing APIs and services that scale and stay maintainable.", tags: ["Node.js", "Express", "Python", "FastAPI", "REST", "GraphQL", "WebSockets"] },
        { t: "Data", d: "Modeling, querying, and optimizing data stores.", tags: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "SQLite"] },
        { t: "Tooling", d: "Shipping with confidence using proven workflows.", tags: ["Git", "Docker", "CI/CD", "Vercel", "Linux", "Figma"] },
      ],
    },
    projects: {
      num: "03", label: "Projects",
      title: "Selected work",
      items: [
        { n: "01", t: "Project Alpha", d: "A SaaS dashboard for tracking metrics in real time, built with Next.js and WebSockets.", tags: ["Next.js", "Prisma", "WebSocket"] },
        { n: "02", t: "Project Beta", d: "An AI-powered writing assistant that drafts, edits, and summarizes content with style.", tags: ["Python", "FastAPI", "LLM"] },
        { n: "03", t: "Project Gamma", d: "A mobile-first e-commerce storefront with cart, checkout, and Stripe payments.", tags: ["React", "Stripe", "Tailwind"] },
        { n: "04", t: "Project Delta", d: "A collaborative note-taking app with real-time sync and offline support.", tags: ["Vue", "IndexedDB", "PWA"] },
      ],
      live: "Live →", code: "Code →",
    },
    contact: {
      num: "04", label: "Contact",
      title: "Let's build something",
      desc: "Have a project in mind, a question, or just want to say hi? Drop a message and I'll get back to you within a day or two.",
      emailLabel: "Email", githubLabel: "GitHub", linkedinLabel: "LinkedIn",
      form: {
        name: "Name", namePh: "Jane Doe",
        email: "Email", emailPh: "jane@example.com",
        message: "Message", messagePh: "Tell me about your idea...",
        submit: "Send message",
        sending: "Sending...",
        success: "✓ Message saved. Thank you!",
        errors: {
          missing: "Please fill in all fields.",
          email: "Please enter a valid email address.",
          short: "Message must be at least 10 characters.",
          rate: "Too many requests. Try again in 10 minutes.",
          spam: "Your message was flagged as spam.",
          server: "Server error. Please try again later.",
        },
      },
    },
    footer: { rights: "©", built: "Built with care." },
    toTop: "Back to top",
  },
};

const faNum = (s: string) => s; // already fa in source

export default function Home() {
  const [lang, setLang] = useState<Lang>("fa");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toTop, setToTop] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ text: string; kind: "success" | "error" | "" }>({ text: "", kind: "" });

  const tt = t[lang];
  const isFa = lang === "fa";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = tt.dir;
  }, [lang, tt.dir]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    setYear(new Date().getFullYear());
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.reveal!;
            setRevealed((prev) => new Set(prev).add(id));
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
    closeMenu();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormStatus({ text: "", kind: "" });

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const email = (fd.get("email") as string)?.trim();
    const message = (fd.get("message") as string)?.trim();
    const errs = tt.contact.form.errors;

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !message) {
      setFormStatus({ text: errs.missing, kind: "error" });
      setSubmitting(false);
      return;
    }
    if (!emailRe.test(email)) {
      setFormStatus({ text: errs.email, kind: "error" });
      setSubmitting(false);
      return;
    }
    if (message.length < 10) {
      setFormStatus({ text: errs.short, kind: "error" });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setFormStatus({ text: tt.contact.form.success, kind: "success" });
        (e.target as HTMLFormElement).reset();
      } else {
        const err = data.error || "server_error";
        const msg = err === "rate_limit" ? errs.rate
          : err === "spam_detected" ? errs.spam
          : err === "missing_fields" ? errs.missing
          : err === "invalid_email" ? errs.email
          : err === "message_too_short" ? errs.short
          : errs.server;
        setFormStatus({ text: msg, kind: "error" });
      }
    } catch {
      setFormStatus({ text: errs.server, kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const reveal = (id: string) =>
    revealed.has(id) ? "reveal visible" : "reveal";

  return (
    <>
      {/* NAVBAR */}
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-inner">
          <a href="#hero" className="brand" onClick={(e) => handleNavClick(e, "#hero")}>
            <span className="brand-dot"></span>
            <span className="brand-name">{tt.brand}</span>
          </a>
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a>
            <a href="#skills" onClick={(e) => handleNavClick(e, "#skills")}>{tt.nav.skills}</a>
            <a href="#projects" onClick={(e) => handleNavClick(e, "#projects")}>{tt.nav.projects}</a>
            <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a>
          </nav>
          <div className="nav-right">
            <button
              className="lang-toggle"
              onClick={() => setLang((p) => (p === "fa" ? "en" : "fa"))}
              aria-label="Switch language"
              title={isFa ? "Switch to English" : "تغییر به فارسی"}
            >
              {tt.otherLang}
            </button>
            <button
              className={`nav-toggle ${menuOpen ? "active" : ""}`}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="container hero-grid">
          <div className={`hero-text ${reveal("hero-text")}`} data-reveal="hero-text">
            <p className="eyebrow">{tt.hero.eyebrow}</p>
            <h1 className="hero-title">{tt.hero.title}</h1>
            <h2 className="hero-subtitle">
              {tt.hero.subtitle}<span className="gradient-text">{tt.hero.subtitleAccent}</span>{tt.hero.subtitleEnd}
            </h2>
            <p className="hero-desc">{tt.hero.desc}</p>
            <div className="hero-cta">
              <a href="#projects" className="btn btn-primary" onClick={(e) => handleNavClick(e, "#projects")}>{tt.hero.cta1}</a>
              <a href="#contact" className="btn btn-ghost" onClick={(e) => handleNavClick(e, "#contact")}>{tt.hero.cta2}</a>
            </div>
            <div className="hero-socials">
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer">Twitter</a>
            </div>
          </div>
          <div className={`hero-visual ${reveal("hero-visual")}`} data-reveal="hero-visual" aria-hidden="true">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="hero-card">
              <div className="hero-card-row">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <pre className="hero-code"><code>{`const `}<span className="k">developer</span>{` = {
  name: `}<span className="s">'Your Name'</span>{`,
  role: `}<span className="s">'Full-stack Developer'</span>{`,
  stack: [`}<span className="s">'JS'</span>{`, `}<span className="s">'TS'</span>{`, `}<span className="s">'React'</span>{`],
  available: `}<span className="k">true</span>{`,
};`}</code></pre>
            </div>
          </div>
        </div>
        <a href="#about" className="scroll-cue" aria-label="Scroll down" onClick={(e) => handleNavClick(e, "#about")}>
          <span></span>
        </a>
      </section>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.about.num} — {tt.about.label}</p>
            <h2 className="section-title">{tt.about.title}</h2>
          </header>
          <div className="about-grid">
            <div className={`about-text ${reveal("about-text")}`} data-reveal="about-text">
              <p>{tt.about.p1}</p>
              <p>{tt.about.p2}</p>
              <ul className="about-stats">
                {tt.about.stats.map((s, i) => (
                  <li key={i}><strong>{s.v}</strong><span>{s.l}</span></li>
                ))}
              </ul>
            </div>
            <aside className={`about-card ${reveal("about-card")}`} data-reveal="about-card">
              <h3>{tt.about.cardTitle}</h3>
              <dl>
                {tt.about.facts.map((f, i) => (
                  <div key={i}>
                    <dt>{f.k}</dt><dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section className="section section-alt" id="skills">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.skills.num} — {tt.skills.label}</p>
            <h2 className="section-title">{tt.skills.title}</h2>
          </header>
          <div className="skills-grid">
            {tt.skills.cards.map((s, i) => (
              <article key={i} className={`skill-card ${reveal(`skill-${i}`)}`} data-reveal={`skill-${i}`}>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <ul className="tags">{s.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="section" id="projects">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.projects.num} — {tt.projects.label}</p>
            <h2 className="section-title">{tt.projects.title}</h2>
          </header>
          <div className="projects-grid">
            {tt.projects.items.map((p, i) => (
              <article key={i} className={`project-card ${reveal(`project-${i}`)}`} data-reveal={`project-${i}`}>
                <div className="project-thumb" style={{ ["--c1" as string]: projectColors[i].c1, ["--c2" as string]: projectColors[i].c2 }}>
                  <span className="project-num">{p.n}</span>
                </div>
                <div className="project-body">
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <ul className="tags">{p.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                  <div className="project-links">
                    <a href="#" target="_blank" rel="noopener noreferrer">{tt.projects.live}</a>
                    <a href="#" target="_blank" rel="noopener noreferrer">{tt.projects.code}</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section section-alt" id="contact">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.contact.num} — {tt.contact.label}</p>
            <h2 className="section-title">{tt.contact.title}</h2>
          </header>
          <div className="contact-grid">
            <div className={`contact-info ${reveal("contact-info")}`} data-reveal="contact-info">
              <p>{tt.contact.desc}</p>
              <ul className="contact-list">
                <li>
                  <span className="contact-label">{tt.contact.emailLabel}</span>
                  <a href="mailto:you@example.com">you@example.com</a>
                </li>
                <li>
                  <span className="contact-label">{tt.contact.githubLabel}</span>
                  <a href="https://github.com/" target="_blank" rel="noopener noreferrer">github.com/yourname</a>
                </li>
                <li>
                  <span className="contact-label">{tt.contact.linkedinLabel}</span>
                  <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer">linkedin.com/in/yourname</a>
                </li>
              </ul>
            </div>
            <form className={`contact-form ${reveal("contact-form")}`} data-reveal="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="name">{tt.contact.form.name}</label>
                <input type="text" id="name" name="name" placeholder={tt.contact.form.namePh} required maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="email">{tt.contact.form.email}</label>
                <input type="email" id="email" name="email" placeholder={tt.contact.form.emailPh} required maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor="message">{tt.contact.form.message}</label>
                <textarea id="message" name="message" rows={5} placeholder={tt.contact.form.messagePh} required maxLength={5000}></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? tt.contact.form.sending : tt.contact.form.submit}
              </button>
              <p className={`form-status ${formStatus.kind}`} role="status">{formStatus.text}</p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <p>{tt.footer.rights} {year ?? ""} {tt.hero.title}. {tt.footer.built}</p>
          <ul className="footer-links">
            <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a></li>
            <li><a href="#skills" onClick={(e) => handleNavClick(e, "#skills")}>{tt.nav.skills}</a></li>
            <li><a href="#projects" onClick={(e) => handleNavClick(e, "#projects")}>{tt.nav.projects}</a></li>
            <li><a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a></li>
          </ul>
        </div>
      </footer>

      <button
        className={`to-top ${toTop ? "visible" : ""}`}
        aria-label={tt.toTop}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </>
  );
}

const projectColors = [
  { c1: "#6366f1", c2: "#a855f7" },
  { c1: "#06b6d4", c2: "#3b82f6" },
  { c1: "#f59e0b", c2: "#ef4444" },
  { c1: "#10b981", c2: "#06b6d4" },
];
