"use client";

import { useEffect, useRef, useState } from "react";
import { UI, PERSONAL, SKILLS, BOOKS, ARTICLES, TUTORIALS, SOCIALS, type Lang } from "@/lib/content";

type Line = { kind: "system" | "output" | "error" | "success"; text: string };

export default function InteractiveTerminal({ lang }: { lang: Lang }) {
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

  const exec = (raw: string): Line[] => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return [];
    const out = (text: string): Line[] => [{ kind: "output", text }];

    switch (cmd) {
      case "help":
        return [{ kind: "system", text: tt.terminal.help }];
      case "about":
      case "whoami":
        return out(
          `${PERSONAL.fullName[lang]} — ${PERSONAL.tagline[lang]}\n\n${tt.about.p1}\n\n${tt.about.p2}`
        );
      case "skills": {
        const list = SKILLS.map(
          (s) => `  ${s.category[lang]}:\n    ${s.items.join(", ")}`
        ).join("\n\n");
        return out(`${tt.skills.title}\n${list}`);
      }
      case "books": {
        const list = BOOKS.map(
          (b) => `  [${b.year}] ${b.title[lang]} — ${b.publisher[lang]}\n    ${b.description[lang]}`
        ).join("\n\n");
        return out(`${tt.books.title}\n${list}`);
      }
      case "articles": {
        const list = ARTICLES.map(
          (a) => `  [${a.date}] ${a.title[lang]}\n    ${a.venue[lang]} (${a.type[lang]})\n    ${a.summary[lang]}`
        ).join("\n\n");
        return out(`${tt.articles.title}\n${list}`);
      }
      case "tutorials": {
        const list = TUTORIALS.map(
          (t) => `  [${t.duration}] ${t.title[lang]} (${t.level[lang]})\n    ${t.description[lang]}`
        ).join("\n\n");
        return out(`${tt.tutorials.title}\n${list}`);
      }
      case "contact":
        return out(
          `${tt.contact.form.email}: ${PERSONAL.email}\n` +
            SOCIALS.map((s) => `  ${s.label}: ${s.url}${s.handle}`).join("\n")
        );
      case "social":
        return out(SOCIALS.map((s) => `  ${s.label.padEnd(10)} → ${s.url}${s.handle}`).join("\n"));
      case "date":
        return out(`${new Date().toUTCString()}`);
      case "admin":
      case "root":
        if (typeof window !== "undefined") {
          window.location.hash = "admin";
          return [{ kind: "success", text: ">> opening admin panel..." }];
        }
        return out("admin panel: visit #admin");
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
