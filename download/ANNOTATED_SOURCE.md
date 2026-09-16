# Annotated Source Code — Line-by-Line Explanation

This document contains the key source files with detailed comments explaining what each section does.

---

## 📄 src/lib/content.ts (Main Content File)

```typescript
// ============================================================================
//  CONTENT FILE  —  This is the ONLY file you need to edit to change your site.
//  All text, data, and settings live here. The template reads from this file.
// ============================================================================

// Type definition: which languages are supported
export type Lang = "en" | "de" | "fa";

// Default language when a visitor first loads the site
export const DEFAULT_LANG: Lang = "en";

// All available languages (shown in the navbar switcher)
export const LANGS: Lang[] = ["en", "de", "fa"];

// ----------------------------------------------------------------------------
//  PERSONAL INFO  —  Your identity. Replace with your own.
// ----------------------------------------------------------------------------
export const PERSONAL = {
  // Short username shown in navbar and footer (lowercase, no spaces)
  handle: "your_handle",
  
  // Your full name in all 3 languages
  fullName: {
    en: "Your Name",      // English
    de: "Ihr Name",       // German
    fa: "اسم شما",         // Persian
  },
  
  // One-line tagline shown under the hero title
  tagline: {
    en: "RF/Microwave Researcher · AI/ML Programmer · Writer & Translator",
    de: "RF/Mikrowellen-Forscher · AI/ML-Programmierer · Autor & Übersetzer",
    fa: "پژوهشگر RF/مایکروویو · برنامه‌نویس AI/ML · نویسنده و مترجم",
  },
  
  // Password to access the admin panel at #admin
  // CHANGE THIS to something strong!
  adminPassword: "admin123",
};

// ----------------------------------------------------------------------------
//  RF LAB EQUIPMENT  —  Shown in the About section as an equipment rack
//  with LED status indicators (green=online, amber=standby)
// ----------------------------------------------------------------------------
export const RF_EQUIPMENT = [
  { id: "vna", name: "Vector Network Analyzer", model: "Keysight PNA-X", status: "online" },
  { id: "sa", name: "Spectrum Analyzer", model: "R&S FSW", status: "online" },
  // ... add more equipment
];

// ----------------------------------------------------------------------------
//  SOCIAL LINKS  —  Shown as styled chips in hero and contact sections
//  Each has: unique id, display label, base URL, and your handle
// ----------------------------------------------------------------------------
export const SOCIALS = [
  { id: "github", label: "GitHub", url: "https://github.com/", handle: "your_handle" },
  { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/", handle: "your_handle" },
  { id: "devto", label: "dev.to", url: "https://dev.to/", handle: "your_handle" },
  { id: "medium", label: "Medium", url: "https://medium.com/@", handle: "your_handle" },
];

// ----------------------------------------------------------------------------
//  SKILLS  —  Grouped by category. Each category shows as a card with tags.
// ----------------------------------------------------------------------------
export const SKILLS = [
  {
    category: { en: "RF & Microwave", de: "RF & Mikrowelle", fa: "RF و مایکروویو" },
    items: ["Antenna Design", "EM Simulation", "S-Parameters", ...],
  },
  // ... more categories
];

// ----------------------------------------------------------------------------
//  BOOKS  —  Each book shows as a card with gradient cover
//  cover: CSS gradient string (use https://cssgradient.io)
//  link: URL to buy/read the book
// ----------------------------------------------------------------------------
export const BOOKS = [
  {
    id: "b1",                              // Unique ID
    title: { en: "...", de: "...", fa: "..." },  // Title in 3 languages
    year: "2024",                          // Publication year
    publisher: { en: "...", de: "...", fa: "..." },
    description: { en: "...", de: "...", fa: "..." },
    cover: "linear-gradient(135deg,#003b00,#00ff41)",  // CSS gradient
    link: "https://...",                   // Link to buy/read
  },
];

// ----------------------------------------------------------------------------
//  ARTICLES  —  Shown as a terminal-log-style list
//  date: YYYY-MM format
//  type: e.g. "Research Paper", "Tutorial", "Essay"
// ----------------------------------------------------------------------------
export const ARTICLES = [
  {
    id: "a1",
    title: { en: "...", de: "...", fa: "..." },
    venue: { en: "Journal Name", de: "...", fa: "..." },  // Where published
    date: "2024-09",
    type: { en: "Research Paper", de: "...", fa: "..." },
    summary: { en: "...", de: "...", fa: "..." },
    link: "https://...",
  },
];

// ----------------------------------------------------------------------------
//  TUTORIALS  —  Video tutorials shown as clickable cards
//  Clicking opens a modal with the video embedded via iframe
//  
//  IMPORTANT: embedUrl must be the EMBED URL, not the watch URL!
//  Aparat:  https://www.aparat.com/video/video/embed/videohash/XXXX/vframe
//  YouTube: https://www.youtube.com/embed/XXXX
// ----------------------------------------------------------------------------
export const TUTORIALS = [
  {
    id: "t1",
    title: { en: "...", de: "...", fa: "..." },
    duration: "12:34",     // mm:ss
    level: { en: "Beginner", de: "Anfänger", fa: "مقدماتی" },
    description: { en: "...", de: "...", fa: "..." },
    embedUrl: "https://www.aparat.com/video/video/embed/videohash/XXXX/vframe",
    platform: "aparat",
  },
];

// ----------------------------------------------------------------------------
//  UI STRINGS  —  All interface text in 3 languages
//  This is the biggest section. You usually don't need to change it
//  unless you want to reword something.
// ----------------------------------------------------------------------------
export const UI = {
  en: {
    dir: "ltr",           // Text direction: "ltr" or "rtl"
    nav: { about: "about", skills: "skills", ... },
    hero: { greeting: "Hello, world.", ... },
    about: { num: "01", label: "about", title: "Whoami", ... },
    // ... all section text
    contact: {
      title: "Open Channel",
      form: {
        name: "Name", email: "Your Email (for reply)", message: "Message",
        submit: "send [enter]",
        success: "✓ message received. thank you!",
        errors: { missing: "All fields required.", ... },
      },
    },
    terminal: {
      welcome: "Welcome. Type `help` for available commands.",
      help: "Available commands:\n  help — show this list\n  ...",
    },
  },
  de: { /* German translations */ },
  fa: { dir: "rtl", /* Persian translations */ },
};
```

