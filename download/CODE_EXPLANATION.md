# Personal Site — Code Walkthrough (Line-by-Line)

This document explains every file in your personal site so you can understand, customize, and extend it. The site is built with **Next.js 16 + TypeScript + Prisma (SQLite)**.

---

## 📁 File Structure

```
/home/z/my-project/
├── prisma/
│   └── schema.prisma              ← Database models (tables)
├── db/
│   └── custom.db                  ← SQLite database file (auto-created)
├── src/
│   ├── app/
│   │   ├── layout.tsx             ← Root HTML shell (fonts, metadata)
│   │   ├── page.tsx               ← Main page (all sections + admin)
│   │   ├── globals.css            ← Tailwind import (minimal)
│   │   ├── personal.css           ← ALL visual styling (terminal/RF theme)
│   │   └── api/
│   │       ├── contact/route.ts   ← Contact form handler (POST → DB)
│   │       ├── messages/route.ts  ← Admin: fetch contact messages (GET)
│   │       └── chat/route.ts      ← AI chat handler (POST → LLM → DB)
│   ├── components/
│   │   ├── MatrixRain.tsx         ← Background falling-code canvas
│   │   ├── InteractiveTerminal.tsx← Terminal users can type commands into
│   │   ├── Oscilloscope.tsx       ← Animated sine-wave canvas (RF vibe)
│   │   ├── SmithChart.tsx         ← SVG Smith chart decoration
│   │   ├── SignalBars.tsx         ← Animated signal-strength bars
│   │   └── ChatSection.tsx        ← AI concierge chat UI
│   └── lib/
│       ├── content.ts             ← ⭐ ALL your content (edit this!)
│       └── db.ts                  ← Prisma client singleton
└── download/
    └── preview/                   ← Screenshots for verification
```

---

## ⭐ `src/lib/content.ts` — YOUR content file

**This is the only file you need to edit.** Everything else is template logic.

### Sections in this file:

1. **`PERSONAL`** (line ~15)
   - `handle` — your short username (navbar, footer)
   - `fullName` — your name in EN/DE/FA
   - `tagline` — one-line description (hero subtitle)
   - `email` — public email shown in contact
   - `adminPassword` — password to view messages at `#admin`

2. **`SOCIALS`** (line ~35)
   - Array of social links: GitHub, LinkedIn, dev.to, Medium
   - Each has `label`, `url`, `handle`
   - Add/remove entries freely

3. **`SKILLS`** (line ~50)
   - Array of skill categories
   - Each has `category` (name in 3 langs) + `items` (tech tags)

4. **`BOOKS`** (line ~75)
   - Array of book objects
   - Each has: `id`, `title` (3 langs), `year`, `publisher` (3 langs), `description` (3 langs), `cover` (CSS gradient), `link`

5. **`ARTICLES`** (line ~120)
   - Array of article objects
   - Each has: `id`, `title`, `venue`, `date`, `type`, `summary` (all in 3 langs), `link`

6. **`TUTORIALS`** (line ~170)
   - Array of tutorial objects
   - Each has: `id`, `title`, `duration`, `level`, `description` (3 langs), `embedUrl`, `platform`
   - **embedUrl** must be the EMBED URL:
     - Aparat: `https://www.aparat.com/video/video/embed/videohash/XXXX/vframe`
     - YouTube: `https://www.youtube.com/embed/XXXX`

7. **`UI`** (line ~275)
   - Interface strings for EN, DE, FA
   - Navigation labels, section titles, form labels, terminal help text
   - You usually don't need to touch this unless you want to change wording

---

## 🗄️ `prisma/schema.prisma` — Database Models

Three models (tables):

### `ContactMessage`
Stores messages from the contact form.
```
- id        (auto-generated unique ID)
- name      (sender's name)
- email     (sender's email)
- message   (the message text)
- ip        (visitor's IP, for spam tracking)
- userAgent (browser info, for bot detection)
- createdAt (timestamp)
```

### `ChatSession`
A conversation between a visitor and the AI.
```
- id        (auto-generated)
- visitorId (stable per-browser ID, stored in localStorage)
- ip, userAgent, createdAt, updatedAt
- messages  (relation to ChatMessage[])
```

### `ChatMessage`
Individual messages in a chat session.
```
- id, sessionId, createdAt
- role      ("user" or "assistant")
- content   (message text)
```

