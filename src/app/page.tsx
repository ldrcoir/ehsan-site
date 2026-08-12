"use client";

import { useEffect, useState, type FormEvent } from "react";
import "./personal.css";
import MatrixRain from "@/components/MatrixRain";
import InteractiveTerminal from "@/components/InteractiveTerminal";
import Oscilloscope from "@/components/Oscilloscope";
import SignalLab from "@/components/SignalLab";
import SignalBars from "@/components/SignalBars";
import ChatSection from "@/components/ChatSection";
import {
  UI, PERSONAL, SOCIALS, SKILLS, BOOKS, ARTICLES, TUTORIALS, RF_EQUIPMENT,
  type Lang, DEFAULT_LANG, LANGS,
} from "@/lib/content";

type FormStatus = { text: string; kind: "success" | "error" | "" };
type MessageRow = {
  id: string; name: string; email: string; message: string;
  ip: string | null; createdAt: string;
};
type ChatSessionRow = {
  id: string; visitorId: string; ip: string | null; createdAt: string; updatedAt: string;
  messages: { id: string; role: string; content: string; createdAt: string }[];
};

const langLabel: Record<Lang, string> = { en: "EN", de: "DE", fa: "FA" };

// TUTORIAL_PAGE_SIZE — show N tutorials at a time, "load more" reveals the rest
const TUTORIAL_PAGE_SIZE = 6;