---

## 📄 src/app/page.tsx (Main Page) — Key Sections Explained

### 1. Imports and State (lines 1-66)

```typescript
"use client";  // This is a client component (runs in browser)

import { useEffect, useState, type FormEvent } from "react";
import "./personal.css";                    // All styling
import MatrixRain from "@/components/MatrixRain";        // Background animation
import InteractiveTerminal from "@/components/InteractiveTerminal";  // Terminal
import Oscilloscope from "@/components/Oscilloscope";    // Hero waveform
import SignalLab from "@/components/SignalLab";          // Generator + Scope
import SignalBars from "@/components/SignalBars";        // Status bar bars
import ChatSection from "@/components/ChatSection";      // AI chat
import { UI, PERSONAL, SOCIALS, ... } from "@/lib/content";  // All content

// State variables
const [lang, setLang] = useState<Lang>(DEFAULT_LANG);      // Current language
const [theme, setTheme] = useState<"terminal"|"clean"|"midnight">("terminal");  // Theme
const [adminOpen, setAdminOpen] = useState(false);         // Admin panel open?
const [adminMsgs, setAdminMsgs] = useState(null);          // Contact messages
const [adminChats, setAdminChats] = useState(null);        // AI chat logs
const [adminSettings, setAdminSettings] = useState(null);  // Site settings
// ... more state
```

### 2. Theme System (lines 75-84)

```typescript
// Load saved theme from browser localStorage
useEffect(() => {
  const saved = localStorage.getItem("portfolio_theme");
  if (saved) setTheme(saved);
}, []);

// Apply theme to <html> attribute + save to localStorage
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("portfolio_theme", theme);
}, [theme]);
```

### 3. Anti-Theft Protection (lines 86-123)

```typescript
useEffect(() => {
  // Disable right-click context menu
  const onContextMenu = (e) => e.preventDefault();
  
  // Block F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
  const onKeydown = (e) => {
    if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
      e.preventDefault();
    }
  };
  
  // DevTools detection — if window size difference > 160px, devtools is open
  const checkDevtools = () => {
    if (window.outerWidth - window.innerWidth > 160) {
      setAntiTheftWarning(true);  // Show warning overlay
    }
  };
  
  setInterval(checkDevtools, 1000);
  document.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("keydown", onKeydown);
}, []);
```

### 4. Shamsi Calendar Clock (lines 139-190)

