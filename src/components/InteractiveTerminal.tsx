"use client";

// ============================================================================
// InteractiveTerminal.tsx — v1.0
// InteractiveTerminal — ترمینال تعاملی هدر سایت؛ دستورات whoami/help/... و پاسخ‌های
// مبتنی بر داده‌ی واقعی دیتابیس (نام، تیتر، آمار).
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { UI, PERSONAL, SKILLS, BOOKS, ARTICLES, TUTORIALS, SOCIALS, type Lang } from "@/lib/content";

type Line = { kind: "system" | "output" | "error" | "success"; text: string };

type SocialChip = { id: string; label: string; url: string };

interface TerminalProps {
  lang: Lang;
  /**
   * V1.1: content from useContent() in page.tsx (DB rows).
   * Each prop falls back to the static demo arrays from lib/content.ts
   * when empty, so the terminal always has something to show.
   */
  books?: Record<string, any>[];
  articles?: Record<string, any>[];
  tutorials?: Record<string, any>[];
  skills?: Record<string, any>[];
  /** Resolved social chips ({ label, url }) — from settings social_* keys or SOCIALS */
  socials?: SocialChip[];
  /** v1.1 (admin-editable): ایمیل نمایشی از settings contact_email (terminal contact) */
  contactEmail?: string;
  /** v1.1.1 (audit P1-G6): نام/تیتر از DB — خروجی whoami قبلاً همیشه static
   *  PERSONAL را چاپ می‌کرد و تغییر نام از پنل در ترمینال دیده نمی‌شد */
  siteName?: string;
  siteTagline?: string;
}

