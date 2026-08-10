"use client";

import { useEffect, useState, type FormEvent } from "react";
import "./personal.css";
import MatrixRain from "@/components/MatrixRain";
import InteractiveTerminal from "@/components/InteractiveTerminal";
import {
  UI, PERSONAL, SOCIALS, SKILLS, BOOKS, ARTICLES, TUTORIALS,
  type Lang, DEFAULT_LANG, LANGS,
} from "@/lib/content";

type FormStatus = { text: string; kind: "success" | "error" | "" };
type MessageRow = {
  id: string; name: string; email: string; message: string;
  ip: string | null; createdAt: string;
};

const langLabel: Record<Lang, string> = { en: "EN", de: "DE", fa: "FA" };

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
  const [activeTutorial, setActiveTutorial] = useState<typeof TUTORIALS[number] | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminMsgs, setAdminMsgs] = useState<MessageRow[] | null>(null);
  const [adminErr, setAdminErr] = useState("");

  const tt = UI[lang];

  // sync html lang/dir
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = tt.dir;
  }, [lang, tt.dir]);

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

  // live UTC clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const iso = d.toISOString().replace("T", " ").slice(0, 19);
      setUtcTime(iso + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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
      const res = await fetch(`/api/messages?password=${encodeURIComponent(adminPwd)}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setAdminMsgs(data.messages);
      } else {
        setAdminErr(tt.admin.wrong);
      }
    } catch {
      setAdminErr(tt.admin.wrong);
    }
  };

  const closeAdmin = () => {
    setAdminOpen(false);
    setAdminMsgs(null);
    setAdminPwd("");
    setAdminErr("");
    if (window.location.hash === "#admin") {
      history.replaceState(null, "", window.location.pathname);
    }
  };

  const reveal = (id: string) => (revealed.has(id) ? "reveal visible" : "reveal");

  return (
    <div className="app">
      <MatrixRain />

      {/* STATUS BAR */}
      <div className="statusbar">
        <div className="statusbar-left">
          <span className="statusbar-item">
            <span className="dot"></span>
            <span className="value">online</span>
          </span>
          <span className="statusbar-item">
            <span className="label">uptime:</span>
            <span className="value">{utcTime || "—"}</span>
          </span>
        </div>
        <div className="statusbar-right">
          <span className="statusbar-item">
            <span className="label">pid:</span>
            <span className="value">#{(typeof window !== "undefined" ? window.location.pathname.length : 1) + 1337}</span>
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
            <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a>
          </nav>
          <div className="nav-right">
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
      </section>

      {/* ABOUT */}
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
        </div>
      </section>

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

      {/* TUTORIALS */}
      <section className="section section-alt" id="tutorials">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.tutorials.num} — {tt.tutorials.label}</p>
            <h2 className="section-title">{tt.tutorials.title}</h2>
            <p className="section-subtitle">{tt.tutorials.subtitle}</p>
          </header>
          <div className="tutorials-grid">
            {TUTORIALS.map((t, i) => (
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
        </div>
      </section>

      {/* CONTACT */}
      <section className="section" id="contact">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">{tt.contact.num} — {tt.contact.label}</p>
            <h2 className="section-title">{tt.contact.title}</h2>
            <p className="section-subtitle">{tt.contact.subtitle}</p>
          </header>
          <div className="contact-grid">
            <div className={`contact-info ${reveal("contact-info")}`} data-reveal="contact-info">
              <p>{tt.contact.desc}</p>
              <ul className="contact-list">
                <li>
                  <span className="contact-label">{tt.contact.emailLabel}</span>
                  <a href={`mailto:${PERSONAL.email}`}>{PERSONAL.email}</a>
                </li>
              </ul>
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
            <li><a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a></li>
            <li>
              <a
                href="#admin"
                className="footer-admin"
                onClick={(e) => { e.preventDefault(); setAdminOpen(true); window.location.hash = "admin"; }}
              >
                {tt.footer.admin}
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
                </form>
              ) : adminMsgs.length === 0 ? (
                <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>{tt.admin.empty}</p>
              ) : (
                <div className="admin-messages">
                  {adminMsgs.map((m) => (
                    <div key={m.id} className="admin-message">
                      <div className="admin-message-head">
                        <span>
                          {tt.admin.from}: <span className="admin-message-from">{m.name}</span> &lt;{m.email}&gt;
                        </span>
                        <span>{tt.admin.at}: {new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="admin-message-text">{m.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