```typescript
useEffect(() => {
  const tick = () => {
    const d = new Date();
    
    if (lang === "fa") {
      // Persian (Jalali) calendar with Persian digits
      // Uses Intl.DateTimeFormat with 'fa-IR-u-ca-persian' locale
      const shamsi = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).format(d);
      setLocalTime(shamsi);  // e.g., "۱۴۰۵/۰۵/۱۹, ۱۹:۲۹"
    } else if (lang === "de") {
      // German format
      const de = new Intl.DateTimeFormat("de-DE", {...}).format(d);
      setLocalTime(de);
    } else {
      // English format
      const en = new Intl.DateTimeFormat("en-GB", {...}).format(d);
      setLocalTime(en);
    }
  };
  tick();
  const id = setInterval(tick, 1000);  // Update every second
  return () => clearInterval(id);
}, [lang]);  // Re-run when language changes
```

### 5. Admin Panel Unlock (lines 310-340)

```typescript
const adminUnlock = async (e) => {
  e.preventDefault();
  
  // Fetch messages, chats, and settings in parallel
  const [msgRes, chatRes, settingsRes] = await Promise.all([
    fetch(`/api/messages?password=${adminPwd}`),
    fetch(`/api/chat?password=${adminPwd}`),
    fetch(`/api/admin/settings?password=${adminPwd}`),
  ]);
  
  // Store results in state
  setAdminMsgs(msgData.messages);
  setAdminChats(chatData.sessions);
  setAdminSettings(settingsData.settings);
};
```

### 6. Admin Reply to Contact Message (lines 344-365)

```typescript
const submitReply = async (messageId) => {
  // POST to /api/admin/reply with password, message ID, and reply text
  const res = await fetch("/api/admin/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: adminPwd, messageId, reply: replyText }),
  });
  
  if (res.ok) {
    setReplyStatus({ id: messageId, text: "✓ reply saved", ok: true });
    setReplyText("");
    setReplyingTo(null);
  }
};
```

### 7. Theme Switcher in Navbar (lines 532-558)

```tsx
<div className="theme-switcher">
  <button className={theme === "terminal" ? "active" : ""}
          onClick={() => setTheme("terminal")}>
    <span className="theme-icon" style={{ background: "#00ff41" }}></span>
  </button>
  <button className={theme === "midnight" ? "active" : ""}
          onClick={() => setTheme("midnight")}>
    <span className="theme-icon" style={{ background: "#4a9eff" }}></span>
  </button>
  <button className={theme === "clean" ? "active" : ""}
          onClick={() => setTheme("clean")}>
    <span className="theme-icon" style={{ background: "#0066cc" }}></span>
  </button>
</div>
```

### 8. Signal Lab in About Section (lines 636-638)

```tsx
{/* Signal Lab — Generator + Oscilloscope (wirelessly connected) */}
<SignalLab />
```

The SignalLab component manages shared state (waveform, frequency, amplitude).
When you change the generator controls, the oscilloscope canvas updates in real-time.

### 9. Admin Panel with 3 Tabs (lines 955-1120)

```tsx
<div className="admin-tabs">
  <button onClick={() => setAdminTab("messages")}>contact messages ({adminMsgs.length})</button>
  <button onClick={() => setAdminTab("chats")}>AI chat logs ({adminChats?.length})</button>
  <button onClick={() => setAdminTab("settings")}>settings</button>
</div>

{adminTab === "messages" && (
  <>
    <input className="admin-search" ... />  {/* Search box */}
    <button onClick={exportCSV}>export CSV</button>  {/* Export button */}
    {filteredMessages.map(m => (
      <div className="admin-message">
        <div className="admin-message-text">{m.message}</div>
        <div className="admin-reply-box">
          {/* Reply textarea + save button */}
        </div>
      </div>
    ))}
  </>
)}

{adminTab === "settings" && (
  <>
    {/* API Kill Switch toggle */}
    <div className="admin-toggle" onClick={toggleApi} />
    
    {/* Content editing (name, tagline, status) */}
    <input value={adminSettings.adminDisplayName} ... />
    
    {/* Bale messenger configuration */}
    <input type="password" value={adminSettings.baleBotToken} ... />
  </>
)}
```

---

## 📄 src/components/SignalLab.tsx — How It Works