**To change the schema:** edit this file, then run `bun run db:push`.

---

## 🔌 API Routes

### `src/app/api/contact/route.ts` — Contact form

**POST** `/api/contact`
- Body: `{ name, email, message }`
- Validates: all fields present, valid email, message ≥ 10 chars
- Anti-spam: rate limit (3/10min/IP), bot detection, spam pattern matching
- On success: saves to `ContactMessage` table, returns `{ ok: true, id }`
- On failure: returns `{ ok: false, error: "..." }` with HTTP 4xx

### `src/app/api/chat/route.ts` — AI chat

**POST** `/api/chat`
- Body: `{ sessionId?, message, lang, visitorId }`
- Creates or resumes a `ChatSession`
- Saves user message to `ChatMessage`
- Calls `z-ai-web-dev-sdk` LLM with a system prompt that makes the bot:
  - Friendly, curious, slightly nerdy
  - Asks for visitor's opinion
  - Recommends relevant content
  - Responds in visitor's language
- Saves AI reply to `ChatMessage`
- Returns `{ ok: true, sessionId, reply }`

**GET** `/api/chat?password=xxx`
- Admin endpoint: returns all chat sessions with messages
- Password-protected (compared to `PERSONAL.adminPassword`)

### `src/app/api/messages/route.ts` — Admin messages

**GET** `/api/messages?password=xxx`
- Returns last 50 contact messages + stats (message count, chat count)
- Password-protected

---

## 🎨 Components

### `MatrixRain.tsx`
- Canvas that draws falling green characters (Matrix movie style)
- Fixed background, low opacity, respects `prefers-reduced-motion`

### `InteractiveTerminal.tsx`
- Terminal window where visitors type commands
- Commands: `help, about, skills, books, articles, tutorials, contact, social, whoami, clear, date, scan, chat, admin, ls, pwd`
- Has command history (↑/↓ arrows)
- `scan` — shows fake RF spectrum scan
- `chat` — scrolls to AI chat section
- `admin` — opens admin panel

### `Oscilloscope.tsx`
- Canvas with animated sine wave on a grid
- Reacts to mouse movement (frequency and amplitude change)
- Adds RF/electronic engineering vibe

### `SmithChart.tsx`
- SVG Smith chart (recognizable to RF engineers)
- Slowly rotates, decorative element in About card

### `SignalBars.tsx`
- Animated signal-strength bars (like phone bars)
- Shown in top status bar with `-67dBm` label

### `ChatSection.tsx`
- AI concierge chat interface
- Styled as radio comm channel with callsign "QRV-7"
- Visitor types message → POST to `/api/chat` → AI replies
- Shows typing indicator while waiting
- Saves conversation to DB for admin to review

---

## 📄 `src/app/page.tsx` — Main page

This is the big file (~600 lines). Here's what it does:

### State (line ~30)
- `lang` — current language (en/de/fa)
- `scrolled, menuOpen, toTop` — UI state
- `adminOpen, adminPwd, adminMsgs, adminChats` — admin panel state
- `tutFilter, tutPage` — tutorial filter + pagination

### Effects (line ~50)
1. Sync `<html lang dir>` when language changes
2. Listen for `#admin` hash → open admin
3. `Ctrl+Shift+A` keyboard shortcut → open admin
4. Scroll listener → navbar shadow, back-to-top button
5. Live UTC clock (updates every second)
6. IntersectionObserver → reveal animations
7. Body scroll lock when modal/menu open
8. Escape key → close modals

### Sections rendered:
1. **Status bar** — online dot, signal bars, frequency, UTC time
2. **Navbar** — brand, nav links, language switcher, hamburger
3. **Hero** — greeting, name, tagline, CTAs, socials + InteractiveTerminal + Oscilloscope
4. **About** — bio paragraphs, stats, quick-facts card + SmithChart
5. **Skills** — 4 category cards with tech tags
6. **Books** — cards with gradient covers
7. **Articles** — terminal-log-style list
8. **Tutorials** — filter buttons + grid + "load more"
9. **Chat** — AI concierge (ChatSection component)
10. **Contact** — form + social links
11. **Footer** — copyright + nav + admin link
12. **Tutorial modal** — opens on card click, embeds iframe
13. **Admin modal** — login → tabs (messages / chats)