export default function Home() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
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
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminMsgs, setAdminMsgs] = useState<MessageRow[] | null>(null);
  const [adminChats, setAdminChats] = useState<ChatSessionRow[] | null>(null);
  const [adminStats, setAdminStats] = useState<{ contactMessages: number; chatMessages: number; chatSessions: number } | null>(null);
  const [adminErr, setAdminErr] = useState("");
  const [adminTab, setAdminTab] = useState<"messages" | "chats" | "settings">("messages");
  const [adminSettings, setAdminSettings] = useState<Record<string, string> | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<{ id: string; text: string; ok: boolean } | null>(null);
  const [chatReplyingTo, setChatReplyingTo] = useState<string | null>(null);
  const [chatReplyText, setChatReplyText] = useState("");
  const [chatReplyStatus, setChatReplyStatus] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  // tutorial filter + pagination
  const [tutFilter, setTutFilter] = useState<string>("all");
  const [tutPage, setTutPage] = useState(TUTORIAL_PAGE_SIZE);

  // theme + anti-theft
  const [theme, setTheme] = useState<"terminal" | "clean" | "midnight">("terminal");
  const [antiTheftWarning, setAntiTheftWarning] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");

  const tt = UI[lang];

  // sync html lang/dir
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = tt.dir;
  }, [lang, tt.dir]);

  // Load theme from localStorage + apply to <html>
  useEffect(() => {
    const saved = localStorage.getItem("portfolio_theme") as "terminal" | "clean" | "midnight" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("portfolio_theme", theme);
  }, [theme]);

  // Anti-theft: disable right-click + detect devtools
  useEffect(() => {
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

  // hash change → open admin
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#admin") {
        setAdminOpen(true);
      } else {
        setAdminOpen(false);
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // keyboard shortcut: Ctrl+Shift+A → admin
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        setAdminOpen(true);
        if (window.location.hash !== "#admin") {
          window.location.hash = "admin";
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  // lock body when menu/modal open
  useEffect(() => {
    const locked = menuOpen || activeTutorial || adminOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen, activeTutorial, adminOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && href.length > 1 && href !== "#admin") {
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
        if (adminOpen) {
          setAdminOpen(false);
          if (window.location.hash === "#admin") {
            history.replaceState(null, "", window.location.pathname);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTutorial, adminOpen]);

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

  const adminUnlock = async (e: FormEvent) => {
    e.preventDefault();
    setAdminErr("");
    try {
      // fetch messages, chats, and settings in parallel
      const [msgRes, chatRes, settingsRes] = await Promise.all([
        fetch(`/api/messages?password=${encodeURIComponent(adminPwd)}`),
        fetch(`/api/chat?password=${encodeURIComponent(adminPwd)}`),
        fetch(`/api/admin/settings?password=${encodeURIComponent(adminPwd)}`),
      ]);
      const msgData = await msgRes.json();
      const chatData = await chatRes.json();
      const settingsData = await settingsRes.json();
      if (msgRes.ok && msgData.ok) {
        setAdminMsgs(msgData.messages);
        setAdminStats(msgData.stats);
      } else {
        setAdminErr(tt.admin.wrong);
        return;
      }
      if (chatRes.ok && chatData.ok) {
        setAdminChats(chatData.sessions);
      } else {
        setAdminChats([]);
      }
      if (settingsRes.ok && settingsData.ok) {
        setAdminSettings(settingsData.settings);
      }
    } catch {
      setAdminErr(tt.admin.wrong);
    }
  };

  // Reply to a contact message
  const submitReply = async (messageId: string) => {
    if (!replyText.trim()) return;
    setReplyStatus({ id: messageId, text: "...", ok: true });
    try {
      const res = await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPwd, messageId, reply: replyText }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setReplyStatus({ id: messageId, text: "✓ reply saved", ok: true });
        setReplyText("");
        setReplyingTo(null);
      } else {
        setReplyStatus({ id: messageId, text: "✗ error", ok: false });
      }
    } catch {
      setReplyStatus({ id: messageId, text: "✗ error", ok: false });
    }
  };

  // Reply to an AI chat session
  const submitChatReply = async (sessionId: string) => {
    if (!chatReplyText.trim()) return;
    setChatReplyStatus({ id: sessionId, text: "...", ok: true });
    try {
      const res = await fetch("/api/admin/chat-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPwd, sessionId, reply: chatReplyText }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setChatReplyStatus({ id: sessionId, text: "✓ reply injected", ok: true });
        setChatReplyText("");
        setChatReplyingTo(null);
        // Update local state to show the new message
        setAdminChats((prev) =>
          prev?.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [
                    ...s.messages,
                    {
                      id: data.messageId,
                      role: "assistant",
                      content: chatReplyText,
                      createdAt: data.savedAt,
                    },
                  ],
                }
              : s
          ) || null
        );
      } else {
        setChatReplyStatus({ id: sessionId, text: "✗ error", ok: false });
      }
    } catch {
      setChatReplyStatus({ id: sessionId, text: "✗ error", ok: false });
    }
  };

  // Save site settings
  const saveSettings = async (newSettings: Record<string, string>) => {
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPwd, settings: newSettings }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAdminSettings((prev) => ({ ...prev, ...newSettings }));
        return true;
      }
    } catch {}
    return false;
  };

  const closeAdmin = () => {
    setAdminOpen(false);
    setAdminMsgs(null);
    setAdminChats(null);
    setAdminStats(null);
    setAdminPwd("");
    setAdminErr("");
    if (window.location.hash === "#admin") {
      history.replaceState(null, "", window.location.pathname);
    }
  };

  const reveal = (id: string) => (revealed.has(id) ? "reveal visible" : "reveal");

  // Tutorial filter logic
  const filteredTutorials = tutFilter === "all"
    ? TUTORIALS
    : TUTORIALS.filter((t) => {
        const lvl = t.level[lang].toLowerCase();
        if (tutFilter === "beginner") return lvl.includes("begin") || lvl.includes("مقدم") || lvl.includes("anf");
        if (tutFilter === "intermediate") return lvl.includes("inter") || lvl.includes("متوسط") || lvl.includes("fort");
        if (tutFilter === "advanced") return lvl.includes("advan") || lvl.includes("پیش") || lvl.includes("fortgeschritten") && !lvl.includes("anf");
        return true;
      });
  const visibleTutorials = filteredTutorials.slice(0, tutPage);
  const hasMoreTutorials = filteredTutorials.length > tutPage;

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
        portfolio-deployment-preview-rf-terminal-v4
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
            <span className="brand-name">{PERSONAL.handle}</span>
          </a>
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a>
            <a href="#skills" onClick={(e) => handleNavClick(e, "#skills")}>{tt.nav.skills}</a>
            <a href="#books" onClick={(e) => handleNavClick(e, "#books")}>{tt.nav.books}</a>
            <a href="#articles" onClick={(e) => handleNavClick(e, "#articles")}>{tt.nav.articles}</a>
            <a href="#tutorials" onClick={(e) => handleNavClick(e, "#tutorials")}>{tt.nav.tutorials}</a>
            <a href="#chat" onClick={(e) => handleNavClick(e, "#chat")}>{tt.nav.chat || "chat"}</a>
            <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a>
          </nav>
          <div className="nav-right">
            <div className="theme-switcher">
              <button
                className={theme === "terminal" ? "active" : ""}
                onClick={() => setTheme("terminal")}
                aria-label="Terminal theme"
                title="Terminal"
              >
                <span className="theme-icon" style={{ background: "#00ff41" }}></span>
              </button>
              <button
                className={theme === "midnight" ? "active" : ""}
                onClick={() => setTheme("midnight")}
                aria-label="Midnight theme"
                title="Midnight"
              >
                <span className="theme-icon" style={{ background: "#4a9eff" }}></span>
              </button>
              <button
                className={theme === "clean" ? "active" : ""}
                onClick={() => setTheme("clean")}
                aria-label="Clean theme"
                title="Clean"
              >
                <span className="theme-icon" style={{ background: "#0066cc" }}></span>
              </button>
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
            <p className="hero-greeting">{tt.hero.greeting}</p>
            <h1 className="hero-title">{PERSONAL.fullName[lang]}</h1>
            <p className="hero-subtitle">{PERSONAL.tagline[lang]}</p>
            <div className="hero-cta">
              <a href="#articles" className="btn btn-primary" onClick={(e) => handleNavClick(e, "#articles")}>{tt.hero.cta}</a>
              <a href="#contact" className="btn btn-ghost" onClick={(e) => handleNavClick(e, "#contact")}>{tt.hero.ctaContact}</a>
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
              <h3>{tt.about.factsTitle}</h3>
              <dl>
                {tt.about.facts.map((f, i) => (
                  <div key={i}>
                    <dt>{f.k}</dt><dd>{f.v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          {/* RF Equipment Rack — lab equipment display */}
          <div className={`equipment-rack ${reveal("equipment")}`} data-reveal="equipment">
            <div className="equipment-rack-title">
              {lang === "fa" ? "// رک تجهیزات آزمایشگاه" : lang === "de" ? "// Laborausstattung" : "// lab equipment rack"}
            </div>
            <div className="equipment-grid">
              {RF_EQUIPMENT.map((eq) => (
                <div key={eq.id} className="equipment-item">
                  <div className="equipment-info">
                    <span className="equipment-name">{eq.name}</span>
                    <span className="equipment-model">{eq.model}</span>
                  </div>
                  <span className={`equipment-led ${eq.status}`} title={eq.status}></span>
                </div>
              ))}
            </div>
            {/* Signal Lab — Generator + Oscilloscope (wirelessly connected) */}
            <SignalLab />
          </div>
        </div>
      </section>

      <WaveDivider />

      {/* SKILLS */}
      <section className="section" id="skills">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.skills.num} — {tt.skills.label}</p>
            <h2 className="section-title">{tt.skills.title}</h2>
            <p className="section-subtitle">{tt.skills.subtitle}</p>
          </header>
          <div className="skills-grid">
            {SKILLS.map((s, i) => (
              <article key={i} className={`skill-card ${reveal(`skill-${i}`)}`} data-reveal={`skill-${i}`}>
                <h3>{s.category[lang]}</h3>
                <ul className="tags">{s.items.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BOOKS */}
      <section className="section section-alt" id="books">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.books.num} — {tt.books.label}</p>
            <h2 className="section-title">{tt.books.title}</h2>
            <p className="section-subtitle">{tt.books.subtitle}</p>
          </header>
          <div className="books-grid">
            {BOOKS.map((b, i) => (
              <article key={b.id} className={`book-card ${reveal(`book-${i}`)}`} data-reveal={`book-${i}`}>
                <div className="book-cover" style={{ background: b.cover }}>
                  <div className="book-cover-title">{b.title[lang]}</div>
                </div>
                <div className="book-body">
                  <div className="book-meta">
                    <span>{b.year}</span>
                    <span>{b.publisher[lang]}</span>
                  </div>
                  <h3>{b.title[lang]}</h3>
                  <p>{b.description[lang]}</p>
                  <a href={b.link} target="_blank" rel="noopener noreferrer" className="book-link">{tt.books.view}</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider />

      {/* ARTICLES */}
      <section className="section" id="articles">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.articles.num} — {tt.articles.label}</p>
            <h2 className="section-title">{tt.articles.title}</h2>
            <p className="section-subtitle">{tt.articles.subtitle}</p>
          </header>
          <div className="articles-list">
            {ARTICLES.map((a, i) => (
              <article key={a.id} className={`article-row ${reveal(`article-${i}`)}`} data-reveal={`article-${i}`}>
                <span className="article-date">{a.date}</span>
                <div className="article-main">
                  <p className="article-type">{a.type[lang]}</p>
                  <h3>{a.title[lang]}</h3>
                  <p className="article-venue">{a.venue[lang]}</p>
                  <p className="article-summary">{a.summary[lang]}</p>
                </div>
                <a href={a.link} target="_blank" rel="noopener noreferrer" className="article-link">{tt.articles.read}</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TUTORIALS — with filter + pagination */}
      <section className="section section-alt" id="tutorials">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.tutorials.num} — {tt.tutorials.label}</p>
            <h2 className="section-title">{tt.tutorials.title}</h2>
            <p className="section-subtitle">{tt.tutorials.subtitle}</p>
          </header>
          <div className="tutorial-filters">
            <button
              className={`tutorial-filter ${tutFilter === "all" ? "active" : ""}`}
              onClick={() => { setTutFilter("all"); setTutPage(TUTORIAL_PAGE_SIZE); }}
            >all ({TUTORIALS.length})</button>
            <button
              className={`tutorial-filter ${tutFilter === "beginner" ? "active" : ""}`}
              onClick={() => { setTutFilter("beginner"); setTutPage(TUTORIAL_PAGE_SIZE); }}
            >beginner</button>
            <button
              className={`tutorial-filter ${tutFilter === "intermediate" ? "active" : ""}`}
              onClick={() => { setTutFilter("intermediate"); setTutPage(TUTORIAL_PAGE_SIZE); }}
            >intermediate</button>
            <button
              className={`tutorial-filter ${tutFilter === "advanced" ? "active" : ""}`}
              onClick={() => { setTutFilter("advanced"); setTutPage(TUTORIAL_PAGE_SIZE); }}
            >advanced</button>
          </div>
          <div className="tutorials-grid">
            {visibleTutorials.map((t, i) => (
              <article
                key={t.id}
                className={`tutorial-card ${reveal(`tut-${i}`)}`}
                data-reveal={`tut-${i}`}
                onClick={() => setActiveTutorial(t)}
              >
                <div className="tutorial-thumb">
                  <div className="tutorial-play"></div>
                  <span className="tutorial-duration">{t.duration}</span>
                </div>
                <div className="tutorial-body">
                  <p className="tutorial-level">{t.level[lang]}</p>
                  <h3>{t.title[lang]}</h3>
                  <p>{t.description[lang]}</p>
                </div>
              </article>
            ))}
          </div>
          {hasMoreTutorials && (
            <div className="tutorial-load-more">
              <button className="btn btn-ghost" onClick={() => setTutPage((p) => p + TUTORIAL_PAGE_SIZE)}>
                load more ({filteredTutorials.length - tutPage} remaining)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CHAT — AI concierge */}
      <ChatSection lang={lang} />

      {/* CONTACT */}
      <section className="section section-alt" id="contact">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.contact.num} — {tt.contact.label}</p>
            <h2 className="section-title">{tt.contact.title}</h2>
            <p className="section-subtitle">{tt.contact.subtitle}</p>
          </header>
          <div className="contact-grid">
            <div className={`contact-info ${reveal("contact-info")}`} data-reveal="contact-info">
              <p>{tt.contact.desc}</p>
              <p className="contact-label" style={{ marginTop: 24 }}>{tt.contact.socialsLabel}</p>
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
          <p>© {year ?? ""} {PERSONAL.fullName[lang]}. {tt.footer.built}</p>
          <ul className="footer-links">
            <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a></li>
            <li><a href="#books" onClick={(e) => handleNavClick(e, "#books")}>{tt.nav.books}</a></li>
            <li><a href="#tutorials" onClick={(e) => handleNavClick(e, "#tutorials")}>{tt.nav.tutorials}</a></li>
            <li><a href="#chat" onClick={(e) => handleNavClick(e, "#chat")}>{tt.nav.chat || "chat"}</a></li>
            <li><a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a></li>
            <li>
              <a
                href="#admin"
                className="footer-admin"
                onClick={(e) => { e.preventDefault(); setAdminOpen(true); window.location.hash = "admin"; }}
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
                {activeTutorial.title[lang]} · {activeTutorial.duration} · {activeTutorial.level[lang]}
              </span>
              <button className="tutorial-modal-close" onClick={() => setActiveTutorial(null)}>
                {tt.tutorials.close}
              </button>
            </div>
            <div className="tutorial-modal-video">
              <iframe
                src={activeTutorial.embedUrl}
                title={activeTutorial.title[lang]}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL */}
      {adminOpen && (
        <div className="admin-modal" onClick={closeAdmin}>
          <div className="admin-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-bar">
              <span className="admin-modal-bar-title">{tt.admin.title}</span>
              <button className="tutorial-modal-close" onClick={closeAdmin}>×</button>
            </div>
            <div className="admin-modal-body">
              {!adminMsgs ? (
                <form className="admin-login" onSubmit={adminUnlock}>
                  <div className="field">
                    <label htmlFor="admin-pwd">{tt.admin.passwordLabel}</label>
                    <input
                      id="admin-pwd"
                      type="password"
                      value={adminPwd}
                      onChange={(e) => setAdminPwd(e.target.value)}
                      placeholder={tt.admin.passwordPh}
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block">{tt.admin.unlock}</button>
                  {adminErr && <p className="form-status error" style={{ marginTop: 10 }}>{adminErr}</p>}
                  <p style={{ marginTop: 16, fontSize: "0.72rem", color: "var(--text-faint)" }}>
                    {tt.admin.subtitle}
                  </p>
                  <p style={{ marginTop: 8, fontSize: "0.68rem", color: "var(--text-faint)" }}>
                    shortcut: Ctrl+Shift+A · default password: admin123 (change in content.ts)
                  </p>
                </form>
              ) : (
                <>
                  {adminStats && (
                    <div className="admin-stats">
                      <div className="admin-stat"><strong>{adminStats.contactMessages}</strong>contact msgs</div>
                      <div className="admin-stat"><strong>{adminStats.chatSessions}</strong>chat sessions</div>
                      <div className="admin-stat"><strong>{adminStats.chatMessages}</strong>chat msgs</div>
                      <div className="admin-stat"><strong>{adminSettings?.visitorCount || 0}</strong>visitors</div>
                    </div>
                  )}
                  <div className="admin-tabs">
                    <button
                      className={`admin-tab ${adminTab === "messages" ? "active" : ""}`}
                      onClick={() => setAdminTab("messages")}
                    >
                      contact messages ({adminMsgs.length})
                    </button>
                    <button
                      className={`admin-tab ${adminTab === "chats" ? "active" : ""}`}
                      onClick={() => setAdminTab("chats")}
                    >
                      AI chat logs ({adminChats?.length || 0})
                    </button>
                    <button
                      className={`admin-tab ${adminTab === "settings" ? "active" : ""}`}
                      onClick={() => setAdminTab("settings")}
                    >
                      settings
                    </button>
                  </div>

                  {/* CONTACT MESSAGES TAB with reply */}
                  {adminTab === "messages" && (
                    adminMsgs.length === 0 ? (
                      <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>{tt.admin.empty}</p>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="admin-search"
                          placeholder="search by name, email, or message..."
                          value={adminSearch}
                          onChange={(e) => setAdminSearch(e.target.value)}
                        />
                        <button
                          className="btn btn-ghost btn-sm admin-export-btn"
                          onClick={() => {
                            const csv = adminMsgs
                              .filter((m) => {
                                const s = adminSearch.toLowerCase();
                                return !s || m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.message.toLowerCase().includes(s);
                              })
                              .map((m) => `"${m.name}","${m.email}","${m.message.replace(/"/g, '""')}","${new Date(m.createdAt).toISOString()}"`)
                              .join("\n");
                            const blob = new Blob(["Name,Email,Message,Date\n" + csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "messages.csv";
                            a.click();
                          }}
                        >
                          export CSV
                        </button>
                        <div className="admin-messages">
                          {adminMsgs
                            .filter((m) => {
                              const s = adminSearch.toLowerCase();
                              return !s || m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.message.toLowerCase().includes(s);
                            })
                            .map((m) => (
                          <div key={m.id} className="admin-message">
                            <div className="admin-message-head">
                              <span>
                                {tt.admin.from}: <span className="admin-message-from">{m.name}</span> &lt;{m.email}&gt;
                              </span>
                              <span>{tt.admin.at}: {new Date(m.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="admin-message-text">{m.message}</div>
                            <div className="admin-reply-box">
                              {replyingTo === m.id ? (
                                <>
                                  <label>reply to {m.name}:</label>
                                  <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="type your reply..."
                                    rows={3}
                                  />
                                  <div className="admin-reply-actions">
                                    <button className="btn btn-primary btn-sm" onClick={() => submitReply(m.id)}>
                                      save reply
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setReplyingTo(null); setReplyText(""); }}>
                                      cancel
                                    </button>
                                    {replyStatus?.id === m.id && (
                                      <span className={`admin-reply-status ${replyStatus.ok ? "" : "error"}`}>{replyStatus.text}</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <button className="btn btn-ghost btn-sm" onClick={() => { setReplyingTo(m.id); setReplyText(""); setReplyStatus(null); }}>
                                  reply
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                        </div>
                      </>
                    )
                  )}

                  {/* AI CHAT LOGS TAB with inject reply */}
                  {adminTab === "chats" && (
                    !adminChats || adminChats.length === 0 ? (
                      <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>
                        {lang === "fa" ? "هنوز چتی نیست." : lang === "de" ? "Noch keine Chats." : "No chats yet."}
                      </p>
                    ) : (
                      <div className="admin-messages">
                        {adminChats.map((s) => (
                          <div key={s.id} className="admin-session">
                            <div className="admin-session-head">
                              <span>session: {s.visitorId} ({s.ip || "—"})</span>
                              <span>{new Date(s.updatedAt).toLocaleString()}</span>
                            </div>
                            <div className="admin-session-msgs">
                              {s.messages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`admin-session-msg ${m.role}`}
                                  data-role={m.role === "user" ? ">" : "<"}
                                >
                                  {m.content}
                                </div>
                              ))}
                            </div>
                            <div className="admin-reply-box">
                              {chatReplyingTo === s.id ? (
                                <>
                                  <label>inject reply as AI:</label>
                                  <textarea
                                    value={chatReplyText}
                                    onChange={(e) => setChatReplyText(e.target.value)}
                                    placeholder="type your reply (visitor will see it as AI response)..."
                                    rows={3}
                                  />
                                  <div className="admin-reply-actions">
                                    <button className="btn btn-primary btn-sm" onClick={() => submitChatReply(s.id)}>
                                      inject reply
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setChatReplyingTo(null); setChatReplyText(""); }}>
                                      cancel
                                    </button>
                                    {chatReplyStatus?.id === s.id && (
                                      <span className={`admin-reply-status ${chatReplyStatus.ok ? "" : "error"}`}>{chatReplyStatus.text}</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <button className="btn btn-ghost btn-sm" onClick={() => { setChatReplyingTo(s.id); setChatReplyText(""); setChatReplyStatus(null); }}>
                                  reply as AI
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* SETTINGS TAB — kill switch, Bale config, content editing */}
                  {adminTab === "settings" && adminSettings && (
                    <div>
                      {/* API Kill Switch */}
                      <div className="admin-settings-section">
                        <h4>AI Chat API</h4>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">
                            {adminSettings.apiEnabled === "true"
                              ? (lang === "fa" ? "چت هوش مصنوعی فعال است" : "AI chat is currently ENABLED")
                              : (lang === "fa" ? "چت هوش مصنوعی غیرفعال است" : "AI chat is currently DISABLED")}
                          </span>
                          <div
                            className={`admin-toggle ${adminSettings.apiEnabled === "true" ? "on" : ""}`}
                            onClick={() => {
                              const newVal = adminSettings.apiEnabled === "true" ? "false" : "true";
                              saveSettings({ apiEnabled: newVal });
                            }}
                            role="button"
                            tabIndex={0}
                          />
                        </div>
                      </div>

                      {/* Content Editing */}
                      <div className="admin-settings-section">
                        <h4>Display Name (overrides content.ts)</h4>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">EN name</span>
                          <input
                            className="admin-setting-input"
                            value={adminSettings.adminDisplayName || ""}
                            onChange={(e) => setAdminSettings({ ...adminSettings, adminDisplayName: e.target.value })}
                            placeholder="Your Name"
                          />
                        </div>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">Tagline</span>
                          <input
                            className="admin-setting-input"
                            value={adminSettings.adminTagline || ""}
                            onChange={(e) => setAdminSettings({ ...adminSettings, adminTagline: e.target.value })}
                            placeholder="RF/Microwave Researcher · ..."
                          />
                        </div>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">Status message</span>
                          <input
                            className="admin-setting-input"
                            value={adminSettings.adminStatus || ""}
                            onChange={(e) => setAdminSettings({ ...adminSettings, adminStatus: e.target.value })}
                            placeholder="e.g. working on antenna array..."
                          />
                        </div>
                        <button
                          className="btn btn-primary btn-sm admin-save-btn"
                          onClick={() => saveSettings({
                            adminDisplayName: adminSettings.adminDisplayName || "",
                            adminTagline: adminSettings.adminTagline || "",
                            adminStatus: adminSettings.adminStatus || "",
                          })}
                        >
                          save content
                        </button>
                      </div>

                      {/* Bale Messenger Integration */}
                      <div className="admin-settings-section">
                        <h4>Bale Messenger Integration</h4>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">Enable Bale notifications</span>
                          <div
                            className={`admin-toggle ${adminSettings.baleEnabled === "true" ? "on" : ""}`}
                            onClick={() => {
                              const newVal = adminSettings.baleEnabled === "true" ? "false" : "true";
                              saveSettings({ baleEnabled: newVal });
                            }}
                            role="button"
                            tabIndex={0}
                          />
                        </div>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">Bale Bot Token</span>
                          <input
                            className="admin-setting-input"
                            type="password"
                            value={adminSettings.baleBotToken || ""}
                            onChange={(e) => setAdminSettings({ ...adminSettings, baleBotToken: e.target.value })}
                            placeholder="123456789:ABCdef..."
                          />
                        </div>
                        <div className="admin-setting-row">
                          <span className="admin-setting-label">Bale Chat ID</span>
                          <input
                            className="admin-setting-input"
                            value={adminSettings.baleChatId || ""}
                            onChange={(e) => setAdminSettings({ ...adminSettings, baleChatId: e.target.value })}
                            placeholder="123456789"
                          />
                        </div>
                        <button
                          className="btn btn-primary btn-sm admin-save-btn"
                          onClick={() => saveSettings({
                            baleBotToken: adminSettings.baleBotToken || "",
                            baleChatId: adminSettings.baleChatId || "",
                          })}
                        >
                          save Bale config
                        </button>
                        <div className="admin-bale-status">
                          <strong>Status:</strong> {adminSettings.baleEnabled === "true" && adminSettings.baleBotToken && adminSettings.baleChatId
                            ? "✓ configured — notifications will be sent"
                            : "⚠ not configured — see API_SETUP.md for instructions"}
                          <br/><br/>
                          <strong>Webhook URL:</strong> <code>https://your-domain.com/api/bale/webhook</code>
                          <br/><br/>
                          <strong>Commands admin can send to bot:</strong>
                          <br/>/list · /reply {`{id}`} {`{text}`} · /chat {`{sessionId}`} {`{text}`}
                          <br/>/disable · /enable · /stats · /help
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