```typescript
// State: waveform type, frequency, amplitude — shared between both devices
const [waveform, setWaveform] = useState<Waveform>("sine");
const [frequency, setFrequency] = useState(3);    // Hz
const [amplitude, setAmplitude] = useState(0.7);  // 0-1

// Generate waveform value at a given phase
const waveValue = (phase, wf, amp) => {
  switch (wf) {
    case "sine":     return Math.sin(phase) * amp;
    case "square":   return (Math.sin(phase) >= 0 ? 1 : -1) * amp;
    case "triangle": return (2 / Math.PI) * Math.asin(Math.sin(phase)) * amp;
    case "sawtooth": return (2 * (phase/(2*PI) - Math.floor(phase/(2*PI) + 0.5))) * amp;
  }
};

// Canvas animation loop — draws both generator output and oscilloscope display
useEffect(() => {
  const draw = () => {
    // 1. Draw generator output (smaller canvas, shows the wave being generated)
    for (let i = 0; i <= gw; i++) {
      const phase = (i / gw) * 2 * Math.PI * frequency + t;
      const y = gh/2 - waveValue(phase, waveform, amplitude) * (gh * 0.35);
      // Draw line to (i, y)
    }
    
    // 2. Draw oscilloscope display (larger canvas, shows received signal)
    // Same waveform, with a sweep cursor animation
    for (let i = 0; i <= sw; i++) {
      const phase = (i / sw) * 2 * Math.PI * frequency * 2 + t + sweepPhase;
      const y = sh/2 - waveValue(phase, waveform, amplitude) * (sh * 0.38);
      // Draw line to (i, y)
    }
  };
  
  requestAnimationFrame(draw);
}, [waveform, frequency, amplitude]);  // Re-run when controls change
```

---

## 📄 src/app/api/chat/route.ts — AI Chat Backend

```typescript
// System prompt — controls the bot's personality
function buildSystemPrompt(lang) {
  return `You are the AI concierge on ${name}'s personal portfolio website.
  // ... personality instructions
  // - Friendly, curious, slightly nerdy
  // - Ask visitors for their opinions
  // - Respond in visitor's language
  // - Never claim to BE ${name}`;
}

export async function POST(req) {
  // 1. Rate limit (8 messages/minute per IP)
  if (!rateLimit(ip)) return 429;
  
  // 2. Parse body
  const { message, lang, visitorId, sessionId } = await req.json();
  
  // 3. Check API kill switch
  if (!await isApiEnabled()) return 503;
  
  // 4. Get or create chat session
  let session = await db.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) session = await db.chatSession.create({ data: { visitorId, ip } });
  
  // 5. Save user message
  await db.chatMessage.create({ data: { sessionId, role: "user", content: message } });
  
  // 6. Send Bale notification (async, non-blocking)
  notifyNewChat({ sessionId, visitorId, message });
  
  // 7. Call the LLM
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: systemPrompt },
      ...history,
      { role: "user", content: message },
    ],
  });
  const reply = completion.choices[0].message.content;
  
  // 8. Save AI reply
  await db.chatMessage.create({ data: { sessionId, role: "assistant", content: reply } });
  
  // 9. Return reply
  return { ok: true, sessionId, reply };
}
```

---

## 📄 src/lib/bale.ts — Bale Messenger Integration

```typescript
// Send a message to the admin's Bale chat
async function sendBaleMessage(text) {
  const config = await getBaleConfig();  // token, chatId, enabled
  if (!config.enabled) return false;
  
  const url = `https://api.bale.ai/v1/bots${config.token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "Markdown" }),
  });
}

// Notify admin about new contact message
async function notifyNewContactMessage(msg) {
  sendBaleMessage(`📨 *New Contact Message*\n*From:* ${msg.name}\n...`);
}

// Process inbound webhook (admin replying from Bale)
async function processBaleWebhook(body) {
  const text = body.message.text;
  const [cmd, ...args] = text.split(/\s+/);
  
  switch (cmd) {
    case "/list":    // Show recent messages
    case "/reply":   // Reply to a message: /reply {id} {text}
    case "/chat":    // Reply in AI chat: /chat {sessionId} {text}
    case "/disable": // Disable AI chat API
    case "/enable":  // Enable AI chat API
    case "/stats":   // Show statistics
  }
}
```

---

## Summary

The site is organized so that:
1. **content.ts** = all your data (edit this)
2. **page.tsx** = page layout and logic
3. **personal.css** = all visual styling
4. **components/** = reusable visual elements
5. **api/** = server-side endpoints
6. **lib/** = shared utilities (db, settings, bale)

You only need to touch **content.ts** for 90% of changes.
