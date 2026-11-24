"use client";

// ============================================================================
// page.tsx — v1.0
// صفحه‌ی اصلی تک‌صفحه‌ای (hero، درباره، مهارت‌ها، کتاب‌ها، مقالات، آموزش‌ها،
// آزمایشگاه، چت، کلیپ‌ها، تماس) — محتوا از دیتابیس با /api/content می‌آید.
// ============================================================================

import { sanitizeEmbed } from "@/lib/sanitize-embed";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import "./personal.css";
import MatrixRain from "@/components/MatrixRain";
import InteractiveTerminal from "@/components/InteractiveTerminal";
import Oscilloscope from "@/components/Oscilloscope";
import SignalLab from "@/components/SignalLab";
import SignalBars from "@/components/SignalBars";
import ChatSection from "@/components/ChatSection";
import LabEquipmentRack from "@/components/LabEquipmentRack";
import ArchiveGrid from "@/components/ArchiveGrid";
import {
  UI, PERSONAL, SOCIALS,
  type Lang, DEFAULT_LANG, LANGS,
} from "@/lib/content";
import { useContent, getText as getDbText } from "@/lib/useContent";

type FormStatus = { text: string; kind: "success" | "error" | "" };

const langLabel: Record<Lang, string> = { en: "EN", de: "DE", fa: "FA" };

// V1.1: shared href sanitizer for DB-driven links (nav + footer).
// Only #hash, /path, mailto:, tel: and http(s) URLs pass — blocks
// javascript:/data: injection coming from the admin panel.
const safeHref = (raw: unknown): string => {
  const h = String(raw || "#").trim();
  // v1.0 (audit W36-40 #9): //evil.com مسیر protocol-relative است و به دامنه‌ی
  // دیگر می‌رود — مثل بقیه‌ی مسیرهای نسبی از / شروع می‌شود ولی باید رد شود
  if (h.startsWith("#") || (h.startsWith("/") && !h.startsWith("//")) || h.startsWith("mailto:") || h.startsWith("tel:")) return h;
  try {
    const u = new URL(h);
    if (u.protocol === "http:" || u.protocol === "https:") return h;
  } catch {}
  return "#";
};

// V1.1: derive a display handle from a full social URL
// ("https://github.com/user" → "user", "https://x.com" → "x.com")
const socialHandleFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const h = (u.pathname + (u.hash || "")).replace(/^\/+/, "").replace(/\/+$/, "");
    return h || u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// V1.1: #rrggbb / #rgb → rgba(...) — used to build soft/faint/glow vars
// for custom themes. Falls back to the raw value when parsing fails.
const hexToRgba = (hex: string, alpha: number): string => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return String(hex);
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// V1.1: CustomTheme row (from /api/content) → CSS.
// Maps the CustomTheme model fields onto the exact CSS vars the theme
// system sets in personal.css (html[data-theme=...] blocks).
const customThemeToCss = (t: any): string => {
  const p = String(t.primary || "#00ff41");
  const scan = t.scanlines
    ? `\nhtml[data-theme="custom-${t.id}"] body::before { display: block; }`
    : "";
  return `html[data-theme="custom-${t.id}"] {
  --bg: ${t.bg};
  --bg-soft: ${t.bgSoft};
  --bg-panel: ${t.bgPanel};
  --bg-panel-2: ${t.bgPanel2};
  --bg-panel2: ${t.bgPanel2};
  --green: ${p};
  --green-dim: ${t.primaryDim};
  --green-bright: ${t.primaryBright};
  --green-soft: ${hexToRgba(p, 0.5)};
  --green-faint: ${hexToRgba(p, 0.12)};
  --green-bg: ${hexToRgba(p, 0.04)};
  --amber: ${t.accent};
  --red: ${t.red};
  --cyan: ${t.cyan};
  --text: ${t.text};
  --text-dim: ${t.textDim};
  --text-faint: ${t.textFaint};
  --border: ${t.border};
  --border-bright: ${t.borderBright};
  --primary: ${p};
  --primary-dim: ${t.primaryDim};
  --primary-bright: ${t.primaryBright};
  --shadow-glow: 0 0 12px ${hexToRgba(p, 0.4)};
  --shadow-glow-strong: 0 0 20px ${hexToRgba(p, 0.7)};
  --scanlines: ${t.scanlines ? 1 : 0};
}${scan}`;
};

