"use client";
import { sanitizeEmbed } from "@/lib/sanitize-embed";

import { useEffect, useState, type FormEvent } from "react";
import "./personal.css";
import MatrixRain from "@/components/MatrixRain";
import InteractiveTerminal from "@/components/InteractiveTerminal";
import Oscilloscope from "@/components/Oscilloscope";
import SignalLab from "@/components/SignalLab";
import SignalBars from "@/components/SignalBars";
import ChatSection from "@/components/ChatSection";
import ContentManager from "@/components/ContentManager";
import LabEquipmentRack from "@/components/LabEquipmentRack";
import ArchiveGrid from "@/components/ArchiveGrid";
import ThemeBuilder from "@/components/ThemeBuilder";
import TextEditor from "@/components/TextEditor";
import NavMenuManager from "@/components/NavMenuManager";
import AccessUserManager from "@/components/AccessUserManager";
import {
  UI, PERSONAL, SOCIALS, TUTORIALS,
  type Lang, DEFAULT_LANG, LANGS,
} from "@/lib/content";
import { useContent, getText as getDbText } from "@/lib/useContent";

type FormStatus = { text: string; kind: "success" | "error" | "" };

const langLabel: Record<Lang, string> = { en: "EN", de: "DE", fa: "FA" };
type MessageRow = {
  id: string; name: string; email: string; message: string;
  ip: string | null; createdAt: string;
};
type ChatSessionRow = {
  id: string; visitorId: string; ip: string | null; createdAt: string; updatedAt: string;
  messages: { id: string; role: string; content: string; createdAt: string }[];
};

// Tutorial types
type TutorialItem = {
  id: string;
  titleEn?: string;
  titleFa?: string;
  titleDe?: string;
  duration?: string;
  levelEn?: string;
  levelFa?: string;
  levelDe?: string;
  descEn?: string;
  descFa?: string;
  descDe?: string;
  embedUrl: string;
  platform?: string;
};