export default function InteractiveTerminal({
  lang,
  books = [],
  articles = [],
  tutorials = [],
  skills = [],
  socials = [],
  contactEmail = "",
  siteName = "",
  siteTagline = "",
}: TerminalProps) {
  const tt = UI[lang];
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // welcome line
  useEffect(() => {
    setLines([{ kind: "system", text: tt.terminal.welcome }]);
  }, [tt.terminal.welcome]);

  // autoscroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines]);

  const push = (newLines: Line[]) => setLines((prev) => [...prev, ...newLines]);

  // V1.1: localized field getter that supports BOTH item shapes:
  //   DB row (from /api/content): { titleEn, titleFa, titleDe, descEn, ... }
  //   content.ts static array:    { title: { en, fa, de }, description: {...} }
  const loc = (obj: any, base: string): string =>
    obj?.[base]?.[lang] || // content.ts nested shape
    obj?.[`${base}${lang.charAt(0).toUpperCase() + lang.slice(1)}`] || // DB flat shape (titleFa/titleDe/titleEn)
    obj?.[`${base}En`] ||
    "";
  const locAny = (obj: any, bases: string[]): string => {
    for (const b of bases) {
      const v = loc(obj, b);
      if (v) return v;
    }
    return "";
  };

  // V1.1: social list — props (DB settings social_*) win, else SOCIALS fallback
  const socialList: SocialChip[] =
    socials.length > 0
      ? socials
      : SOCIALS.map((s) => ({ id: s.id, label: s.label, url: `${s.url}${s.handle}` }));

  const exec = (raw: string): Line[] => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return [];
    const out = (text: string): Line[] => [{ kind: "output", text }];

    switch (cmd) {
      case "help":
        return [{ kind: "system", text: tt.terminal.help }];
      case "about":
      case "whoami":
        // v1.1.1 (audit P1-G6): نام/تیتر از DB (پنل) — fallback به PERSONAL
        return out(
          `${siteName || PERSONAL.fullName[lang]} — ${siteTagline || PERSONAL.tagline[lang]}\n\n${tt.about.p1}\n\n${tt.about.p2}`
        );
      case "skills": {
        // V1.1: DB skills (from admin panel) with content.ts fallback
        const list = (skills.length > 0 ? skills : SKILLS).map((s: any) => {
          const category = loc(s, "category");
          const items = Array.isArray(s.items)
            ? s.items
            : String(s.items || "")
                .split(",")
                .map((x: string) => x.trim())
                .filter(Boolean);
          return `  ${category}:\n    ${items.join(", ")}`;
        }).join("\n\n");
        return out(`${tt.skills.title}\n${list}`);
      }
      case "books": {
        // V1.1: DB books with content.ts fallback
        const list = (books.length > 0 ? books : BOOKS).map((b: any) => {
          const title = loc(b, "title");
          const publisher = loc(b, "publisher");
          const desc = locAny(b, ["description", "desc"]);
          return `  [${b.year || ""}] ${title} — ${publisher}\n    ${desc}`;
        }).join("\n\n");
        return out(`${tt.books.title}\n${list}`);
      }
      case "articles": {
        // V1.1: DB articles with content.ts fallback
        const list = (articles.length > 0 ? articles : ARTICLES).map((a: any) => {
          const title = loc(a, "title");
          const venue = loc(a, "venue");
          const type = loc(a, "type");
          const summary = loc(a, "summary");
          return `  [${a.date || ""}] ${title}\n    ${venue} (${type})\n    ${summary}`;
        }).join("\n\n");
        return out(`${tt.articles.title}\n${list}`);
      }
      case "tutorials": {
        // V1.1: DB tutorials with content.ts fallback
        const list = (tutorials.length > 0 ? tutorials : TUTORIALS).map((t: any) => {
          const title = loc(t, "title");
          const level = loc(t, "level");
          const desc = locAny(t, ["description", "desc"]);
          return `  [${t.duration || ""}] ${title} (${level})\n    ${desc}`;
        }).join("\n\n");
        return out(`${tt.tutorials.title}\n${list}`);
      }
      case "contact":
        return out(
          `${tt.contact.form.email}: ${contactEmail || PERSONAL.email}\n` +
            socialList.map((s) => `  ${s.label}: ${s.url}`).join("\n")
        );
      case "social":
        return out(socialList.map((s) => `  ${s.label.padEnd(10)} → ${s.url}`).join("\n"));
      case "date":
        return out(`${new Date().toUTCString()}`);
      case "admin":
      case "root":
        if (typeof window !== "undefined") {
          // v1.0 rev3 (audit BUG-c LOW): لنگر #admin وجود ندارد — پنل واقعی /user-dashboard است
          window.location.href = "/user-dashboard";
          return [{ kind: "success", text: ">> opening admin panel..." }];
        }
        return out("admin panel: visit /user-dashboard");
      case "chat":
        if (typeof window !== "undefined") {
          document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" });
          return [{ kind: "success", text: ">> scrolling to chat..." }];
        }
        return out("chat section below");
      case "scan":
        return out(
          [
            "scanning RF spectrum...",
            "  2.400 GHz  ████████░░  -42 dBm",
            "  2.442 GHz  ██████░░░░  -58 dBm",
            "  5.180 GHz  ███░░░░░░░  -71 dBm",
            "  5.745 GHz  █████████░  -39 dBm",
            "done. 4 networks found."
          ].join("\n")
        );
      case "matrix":
        return out(
          [
            "Wake up, Neo...",
            "The Matrix has you...",
            "Follow the white rabbit. 🐇",
            "",
            "Knock, knock, Neo."
          ].join("\n")
        );
      case "coffee":
        return out("☕ brewing... the real fuel behind this portfolio.");
      case "42":
        return out("The Answer to the Ultimate Question of Life, the Universe, and Everything.");
      case "sudo":
        return [{ kind: "error", text: "user is not in the sudoers file. This incident will be reported." }];
      case "hack":
        return out("hacking in progress...\n░░░░░░░░░░ 0%\njust kidding. this is a portfolio, not a pentest target. 😄");
      case "hello":
      case "hi":
      case "hey":
        return out(lang === "fa" ? "سلام! خوش اومدی. `help` رو بزن تا ببینی چی می‌تونی انجام بدی." : lang === "de" ? "Hallo! Willkommen. Tippe `help` für Optionen." : "hey there! type `help` to see what you can do.");
      case "visitor":
        return out("you are visitor #" + (Math.floor(Math.random() * 9999) + 1000) + " · welcome 👋");
      case "clear":
      case "cls":
        return []; // signal cleared — handled below
      case "ls":
        return out("about/  skills/  books/  articles/  tutorials/  contact/  chat/");
      case "pwd":
        return out("/home/guest/portfolio");
      case "exit":
        return out("connection kept open. type 'clear' to reset.");
      default:
        return [{ kind: "error", text: tt.terminal.unknown(cmd) }];
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input;
    const prompt: Line = {
      kind: "output",
      text: `${tt.hero.prompt} ${raw}`,
    };
    if (raw.trim().toLowerCase() === "clear" || raw.trim().toLowerCase() === "cls") {
      setLines([]);
    } else {
      const result = exec(raw);
      push([prompt, ...result]);
    }
    if (raw.trim()) {
      setHistory((h) => [...h, raw]);
    }
    setHIdx(-1);
    setInput("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = hIdx === -1 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(newIdx);
      setInput(history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx === -1) return;
      const newIdx = hIdx + 1;
      if (newIdx >= history.length) {
        setHIdx(-1);
        setInput("");
      } else {
        setHIdx(newIdx);
        setInput(history[newIdx]);
      }
    }
  };

  return (
    <div className="terminal" onClick={() => inputRef.current?.focus()}>
      <div className="terminal-bar">
        <span className="terminal-bar-dots">
          <span></span><span></span><span></span>
        </span>
        <span className="terminal-bar-title">guest@portfolio — bash — 80x24</span>
        <span></span>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {lines.map((l, i) => (
          <div key={i} className={`terminal-line ${l.kind}`}>{l.text}</div>
        ))}
        <form className="terminal-input-line" onSubmit={onSubmit}>
          <span className="terminal-prompt">{tt.hero.prompt}</span>
          <input
            ref={inputRef}
            className="terminal-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="terminal input"
          />
        </form>
      </div>
    </div>
  );
}