// v1.1.2: WaveDivider به module scope منتقل شد — قبلاً داخل Home تعریف می‌شد و
// روی هر render یک تابع/کامپوننت جدید ساخته می‌شد که باعث remount کامل SVG
// می‌شد (tree diffing یک type جدید می‌بیند).
const WaveDivider = () => (
  <svg className="wave-divider" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0,20 Q100,5 200,20 T400,20 T600,20 T800,20" />
    <path d="M0,20 Q100,35 200,20 T400,20 T600,20 T800,20" opacity="0.5" />
  </svg>
);

export default function Home() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const { content: siteContent } = useContent(lang);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toTop, setToTop] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>({ text: "", kind: "" });
  const [localTime, setLocalTime] = useState(""); // for Shamsi/FA
  const [activeTutorial, setActiveTutorial] = useState<any>(null);

  // theme + anti-theft
  // V1.1: theme is now `string` — custom themes use the "custom-<id>" form
  const [theme, setTheme] = useState<string>("terminal");
  const [antiTheftWarning, setAntiTheftWarning] = useState(false);
  // reCAPTCHA only renders after client mount — the grecaptcha script injects
  // an iframe + div into the .g-recaptcha container at runtime, which would
  // cause a hydration mismatch (server HTML has no iframe, client does).
  // By gating render on `mounted`, the server and the first client render
  // both produce an empty container, then the script loads and fills it.
  const [mounted, setMounted] = useState(false);
  // V17.4: زمان نمایش فرم — یکبار روی mount ست می‌شه (نه روی هر render)
  // این fix می‌کنه time-trap bug که فرم تماس رو reject می‌کرد
  const [formLoadTime, setFormLoadTime] = useState(0);
  const [aparatClips, setAparatClips] = useState<any[]>([]);
  useEffect(() => {
    setMounted(true);
    // v1.0 (audit W36-40 #2): زمانِ شروع فرم دیگر mount صفحه نیست — اولین
    // تعامل کاربر با فرم است. قبلاً یک انسانِ سریع (autofill) در <۲ ثانیه از
    // mount پیام می‌فرستاد و time-trap آن را بی‌صدا دور می‌ریخت در حالی که
    // «موفق» نشان داده می‌شد.
    // setFormLoadTime(Date.now()); — حذف شد؛ پایین‌تر با event listener ست می‌شود
    const initFormLoadTime = () => {
      setFormLoadTime((prev) => (prev === 0 ? Date.now() : prev));
    };
    const form = document.querySelector<HTMLFormElement>(".contact-form");
    if (form) {
      form.addEventListener("focusin", initFormLoadTime, { once: true });
      form.addEventListener("input", initFormLoadTime, { once: true });
      form.addEventListener("submit", initFormLoadTime, { once: true });
    }
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

  // V1.1: DB settings shortcuts + admin-editable wiring ----------
  const settings = siteContent.settings || {};
  // Section visibility — admin hides a section via section.<name>.visible === "false"
  const show = (name: string) => settings[`section.${name}.visible`] !== "false";

  // Social chips — DB social_* SiteSetting keys win, else SOCIALS from content.ts
  const socialChips = (() => {
    const fromDb = [
      { id: "github", label: "GitHub", url: settings.social_github },
      { id: "linkedin", label: "LinkedIn", url: settings.social_linkedin },
      { id: "devto", label: "dev.to", url: settings.social_devto },
      { id: "medium", label: "Medium", url: settings.social_medium },
    ]
      .filter((s) => typeof s.url === "string" && s.url.trim().length > 0)
      .map((s) => ({ ...s, url: /^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}` }));
    if (fromDb.length > 0) return fromDb;
    return SOCIALS.map((s) => ({ id: s.id, label: s.label, url: `${s.url}${s.handle}` }));
  })();

  // V1.1: full-string fallbacks for DB keys about.stat1..4 / about.fact1..4
  const statFallbacks = [tt.about.stat1, tt.about.stat2, tt.about.stat3, tt.about.stat4];
  const factFallbacks = [tt.about.fact1, tt.about.fact2, tt.about.fact3, tt.about.fact4];

  // sync html lang/dir
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = tt.dir;
  }, [lang, tt.dir]);

  // V1.1: theme init — localStorage first, then DB defaultTheme, then "terminal".
  // themeChosenRef makes sure a *default* is never persisted to localStorage,
  // otherwise first-time visitors would never receive the DB default.
  const themeChosenRef = useRef(false);
  useEffect(() => {
    const saved = localStorage.getItem("portfolio_theme");
    if (saved) {
      themeChosenRef.current = true;
      setTheme(saved);
      return;
    }
    const dbDefault = settings.defaultTheme;
    if (dbDefault) setTheme(dbDefault);
  }, [settings.defaultTheme]);

  const chooseTheme = (t: string) => {
    themeChosenRef.current = true;
    setTheme(t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeChosenRef.current) {
      localStorage.setItem("portfolio_theme", theme);
    }
  }, [theme]);

  // V1.1: default font — DB defaultFont applies when the visitor hasn't picked one
  useEffect(() => {
    const saved = localStorage.getItem("site_font");
    if (!saved && settings.defaultFont) {
      document.documentElement.setAttribute("data-font", settings.defaultFont);
    }
  }, [settings.defaultFont]);

  // V1.1: custom themes (admin Theme Builder) → one injected <style> tag with
  // the CSS vars for each theme (html[data-theme="custom-<id>"] { ... })
  const customThemes = siteContent.customThemes;
  useEffect(() => {
    if (!customThemes || customThemes.length === 0) return;
    const el = document.createElement("style");
    el.id = "custom-themes";
    el.textContent = customThemes.map(customThemeToCss).join("\n");
    document.head.appendChild(el);
    return () => {
      el.remove();
    };
  }, [customThemes]);

  // V1.1: tracking beacon — powers the admin Stats tab (fire-and-forget).
  // Fires on mount and on pathname change; language is read via ref so
  // switching languages does not double-count a visit.
  const pathname = usePathname();
  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer,
        lang: langRef.current,
      }),
    }).catch(() => {});
  }, [pathname]);

  // Anti-theft: disable right-click + detect devtools + domain lock
  useEffect(() => {
    // === DOMAIN LOCK ===
    // اگه دامنه‌ی جدید خواستی اضافه کنی، این لیست رو ویرایش کن
    const authorizedDomains = [
      "localhost",
      "127.0.0.1",
      // V17.9: VPS IP removed (info leak)
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
    // v1.1.2: threshold 160→260 — false positiveهای zoom مرورگر کمتر می‌شوند
    // (در zoom بالا outerWidth-innerWidth به‌راحتی از ۱۶۰ رد می‌شد)
    const threshold = 260;
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

  // live clock — local time (Shamsi for FA)
  // Only runs on client to avoid hydration mismatch
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      // ISO fallback (used in the catch branch below)
      const iso = d.toISOString().replace("T", " ").slice(0, 19);

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
  // v1.0 (audit W36-40 #1 — HIGH): قبلاً observer فقط یک بار روی mount اجرا می‌شد؛
  // کارت‌های skill که بعد از رسیدن /api/content رندر می‌شدند هیچ‌وقت observe نمی‌شدند
  // و چون .reveal با opacity:0 شروع می‌شود، برای همیشه نامرئی می‌ماندند. حالا
  // observer با هر تغییرِ طول محتوا دوباره راه می‌افتد و عناصر تازه را می‌گیرد.
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
  }, [siteContent.skills?.length, aparatClips.length]);

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
    // v1.0 rev3 (audit BUG-c MEDIUM): getResponse بدون گارد بود — اگر اسکریپت لود
    // شده ولی ویجت رندر نشده باشد (sitekey خالی) throw می‌کرد و submitting برای
    // همیشه true می‌ماند (دکمه قفل ابدی). حالا گارد شده و خطا درست نمایش داده می‌شود.
    let recaptchaResponse = "";
    try {
      recaptchaResponse = (window as any).grecaptcha?.getResponse?.() || "";
    } catch {
      recaptchaResponse = "";
    }
    if (!recaptchaResponse) {
      setFormStatus({ text: lang === "fa" ? "لطفاً تأیید ربات را انجام دهید." : "Please complete the robot check.", kind: "error" });
      setSubmitting(false);
      return;
    }

    // v1.0 rev3 (audit BUG-c LOW): time-trap سمت کلاینت هم چک می‌شود — قبلاً اگر
    // فرم خیلی سریع (autofill) فرستاده می‌شد، سرور پیام را بی‌صدا دور می‌ریخت ولی
    // UI «موفق» نشان می‌داد؛ حالا قبل از ارسال رد می‌شود و کاربر پیام واقعی می‌بیند
    const elapsedMs = Date.now() - (formLoadTime || Date.now());
    if (formLoadTime > 0 && elapsedMs < 2000) {
      setFormStatus({
        text: lang === "fa"
          ? "لطفاً چند لحظه صبر کنید و دوباره بفرستید."
          : lang === "de"
          ? "Bitte warten Sie einen Moment und senden Sie erneut."
          : "Please wait a moment and send again.",
        kind: "error",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          recaptchaToken: recaptchaResponse,
          // honeypot — فیلد مخفی که بات‌ها پر می‌کنن (انسان‌ها نباید)
          website: (e.target as HTMLFormElement).website?.value || "",
          // time-trap — زمان نمایش فرم (اگه زیر ۲ ثانیه submit شد، باته)
          // v1.0 rev3: مقدار state مستقیم — خواندن DOM در لحظه‌ی submit می‌توانست "0" بدهد
          _t: formLoadTime || Date.now(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setFormStatus({ text: tx("contact.success", tt.contact.form.success), kind: "success" });
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


  const reveal = (id: string) => (revealed.has(id) ? "reveal visible" : "reveal");

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
            {/* v1.1.2: دکمه‌ی بستن visible — deterrent سمت کلاینت؛ رفتار detection
                دست‌نخورده ماند (interval در صورت باز بودن devtools دوباره نشان می‌دهد) */}
            <button
              type="button"
              onClick={() => setAntiTheftWarning(false)}
              style={{
                marginTop: 12,
                padding: "8px 24px",
                background: "var(--primary, #00ff41)",
                color: "#000",
                border: "none",
                borderRadius: 4,
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.85rem",
                fontWeight: "bold",
                letterSpacing: 1,
                cursor: "pointer",
              }}
            >
            {/* v1.0 rev3 (audit BUG-c LOW): «بستن» چندزبانه شد — برای en/de هم فارسی بود */}
            {tx("tutorials.close", tt.tutorials.close)}
            </button>
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
                // اعتبارسنجی scheme — جلوگیری از javascript: و data: (helper مشترک با footer)
                const href = safeHref(item.href);
                return (
                  <a
                    key={item.id}
                    href={href}
                    target={item.target === "_blank" ? "_blank" : undefined}
                    rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                    onClick={href.startsWith("#") ? (e) => handleNavClick(e, href) : undefined}
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
              <button className={theme === "terminal" ? "active" : ""} onClick={() => chooseTheme("terminal")} title="Terminal (green/black)"><span className="theme-icon" style={{ background: "#00ff41" }}></span></button>
              <button className={theme === "midnight" ? "active" : ""} onClick={() => chooseTheme("midnight")} title="Midnight (blue)"><span className="theme-icon" style={{ background: "#4a9eff" }}></span></button>
              <button className={theme === "amber" ? "active" : ""} onClick={() => chooseTheme("amber")} title="Amber (retro CRT)"><span className="theme-icon" style={{ background: "#ffb000" }}></span></button>
              <button className={theme === "cyan" ? "active" : ""} onClick={() => chooseTheme("cyan")} title="Cyan (cyberpunk)"><span className="theme-icon" style={{ background: "#00f5d4" }}></span></button>
              <button className={theme === "purple" ? "active" : ""} onClick={() => chooseTheme("purple")} title="Purple (neon)"><span className="theme-icon" style={{ background: "#c77dff" }}></span></button>
              <button className={theme === "solar" ? "active" : ""} onClick={() => chooseTheme("solar")} title="Solarized"><span className="theme-icon" style={{ background: "#2aa198" }}></span></button>
              <button className={theme === "clean" ? "active" : ""} onClick={() => chooseTheme("clean")} title="Clean (light)"><span className="theme-icon" style={{ background: "#0066cc" }}></span></button>
              {/* V1.1: custom themes from the admin Theme Builder */}
              {customThemes.map((t: any, i: number) => {
                const id = `custom-${t.id}`;
                return (
                  <button
                    key={t.id}
                    className={theme === id ? "active" : ""}
                    onClick={() => chooseTheme(id)}
                    title={t.name || `Custom ${i + 1}`}
                  >
                    <span className="theme-icon" style={{ background: t.primary || "#00ff41" }}></span>
                  </button>
                );
              })}
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

      {/* HERO — V1.1: hideable via section.hero.visible */}
      {show("hero") && (
      <section className="hero" id="hero">
        <div className="container hero-grid">
          <div className={`hero-text ${reveal("hero-text")}`} data-reveal="hero-text">
            <p className="hero-greeting">{tx("hero.greeting", tt.hero.greeting)}</p>
            <h1 className="hero-title">{siteContent.settings?.["name_" + lang] || PERSONAL.fullName[lang]}</h1>
            {/* V18.3: tagline از دیتابیس خونده می‌شه (قبلاً hardcoded بود) */}
            <p className="hero-subtitle">{siteContent.settings?.[`tagline_${lang}`] || PERSONAL.tagline[lang]}</p>
            <div className="hero-cta">
              <a href="#articles" className="btn btn-primary" onClick={(e) => handleNavClick(e, "#articles")}>{tx("hero.cta1", tt.hero.cta)}</a>
              <a href="#contact" className="btn btn-ghost" onClick={(e) => handleNavClick(e, "#contact")}>{tx("hero.cta2", tt.hero.ctaContact)}</a>
            </div>
            {/* V1.1: social chips — از SiteSetting (social_*) با fallback به content.ts */}
            <div className="hero-socials">
              {socialChips.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-chip"
                >
                  <span>{s.label}</span>
                  <span className="chip-handle">/{socialHandleFromUrl(s.url)}</span>
                </a>
              ))}
            </div>
          </div>
          <div className={`hero-visual ${reveal("hero-visual")}`} data-reveal="hero-visual">
            {/* V1.1: terminal renders DB books/articles/tutorials/skills (fallback: content.ts) */}
            <InteractiveTerminal
              lang={lang}
              books={siteContent.books}
              articles={siteContent.articles}
              tutorials={siteContent.tutorials}
              skills={siteContent.skills}
              socials={socialChips}
              contactEmail={siteContent.settings?.contact_email || ""}
              // v1.1.1 (audit P1-G6): whoami ترمینال هم نام/تیتر DB را نشان می‌دهد
              siteName={siteContent.settings?.["name_" + lang] || PERSONAL.fullName[lang]}
              siteTagline={siteContent.settings?.[`tagline_${lang}`] || PERSONAL.tagline[lang]}
            />
          </div>
        </div>
        {/* Oscilloscope under hero — RF vibe */}
        <div className="container">
          <Oscilloscope height={70} />
        </div>
      </section>
      )}

      {/* ABOUT — with Smith Chart decoration (V1.1: hideable via section.about.visible) */}
      {show("about") && (
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
                {tt.about.stats.map((s, i) => {
                  // V1.1: full string from DB (about.statN) e.g. "5+ Years in research" —
                  // split at the first space so the number keeps the big style
                  const statStr = tx(`about.stat${i + 1}`, statFallbacks[i] || `${s.v} ${s.l}`);
                  const sp = statStr.indexOf(" ");
                  return (
                    <li key={i}>
                      <strong>{sp >= 0 ? statStr.slice(0, sp) : statStr}</strong>
                      {sp >= 0 ? <span>{statStr.slice(sp + 1)}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            <aside className={`about-card ${reveal("about-card")}`} data-reveal="about-card">
              <h3>{tx("about.factsTitle", tt.about.factsTitle)}</h3>
              <dl>
                {tt.about.facts.map((f, i) => {
                  // V1.1: full string from DB (about.factN) e.g. "location: Earth 🌍" —
                  // "key: value" keeps the dt/dd layout
                  const factStr = tx(`about.fact${i + 1}`, factFallbacks[i] || `${f.k}: ${f.v}`);
                  const sep = factStr.indexOf(":");
                  const k = sep >= 0 ? factStr.slice(0, sep).trim() : "";
                  const v = sep >= 0 ? factStr.slice(sep + 1).trim() : factStr;
                  return (
                    <div key={i}>
                      {k ? <dt>{k}</dt> : null}
                      <dd>{v}</dd>
                    </div>
                  );
                })}
              </dl>
            </aside>
          </div>

          {/* RF Equipment Rack — lab equipment from DB (V1.1: hideable via section.lab.visible) */}
          {show("lab") && <LabEquipmentRack equipment={siteContent.equipment} />}
          {/* Signal Lab — Generator + Oscilloscope (wirelessly connected) */}
          <SignalLab />
        </div>
      </section>
      )}

      <WaveDivider />

      {/* SKILLS (V1.1: hideable via section.skills.visible) */}
      {show("skills") && (
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
                  <ul className="tags">{items.map((tag: string) => <li key={`${s.id}-${i}-${tag}`}>{tag}</li>)}</ul>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* BOOKS (V1.1: hideable via section.books.visible) */}
      {show("books") && (
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
      )}

      <WaveDivider />

      {/* ARTICLES (V1.1: hideable via section.articles.visible) */}
      {show("articles") && (
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
      )}

      {/* TUTORIALS — with ArchiveGrid (search, sort, pagination) (V1.1: hideable via section.tutorials.visible) */}
      {show("tutorials") && (
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
      )}

      {/* CHAT — AI concierge (V1.1: hideable via section.chat.visible) */}
      {show("chat") && (
        <ChatSection
          lang={lang}
          welcomeText={tx("chat.welcome", tt.chat.welcome)}
          // v1.1 (admin-editable everything): عنوان/زیرعنوان/کال‌ساین چت از SiteText
          title={tx("chat.title", "") || undefined}
          subtitle={tx("chat.subtitle", "") || undefined}
          callsign={tx("chat.callsign", "") || undefined}
        />
      )}

      {/* CLIPS — Aparat video clips managed by admin (V1.1: hideable via section.clips.visible) */}
      {show("clips") && (
      <section className="section" id="clips">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">07 — clips</p>
            {/* v1.1 (admin-editable everything): عنوان/زیرعنوان/متن خالی کلیپ‌ها از SiteText */}
            <h2 className="section-title">{tx("clips.title", lang === "fa" ? "ویدیوها" : "Clips")}</h2>
            <p className="section-subtitle">{tx("clips.subtitle", lang === "fa" ? "// ویدیوهای آموزشی" : "// educational videos")}</p>
          </header>
          {aparatClips.length === 0 ? (
            <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 40 }}>
              {tx("clips.empty", lang === "fa" ? "هنوز ویدیویی اضافه نشده." : "No clips yet.")}
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
      )}

      {/* CONTACT (V1.1: hideable via section.contact.visible) */}
      {show("contact") && (
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
                {/* V1.1: social chips — از SiteSetting (social_*) با fallback به content.ts */}
                {socialChips.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-chip"
                  >
                    <span>{s.label}</span>
                    <span className="chip-handle">/{socialHandleFromUrl(s.url)}</span>
                  </a>
                ))}
              </div>
            </div>
            <form className={`contact-form ${reveal("contact-form")}`} data-reveal="contact-form" onSubmit={handleSubmit} noValidate>
              {/* Honeypot — فیلد مخفی برای بات‌ها (با CSS مخفی می‌شه) */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px", top: "auto", width: 1, height: 1, overflow: "hidden" }}
                aria-hidden="true"
              />
              {/* Time-trap — زمان نمایش فرم (یکبار ست می‌شه، نه روی هر render) */}
              <input type="hidden" name="_t" value={formLoadTime} />
              {/* V1.1: form labels/submit/sending via DB keys contact.formName/... */}
              <div className="field">
                <label htmlFor="name">{tx("contact.formName", tt.contact.form.name)}</label>
                <input type="text" id="name" name="name" placeholder={tt.contact.form.namePh} required maxLength={100} />
              </div>
              <div className="field">
                <label htmlFor="email">{tx("contact.formEmail", tt.contact.form.email)}</label>
                <input type="email" id="email" name="email" placeholder={tt.contact.form.emailPh} required maxLength={200} />
              </div>
              <div className="field">
                <label htmlFor="message">{tx("contact.formMessage", tt.contact.form.message)}</label>
                <textarea id="message" name="message" rows={5} placeholder={tt.contact.form.messagePh} required maxLength={5000}></textarea>
              </div>
              <div className="field">
                <label>{lang === "fa" ? "تأیید ربات" : "Robot check"}</label>
                {/* reCAPTCHA container — only rendered after client mount to
                    avoid hydration mismatch (grecaptcha injects iframe at runtime) */}
                {mounted ? (
                  <div
                    className="g-recaptcha"
                    // v1.1.2: sitekey از پنل (settings.recaptcha_sitekey از /api/content)
                    // اولویت دارد؛ در نبودش fallback به env قبلی.
                    data-sitekey={settings.recaptcha_sitekey || process.env.NEXT_PUBLIC_RECAPTCHA_SITEKEY || ""}
                    data-theme="dark"
                  ></div>
                ) : (
                  <div style={{ width: 304, height: 78, background: "rgba(0,255,65,0.05)", border: "1px dashed rgba(0,255,65,0.3)", borderRadius: 4 }} />
                )}
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting
                  ? tx("contact.formSending", tt.contact.form.sending)
                  : tx("contact.formSubmit", tt.contact.form.submit)}
              </button>
              <p className={`form-status ${formStatus.kind}`} role="status">{formStatus.text}</p>
            </form>
          </div>
        </div>
      </section>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          {/* V1.1: footer.built از DB با fallback به content.ts */}
          <p>© {year ?? ""} {siteContent.settings?.["name_" + lang] || PERSONAL.fullName[lang]}. {tx("footer.built", tt.footer.built)}</p>
          {/* V1.1: footer links از DB (navItems) با fallback به لینک‌های ثابت */}
          <ul className="footer-links">
            {siteContent.navItems.length > 0 ? (
              siteContent.navItems.map((item: any) => {
                const labelField = `label${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
                const label = item[labelField] || item.labelEn || "";
                const href = safeHref(item.href);
                return (
                  <li key={item.id}>
                    <a
                      href={href}
                      target={item.target === "_blank" ? "_blank" : undefined}
                      rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                      onClick={href.startsWith("#") ? (e) => handleNavClick(e, href) : undefined}
                    >
                      {label}
                    </a>
                  </li>
                );
              })
            ) : (
              <>
                <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")}>{tt.nav.about}</a></li>
                <li><a href="#books" onClick={(e) => handleNavClick(e, "#books")}>{tt.nav.books}</a></li>
                <li><a href="#tutorials" onClick={(e) => handleNavClick(e, "#tutorials")}>{tt.nav.tutorials}</a></li>
                <li><a href="#chat" onClick={(e) => handleNavClick(e, "#chat")}>{tt.nav.chat || "chat"}</a></li>
                <li><a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>{tt.nav.contact}</a></li>
              </>
            )}
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
                {(activeTutorial as any)?.[`title${lang.charAt(0).toUpperCase() + lang.slice(1)}`] || activeTutorial?.titleEn} · {activeTutorial?.duration} · {(activeTutorial as any)?.[`level${lang.charAt(0).toUpperCase() + lang.slice(1)}`] || activeTutorial?.levelEn}
              </span>
              <button className="tutorial-modal-close" onClick={() => setActiveTutorial(null)}>
                {tt.tutorials.close}
              </button>
            </div>
            <div className="tutorial-modal-video">
              <iframe
                src={(() => {
                  // اعتبارسنجی scheme — فقط https و یوتیوب/آپارات مجازن
                  const url = activeTutorial?.embedUrl || "";
                  try {
                    const u = new URL(url);
                    const allowed = ["www.aparat.com", "aparat.com", "www.youtube.com", "youtube.com", "youtu.be", "player.vimeo.com"];
                    // v1.0 (audit W36-40 #4): فقط https — روی سایت HTTPS، iframe http
                    // به‌عنوان mixed-content بلاک می‌شود (ناحیه‌ی مرده‌ی ویدیو)
                    if (u.protocol === "https:" && allowed.includes(u.hostname)) {
                      return url;
                    }
                  } catch {
                    // اگه URL معتبر نبود، fallback به درج آپارات با embed کد
                  }
                  return "about:blank";
                })()}
                title={(activeTutorial as any)?.[`title${lang.charAt(0).toUpperCase() + lang.slice(1)}`] || activeTutorial?.titleEn || "Tutorial"}
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