---

## 🎨 `src/app/personal.css` — All styling

The theme is **"Hacker Terminal + RF Engineering"**:
- Colors: green (#00ff41) on black, defined in `:root`
- Fonts: JetBrains Mono (Latin), Vazirmatn (Persian)
- CRT scanline overlay (body::before)
- Green glow effects throughout
- Responsive breakpoints: 900px, 720px, 480px
- RTL support for Persian (html[dir="rtl"] selectors)

**To change colors:** edit the CSS variables at the top of the file:
```css
:root {
  --green: #00ff41;      /* main accent */
  --bg: #000000;         /* background */
  --text: #c8ffc8;       /* body text */
  ...
}
```

---

## 🔒 Anti-clone measures

1. **Invisible watermark** (page.tsx line ~290)
   - Hidden div with deployment-specific ID encoded from hostname
   - Lets you identify if someone copies your site

2. **Content separation**
   - All text/data in `content.ts` — the template logic is separate
   - Someone copying the visible HTML won't get your content structure

3. **Server-side logic**
   - AI chat, contact form, admin — all require the backend
   - A static copy won't have working chat or message storage

4. **Terminal commands**
   - The interactive terminal is complex JS — hard to replicate cleanly

---

## 🚀 How to customize (step by step)

### 1. Change your name and info
Edit `src/lib/content.ts`:
```typescript
export const PERSONAL = {
  handle: "your_real_handle",        // ← change
  fullName: {
    en: "Your Real Name",            // ← change
    de: "Ihr Echter Name",
    fa: "نام واقعی شما",
  },
  ...
}
```

### 2. Change admin password
In `content.ts`:
```typescript
adminPassword: "your_secure_password",  // ← change from "admin123"
```

### 3. Add a book
In `content.ts`, add to `BOOKS` array:
```typescript
{
  id: "b4",
  title: { en: "New Book", de: "Neues Buch", fa: "کتاب جدید" },
  year: "2025",
  publisher: { en: "Publisher", de: "Verlag", fa: "ناشر" },
  description: { en: "Description...", de: "...", fa: "..." },
  cover: "linear-gradient(135deg,#color1,#color2)",
  link: "https://...",
}
```

### 4. Add a tutorial (Aparat)
In `content.ts`, add to `TUTORIALS`:
```typescript
{
  id: "t5",
  title: { en: "New Tutorial", de: "...", fa: "..." },
  duration: "15:00",
  level: { en: "Beginner", de: "Anfänger", fa: "مقدماتی" },
  description: { en: "...", de: "...", fa: "..." },
  embedUrl: "https://www.aparat.com/video/video/embed/videohash/XXXX/vframe",
  platform: "aparat",
}
```
The `XXXX` is your video hash from the Aparat URL.

### 5. Change colors
In `src/app/personal.css`, edit `:root` variables.

### 6. Access admin panel
- URL: `yoursite.com/#admin`
- Or: press `Ctrl+Shift+A`
- Or: click `[admin]` in the footer
- Enter password (default: `admin123`)

---

## 🛠️ Common tasks

### Reset the database
```bash
cd /home/z/my-project
rm db/custom.db
bun run db:push
```

### Re-run after schema change
```bash
cd /home/z/my-project
bun run db:push   # applies schema changes to DB
# dev server auto-reloads
```

### View messages in DB directly
```bash
python3 /home/z/my-project/scripts/list_messages.py
```

---

## ❓ FAQ

**Q: Can I add more languages?**
A: Yes. In `content.ts`: add the lang code to `Lang` type, `LANGS` array, and add a `UI.xx` object with all translations.

**Q: How do I change the AI bot's personality?**
A: Edit the `buildSystemPrompt()` function in `src/app/api/chat/route.ts`.

**Q: How do I disable the matrix rain?**
A: In `page.tsx`, remove the `<MatrixRain />` line.

**Q: The tutorials don't load — why?**
A: The `embedUrl` must be the EMBED URL, not the watch URL. For Aparat, use the `/embed/` format.

**Q: How do I deploy this permanently?**
A: This runs on a dev server. For production, deploy to Vercel or similar. You'll need to set up a proper database (PostgreSQL) instead of SQLite.

---

End of walkthrough. For any changes, start with `src/lib/content.ts` — that's where 90% of your customization happens.