export default function Home() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const { content: siteContent, loading: contentLoading } = useContent(lang);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toTop, setToTop] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({ text: "", kind: "" });
  const [utcTime, setUtcTime] = useState("");
  const [localTime, setLocalTime] = useState(""); // for Shamsi/FA
  const [activeTutorial, setActiveTutorial] = useState<typeof TUTORIALS[number] | null>(null);
  const [captcha, setCaptcha] = useState({ q: "1 + 1", a: 2 });

  // theme + anti-theft
  const [theme, setTheme] = useState<"terminal" | "clean" | "midnight" | "amber" | "cyan" | "purple" | "solar">("terminal");
  const [antiTheftWarning, setAntiTheftWarning] = useState(false);
  // reCAPTCHA only renders after client mount — the grecaptcha script injects
  // an iframe + div into the .g-recaptcha container at runtime, which would
  // cause a hydration mismatch (server HTML has no iframe, client does).
  // By gating render on `mounted`, the server and the first client render
  // both produce an empty container, then the script loads and fills it.
  const [mounted, setMounted] = useState(false);
  const [aparatClips, setAparatClips] = useState<any[]>([]);
  useEffect(() => {
    setMounted(true);
    // Load reCAPTCHA script only on client, after mount
    if (!document.getElementById("recaptcha-api-script")) {
      const s = document.createElement("script");
      s.id = "recaptcha-api-script";
      s.src = "https://www.google.com/recaptcha/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
    // بارگذاری کلیپ‌های آپارات از API
    fetch("/api/clips")
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.clips) {
          setAparatClips(data.clips);
        }
      })
      .catch(() => {});
  }, []);

  const tt = UI[lang];
  // Helper: get text from DB first, fallback to content.ts
  const tx = (key: string, fallback: string) => getDbText(siteContent.texts, key, fallback);

  // sync html lang/dir
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = tt.dir;
  }, [lang, tt.dir]);

  // Load theme from localStorage + apply to <html>
  useEffect(() => {
    const saved = localStorage.getItem("portfolio_theme") as "terminal" | "clean" | "midnight" | "amber" | "cyan" | "purple" | "solar" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("portfolio_theme", theme);
  }, [theme]);

  // Anti-theft: disable right-click + detect devtools + domain lock
  useEffect(() => {
    // === DOMAIN LOCK ===
    // اگه دامنه‌ی جدید خواستی اضافه کنی، این لیست رو ویرایش کن
    const authorizedDomains = [
      "localhost",
      "127.0.0.1",
      "31.70.76.10",          // VPS IP
      "ehsanmorad.ir",        // دامنه ۱
      "www.ehsanmorad.ir",
      "ehsan-morad.ir",       // دامنه ۲
      "www.ehsan-morad.ir",
      "ehsanmorad.id.ir",     // دامنه ۳
      "www.ehsanmorad.id.ir",
    ];
    const currentHost = window.location.hostname;
    const isAuthorized = authorizedDomains.some(d =>
      currentHost === d || currentHost.endsWith("." + d)
    );
    if (!isAuthorized) {
      // دامنه‌ی فعلی مجاز نیست — پیام راه‌اندازی نشون بده
      document.body.innerHTML = `
        <div style="position:fixed;inset:0;background:#000;color:#00ff41;
          display:flex;align-items:center;justify-content:center;
          font-family:monospace;text-align:center;padding:40px;z-index:99999;">
          <div>
            <h1 style="font-size:1.8rem;margin-bottom:20px;color:#ffb000;">⚠ Domain Setup Required</h1>
            <p style="color:#ccc;font-size:0.9rem;margin-bottom:16px;">
              This domain is not yet authorized.
            </p>
            <p style="color:#888;font-size:0.8rem;margin-top:20px;">
              To fix this, add your domain to the authorized list:<br/><br/>
              <code style="color:#00ff41;">src/app/page.tsx</code> → <code style="color:#39ff14;">authorizedDomains</code><br/>
              <code style="color:#00ff41;">src/lib/canvas-protect.ts</code> → <code style="color:#39ff14;">AUTHORIZED_DOMAINS</code><br/><br/>
              Then rebuild: <code style="color:#39ff14;">docker-compose up -d --build</code>
            </p>
          </div>
        </div>
      `;
      return;
    }

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const onKeydown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U" || e.key === "s" || e.key === "S"))
      ) {
        e.preventDefault();
        return false;
      }
    };
    // DevTools detection (simple threshold-based)
    const threshold = 160;
    const checkDevtools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        setAntiTheftWarning(true);
      } else {
        setAntiTheftWarning(false);
      }
    };
    const devtoolsInterval = setInterval(checkDevtools, 1000);

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeydown);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeydown);
      clearInterval(devtoolsInterval);
    };
  }, []);


  // scroll listener
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

  // live clock — UTC + local (Shamsi for FA)
  // Only runs on client to avoid hydration mismatch
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      // UTC time in ISO format
      const iso = d.toISOString().replace("T", " ").slice(0, 19);
      setUtcTime(iso + " UTC");

      // Local time — Shamsi calendar for Persian, Gregorian for others
      try {
        if (lang === "fa") {
          // Persian (Jalali) calendar with Persian digits
          const shamsi = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(d);
          setLocalTime(shamsi);
        } else if (lang === "de") {
          const de = new Intl.DateTimeFormat("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(d);
          setLocalTime(de);
        } else {
          const en = new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(d);
          setLocalTime(en);
        }
      } catch {
        setLocalTime(iso);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lang]);

  // reveal on scroll
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.reveal!;
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

  // lock body when menu/modal open
  useEffect(() => {
    const locked = menuOpen || activeTutorial;
    document.body.style.overflow = locked ? "hidden" : "";
  }, [menuOpen, activeTutorial]);

  const closeMenu = () => setMenuOpen(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && href.length > 1 ) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
    closeMenu();
  };

  // close modal on esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeTutorial) setActiveTutorial(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTutorial]);

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

    // Verify reCAPTCHA
    const recaptchaResponse = (window as any).grecaptcha?.getResponse();
    if (!recaptchaResponse) {
      setFormStatus({ text: lang === "fa" ? "لطفاً تأیید ربات را انجام دهید." : "Please complete the robot check.", kind: "error" });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, recaptchaToken: recaptchaResponse }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setFormStatus({ text: tx("contact.success", tt.contact.form.success), kind: "success" });
        (e.target as HTMLFormElement).reset();
        // Generate new captcha
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const ops = ["+", "-", "*"];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let ans: number, q: string;
        if (op === "+") { ans = a + b; q = `${a} + ${b}`; }
        else if (op === "-") { ans = a >= b ? a - b : b - a; q = a >= b ? `${a} - ${b}` : `${b} - ${a}`; }
        else { ans = a * b; q = `${a} * ${b}`; }
        setCaptcha({ q, a: ans });
      } else {
        const err = data.error || "server_error";
        const msg =
          err === "rate_limit" ? errs.rate
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


  // Reply to a contact message


  const reveal = (id: string) => (revealed.has(id) ? "reveal visible" : "reveal");

  // Wave divider SVG
  const WaveDivider = () => (
    <svg className="wave-divider" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,20 Q100,5 200,20 T400,20 T600,20 T800,20" />
      <path d="M0,20 Q100,35 200,20 T400,20 T600,20 T800,20" opacity="0.5" />
    </svg>
  );

  return (
    <div className="app">
      <MatrixRain />
      {/* Anti-clone watermark (invisible, identifies your deployment) */}
      <div className="anti-clone-watermark" aria-hidden="true">
        personal-site-deployment
      </div>

      {/* Anti-theft warning (shown when devtools detected) */}
      {antiTheftWarning && (
        <div className="anti-theft-warning show">
          <div className="anti-theft-warning-content">
            <h2>⚠ DevTools Detected</h2>
            <p>This site is protected against template theft.</p>
            <p>Please close the developer tools to continue browsing.</p>
            <p style={{ fontSize: "0.75rem", color: "#666" }}>
              If you're the owner, you can disable this in page.tsx → anti-theft useEffect.
            </p>
          </div>
        </div>
      )}

      {/* STATUS BAR with RF elements */}
      <div className="statusbar">
        <div className="statusbar-left">
          <span className="statusbar-item">
            <span className="dot"></span>
            <span className="value">online</span>
          </span>
          <span className="statusbar-item">
            <SignalBars />
            <span className="value">-67dBm</span>
          </span>
          <span className="statusbar-item">
            <span className="freq-display">2.4GHz</span>
          </span>
        </div>
        <div className="statusbar-right">
          <span className="statusbar-item">
            <span className="label">{lang === "fa" ? "زمان:" : "time:"}</span>
            <span className="value">{localTime || "—"}</span>
          </span>
          <span className="statusbar-item">
            <span className="label">tty:</span>
            <span className="value">/dev/pts/0</span>
          </span>
        </div>
      </div>

      {/* NAVBAR */}
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-inner">
          <a href="#hero" className="brand" onClick={(e) => handleNavClick(e, "#hero")}>
            <span className="brand-name">{siteContent.settings?.handle || PERSONAL.handle}</span>
          </a>
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            {siteContent.navItems.length > 0 ? (
              siteContent.navItems.map((item: any) => {
                const labelField = `label${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
                const label = item[labelField] || item.labelEn || "";
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target={item.target === "_blank" ? "_blank" : undefined}
                    rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                    onClick={item.href.startsWith("#") ? (e) => handleNavClick(e, item.href) : undefined}
                  >
                    {label}
                  </a>
                );
              })
            ) : (
              <>
                <a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a>
                <a href="#skills" onClick={(e) => handleNavClick(e, "#skills")}>{tt.nav.skills}</a>
                <a href="#books" onClick={(e) => handleNavClick(e, "#books")}>{tt.nav.books}</a>
                <a href="#articles" onClick={(e) => handleNavClick(e, "#articles")}>{tt.nav.articles}</a>
                <a href="#tutorials" onClick={(e) => handleNavClick(e, "#tutorials")}>{tt.nav.tutorials}</a>
                <a href="#chat" onClick={(e) => handleNavClick(e, "#chat")}>{tt.nav.chat || "chat"}</a>
                <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a>
              </>
            )}
          </nav>
          <div className="nav-right">
            <div className="theme-switcher">
              <button className={theme === "terminal" ? "active" : ""} onClick={() => setTheme("terminal")} title="Terminal (green/black)"><span className="theme-icon" style={{ background: "#00ff41" }}></span></button>
              <button className={theme === "midnight" ? "active" : ""} onClick={() => setTheme("midnight")} title="Midnight (blue)"><span className="theme-icon" style={{ background: "#4a9eff" }}></span></button>
              <button className={theme === "amber" ? "active" : ""} onClick={() => setTheme("amber")} title="Amber (retro CRT)"><span className="theme-icon" style={{ background: "#ffb000" }}></span></button>
              <button className={theme === "cyan" ? "active" : ""} onClick={() => setTheme("cyan")} title="Cyan (cyberpunk)"><span className="theme-icon" style={{ background: "#00f5d4" }}></span></button>
              <button className={theme === "purple" ? "active" : ""} onClick={() => setTheme("purple")} title="Purple (neon)"><span className="theme-icon" style={{ background: "#c77dff" }}></span></button>
              <button className={theme === "solar" ? "active" : ""} onClick={() => setTheme("solar")} title="Solarized"><span className="theme-icon" style={{ background: "#2aa198" }}></span></button>
              <button className={theme === "clean" ? "active" : ""} onClick={() => setTheme("clean")} title="Clean (light)"><span className="theme-icon" style={{ background: "#0066cc" }}></span></button>
            </div>
            <div className="lang-toggle">
              {LANGS.map((l) => (
                <button
                  key={l}
                  className={lang === l ? "active" : ""}
                  onClick={() => setLang(l)}
                  aria-label={`Switch to ${l}`}
                >
                  {langLabel[l]}
                </button>
              ))}
            </div>
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
            <p className="hero-greeting">{tx("hero.greeting", tt.hero.greeting)}</p>
            <h1 className="hero-title">{siteContent.settings?.["name_" + lang] || PERSONAL.fullName[lang]}</h1>
            <p className="hero-subtitle">{PERSONAL.tagline[lang]}</p>
            <div className="hero-cta">
              <a href="#articles" className="btn btn-primary" onClick={(e) => handleNavClick(e, "#articles")}>{tx("hero.cta1", tt.hero.cta)}</a>
              <a href="#contact" className="btn btn-ghost" onClick={(e) => handleNavClick(e, "#contact")}>{tx("hero.cta2", tt.hero.ctaContact)}</a>
            </div>
            <div className="hero-socials">
              {SOCIALS.map((s) => (
                <a
                  key={s.id}
                  href={`${s.url}${s.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-chip"
                >
                  <span>{s.label}</span>
                  <span className="chip-handle">/{s.handle}</span>
                </a>
              ))}
            </div>
          </div>
          <div className={`hero-visual ${reveal("hero-visual")}`} data-reveal="hero-visual">
            <InteractiveTerminal lang={lang} />
          </div>
        </div>
        {/* Oscilloscope under hero — RF vibe */}
        <div className="container">
          <Oscilloscope height={70} />
        </div>
      </section>

      {/* ABOUT — with Smith Chart decoration */}
      <section className="section section-alt" id="about">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.about.num} — {tt.about.label}</p>
            <h2 className="section-title">{tx("about.title", tt.about.title)}</h2>
          </header>
          <div className="about-grid">
            <div className={`about-text ${reveal("about-text")}`} data-reveal="about-text">
              <p>{tx("about.p1", tt.about.p1)}</p>
              <p>{tx("about.p2", tt.about.p2)}</p>
              <ul className="about-stats">
                {tt.about.stats.map((s, i) => (
                  <li key={i}><strong>{s.v}</strong><span>{s.l}</span></li>
                ))}
              </ul>
            </div>
            <aside className={`about-card ${reveal("about-card")}`} data-reveal="about-card">
              <h3>{tx("about.factsTitle", tt.about.factsTitle)}</h3>
              <dl>
                {tt.about.facts.map((f, i) => (
                  <div key={i}>
                    <dt>{f.k}</dt><dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          {/* RF Equipment Rack — lab equipment from DB */}
          <LabEquipmentRack equipment={siteContent.equipment} />
          {/* Signal Lab — Generator + Oscilloscope (wirelessly connected) */}
          <SignalLab />
        </div>
      </section>

      <WaveDivider />

      {/* SKILLS */}
      <section className="section" id="skills">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.skills.num} — {tt.skills.label}</p>
            <h2 className="section-title">{tx("skills.title", tt.skills.title)}</h2>
            <p className="section-subtitle">{tx("skills.subtitle", tt.skills.subtitle)}</p>
          </header>
          <div className="skills-grid">
            {siteContent.skills.map((s: any, i: number) => {
              const catField = `category${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
              const category = s[catField] || s.categoryEn || "";
              const items = Array.isArray(s.items) ? s.items : (typeof s.items === "string" ? s.items.split(",").map((x:string)=>x.trim()).filter(Boolean) : []);
              return (
                <article key={s.id || i} className={`skill-card ${reveal(`skill-${i}`)}`} data-reveal={`skill-${i}`}>
                  <h3>{category}</h3>
                  <ul className="tags">{items.map((tag: string) => <li key={tag}>{tag}</li>)}</ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* BOOKS */}
      <section className="section section-alt" id="books">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.books.num} — {tt.books.label}</p>
            <h2 className="section-title">{tx("books.title", tt.books.title)}</h2>
            <p className="section-subtitle">{tx("books.subtitle", tt.books.subtitle)}</p>
          </header>
          <ArchiveGrid
            items={siteContent.books}
            type="book"
            lang={lang}
          />
        </div>
      </section>

      <WaveDivider />

      {/* ARTICLES */}
      <section className="section" id="articles">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.articles.num} — {tt.articles.label}</p>
            <h2 className="section-title">{tx("articles.title", tt.articles.title)}</h2>
            <p className="section-subtitle">{tx("articles.subtitle", tt.articles.subtitle)}</p>
          </header>
          <ArchiveGrid
            items={siteContent.articles}
            type="article"
            lang={lang}
          />
        </div>
      </section>

      {/* TUTORIALS — with ArchiveGrid (search, sort, pagination) */}
      <section className="section section-alt" id="tutorials">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.tutorials.num} — {tt.tutorials.label}</p>
            <h2 className="section-title">{tx("tutorials.title", tt.tutorials.title)}</h2>
            <p className="section-subtitle">{tx("tutorials.subtitle", tt.tutorials.subtitle)}</p>
          </header>
          <ArchiveGrid
            items={siteContent.tutorials}
            type="tutorial"
            lang={lang}
            onItemClick={(t) => setActiveTutorial(t as any)}
          />
        </div>
      </section>

      {/* CHAT — AI concierge */}
      <ChatSection lang={lang} />

      {/* CLIPS — Aparat video clips managed by admin */}
      <section className="section" id="clips">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">07 — clips</p>
            <h2 className="section-title">{lang === "fa" ? "ویدیوها" : "Clips"}</h2>
            <p className="section-subtitle">{lang === "fa" ? "// ویدیوهای آموزشی" : "// educational videos"}</p>
          </header>
          {aparatClips.length === 0 ? (
            <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 40 }}>
              {lang === "fa" ? "هنوز ویدیویی اضافه نشده." : "No clips yet."}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 24, marginTop: 20 }}>
              {aparatClips.map((clip: any) => (
                <div key={clip.id} style={{
                  background: "var(--bg-panel, #050505)",
                  border: "1px solid var(--border, #1a3a1a)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border, #1a3a1a)" }}>
                    <strong style={{ color: "var(--primary-bright, #39ff14)", fontSize: 14 }}>
                      {clip.title}
                    </strong>
                    {clip.description && (
                      <p style={{ color: "var(--text-dim, #4a7a4a)", fontSize: 11, margin: "4px 0 0" }}>
                        {clip.description}
                      </p>
                    )}
                  </div>
                  <div
                    style={{ aspectRatio: "16/9", background: "#000" }}
                    dangerouslySetInnerHTML={{ __html: sanitizeEmbed(clip.embedCode) }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section className="section section-alt" id="contact">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.contact.num} — {tt.contact.label}</p>
            <h2 className="section-title">{tx("contact.title", tt.contact.title)}</h2>
            <p className="section-subtitle">{tx("contact.subtitle", tt.contact.subtitle)}</p>
          </header>
          <div className="contact-grid">
            <div className={`contact-info ${reveal("contact-info")}`} data-reveal="contact-info">
              <p>{tx("contact.desc", tt.contact.desc)}</p>
              <p className="contact-label" style={{ marginTop: 24 }}>{tx("contact.socialsLabel", tt.contact.socialsLabel)}</p>
              <div className="socials-grid">
                {SOCIALS.map((s) => (
                  <a
                    key={s.id}
                    href={`${s.url}${s.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-chip"
                  >
                    <span>{s.label}</span>
                    <span className="chip-handle">/{s.handle}</span>
                  </a>
                ))}
              </div>
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
              <div className="field">
                <label>{lang === "fa" ? "تأیید ربات" : "Robot check"}</label>
                {/* reCAPTCHA container — only rendered after client mount to
                    avoid hydration mismatch (grecaptcha injects iframe at runtime) */}
                {mounted ? (
                  <div
                    className="g-recaptcha"
                    data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY || ""}
                    data-theme="dark"
                  ></div>
                ) : (
                  <div style={{ width: 304, height: 78, background: "rgba(0,255,65,0.05)", border: "1px dashed rgba(0,255,65,0.3)", borderRadius: 4 }} />
                )}
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
          <p>© {year ?? ""} {siteContent.settings?.["name_" + lang] || PERSONAL.fullName[lang]}. {tt.footer.built}</p>
          <ul className="footer-links">
            <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a></li>
            <li><a href="#books" onClick={(e) => handleNavClick(e, "#books")}>{tt.nav.books}</a></li>
            <li><a href="#tutorials" onClick={(e) => handleNavClick(e, "#tutorials")}>{tt.nav.tutorials}</a></li>
            <li><a href="#chat" onClick={(e) => handleNavClick(e, "#chat")}>{tt.nav.chat || "chat"}</a></li>
            <li><a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a></li>
            <li>
              <a
                className="footer-admin"
                title="Ctrl+Shift+A"
              >
                [{tt.footer.admin}]
              </a>
            </li>
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

      {/* TUTORIAL MODAL */}
      {activeTutorial && (
        <div className="tutorial-modal" onClick={() => setActiveTutorial(null)}>
          <div className="tutorial-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-modal-bar">
              <span className="tutorial-modal-bar-title">
                {activeTutorial?.title[lang]} · {activeTutorial?.duration} · {activeTutorial?.level[lang]}
              </span>
              <button className="tutorial-modal-close" onClick={() => setActiveTutorial(null)}>
                {tt.tutorials.close}
              </button>
            </div>
            <div className="tutorial-modal-video">
              <iframe
                src={activeTutorial?.embedUrl}
                title={activeTutorial?.title[lang]}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}
