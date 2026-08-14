"""
Generate a comprehensive Word tutorial document for the personal site.
Explains how to customize every section, manage content, use admin panel, set up Bale.
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
import os

OUTPUT = "/home/z/my-project/download/SITE_TUTORIAL.docx"

doc = Document()

# ---- Page setup ----
for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)

# ---- Styles ----
style_normal = doc.styles["Normal"]
style_normal.font.name = "Calibri"
style_normal.font.size = Pt(11)
style_normal.paragraph_format.line_spacing = 1.4
style_normal.paragraph_format.space_after = Pt(6)

# Heading colors
for i, size in [(1, 20), (2, 16), (3, 13)]:
    style = doc.styles[f"Heading {i}"]
    style.font.name = "Calibri"
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)

# ---- Helper functions ----
def add_code_block(text):
    """Add a monospace code block with gray background."""
    from docx.oxml import OxmlElement
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Cm(0.5)
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x00, 0x80, 0x00)
    # Gray shading
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F0F0F0")
    shd.set(qn("w:val"), "clear")
    p._p.get_or_add_pPr().append(shd)
    return p

def add_note(text):
    """Add a note paragraph with yellow-ish background."""
    p = doc.add_paragraph()
    run = p.add_run("⚠ Note: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0xCC, 0x66, 0x00)
    run2 = p.add_run(text)
    run2.font.color.rgb = RGBColor(0x66, 0x44, 0x00)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    return p

def add_tip(text):
    p = doc.add_paragraph()
    run = p.add_run("💡 Tip: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
    p.add_run(text)
    return p

# ============================================================================
# COVER
# ============================================================================
for _ in range(6):
    doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Personal Site")
run.font.size = Pt(36)
run.font.bold = True
run.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Complete Customization Tutorial")
run.font.size = Pt(18)
run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("RF/Microwave Researcher · AI/ML Programmer · Writer & Translator")
run.font.size = Pt(12)
run.font.italic = True
run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("Version 4.0 — Multi-theme · Signal Lab · Bale Integration")
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)

doc.add_page_break()

# ============================================================================
# TABLE OF CONTENTS
# ============================================================================
doc.add_heading("Table of Contents", level=1)

toc_items = [
    "1. Introduction & Architecture",
    "2. Getting Started — Where Everything Lives",
    "3. Customizing Your Personal Info",
    "4. Adding Social Links",
    "5. Editing Skills",
    "6. Adding Books",
    "7. Adding Articles",
    "8. Adding Tutorials (Aparat/YouTube)",
    "9. Managing RF Lab Equipment List",
    "10. Three Themes (Terminal / Midnight / Clean)",
    "11. The Interactive Terminal — Commands",
    "12. Signal Lab — Generator + Oscilloscope",
    "13. AI Chat Concierge",
    "14. Contact Form & Anti-Spam",
    "15. Admin Panel — Messages, Chats, Settings",
    "16. Bale Messenger Integration",
    "17. API Kill Switch",
    "18. Anti-Theft Protection",
    "19. Changing Colors & Fonts",
    "20. Deploying to Production",
    "21. Backup Messenger Strategy",
    "22. FAQ",
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.left_indent = Cm(1)

doc.add_page_break()

# ============================================================================
# 1. INTRODUCTION
# ============================================================================
doc.add_heading("1. Introduction & Architecture", level=1)

doc.add_paragraph(
    "This tutorial explains how to customize every aspect of your personal portfolio website. "
    "The site is built with Next.js 16, TypeScript, Prisma (SQLite), and the z-ai-web-dev-sdk for AI chat. "
    "It features a unique RF/electronic engineering theme with multiple visual modes, "
    "an interactive terminal, a signal generator + oscilloscope lab, and a full admin panel."
)

doc.add_heading("What makes this site special:", level=3)
doc.add_paragraph("Three switchable themes (Terminal hacker, Midnight blue, Clean professional)", style="List Bullet")
doc.add_paragraph("Interactive terminal where visitors type commands", style="List Bullet")
doc.add_paragraph("Signal Generator wirelessly connected to Oscilloscope — change waveform, see it live", style="List Bullet")
doc.add_paragraph("AI chat concierge that talks to visitors in their language", style="List Bullet")
doc.add_paragraph("Admin panel accessible from browser or Bale messenger", style="List Bullet")
doc.add_paragraph("Anti-theft protection (right-click disable, devtools detection)", style="List Bullet")
doc.add_paragraph("Three languages: English, German, Persian (with RTL and Shamsi calendar)", style="List Bullet")
doc.add_paragraph("All content in one file — no coding needed to update text", style="List Bullet")

# ============================================================================
# 2. GETTING STARTED
# ============================================================================
doc.add_heading("2. Getting Started — Where Everything Lives", level=1)

doc.add_paragraph(
    "The most important thing to know: ALL your content lives in ONE file. "
    "You rarely need to touch any other file."
)

doc.add_heading("The one file you need to edit:", level=3)
add_code_block("src/lib/content.ts")

doc.add_paragraph(
    "This file contains: your name, tagline, social links, skills, books, articles, "
    "tutorials, lab equipment, and all interface text in 3 languages. "
    "Open this file in any text editor and change the values."
)

doc.add_heading("Other important files (usually don't touch):", level=3)
doc.add_paragraph("src/app/page.tsx — Main page layout (all sections)", style="List Bullet")
doc.add_paragraph("src/app/personal.css — All visual styling (colors, fonts, layout)", style="List Bullet")
doc.add_paragraph("src/app/api/chat/route.ts — AI chat backend (bot personality)", style="List Bullet")
doc.add_paragraph("src/app/api/contact/route.ts — Contact form backend", style="List Bullet")
doc.add_paragraph("src/lib/bale.ts — Bale messenger integration", style="List Bullet")
doc.add_paragraph("prisma/schema.prisma — Database models", style="List Bullet")

# ============================================================================
# 3. PERSONAL INFO
# ============================================================================
doc.add_heading("3. Customizing Your Personal Info", level=1)

doc.add_paragraph("Open src/lib/content.ts and find the PERSONAL section near the top:")

add_code_block("""export const PERSONAL = {
  handle: "your_handle",          // Short username shown in navbar
  fullName: {
    en: "Your Name",              // English name
    de: "Ihr Name",               // German name
    fa: "اسم شما",                 // Persian name
  },
  tagline: {
    en: "RF/Microwave Researcher · AI/ML Programmer · Writer & Translator",
    de: "RF/Mikrowellen-Forscher · AI/ML-Programmierer · Autor & Übersetzer",
    fa: "پژوهشگر RF/مایکروویو · برنامه‌نویس AI/ML · نویسنده و مترجم",
  },
  adminPassword: "admin123",      // CHANGE THIS!
};""")

add_note("Change adminPassword from 'admin123' to something strong. This protects your admin panel.")

add_tip("The 'handle' is your short username shown in the navbar and footer. Use lowercase, no spaces.")

# ============================================================================
# 4. SOCIAL LINKS
# ============================================================================
doc.add_heading("4. Adding Social Links", level=1)

doc.add_paragraph("Find the SOCIALS array in content.ts. Add or remove links:")

add_code_block("""export const SOCIALS = [
  { id: "github", label: "GitHub", url: "https://github.com/", handle: "your_username" },
  { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/", handle: "your_username" },
  { id: "devto", label: "dev.to", url: "https://dev.to/", handle: "your_username" },
  { id: "medium", label: "Medium", url: "https://medium.com/@", handle: "your_username" },
];""")

doc.add_paragraph("To add a new link, copy a line and change the values:")
add_code_block('{ id: "youtube", label: "YouTube", url: "https://youtube.com/@", handle: "your_channel" },')

# ============================================================================
# 5. SKILLS
# ============================================================================
doc.add_heading("5. Editing Skills", level=1)

doc.add_paragraph("Find the SKILLS array. Each category has a name (in 3 languages) and a list of tags:")

add_code_block("""export const SKILLS = [
  {
    category: { en: "RF & Microwave", de: "RF & Mikrowelle", fa: "RF و مایکروویو" },
    items: ["Antenna Design", "EM Simulation", "S-Parameters", "Matching Networks"],
  },
  {
    category: { en: "AI / ML", de: "KI / ML", fa: "هوش مصنوعی / یادگیری ماشین" },
    items: ["Python", "PyTorch", "TensorFlow", "Deep Learning"],
  },
  // Add more categories...
];""")

add_tip("Tags are shown as small chips. Keep them short (1-2 words).")

# ============================================================================
# 6. BOOKS
# ============================================================================
doc.add_heading("6. Adding Books", level=1)

doc.add_paragraph("Find the BOOKS array. Each book has a title, year, publisher, description, and cover:")

add_code_block("""export const BOOKS = [
  {
    id: "b1",
    title: { en: "Book Title", de: "Buchtitel", fa: "عنوان کتاب" },
    year: "2024",
    publisher: { en: "Publisher", de: "Verlag", fa: "ناشر" },
    description: {
      en: "Description in English...",
      de: "Beschreibung auf Deutsch...",
      fa: "توضیح به فارسی...",
    },
    cover: "linear-gradient(135deg,#003b00,#00ff41)",  // CSS gradient
    link: "https://amazon.com/...",  // Link to buy/read
  },
];""")

add_tip("The 'cover' field is a CSS gradient. Use https://cssgradient.io to generate nice ones.")

# ============================================================================
# 7. ARTICLES
# ============================================================================
doc.add_heading("7. Adding Articles", level=1)

doc.add_paragraph("Find the ARTICLES array. Each article has title, venue, date, type, summary, and link:")

add_code_block("""export const ARTICLES = [
  {
    id: "a1",
    title: { en: "Article Title", de: "Artikeltitel", fa: "عنوان مقاله" },
    venue: { en: "Journal Name", de: "Zeitschrift", fa: "نام مجله" },
    date: "2024-09",  // YYYY-MM format
    type: { en: "Research Paper", de: "Forschungspapier", fa: "مقاله پژوهشی" },
    summary: {
      en: "Short summary...",
      de: "Kurze Zusammenfassung...",
      fa: "خلاصه کوتاه...",
    },
    link: "https://doi.org/...",
  },
];""")

# ============================================================================
# 8. TUTORIALS
# ============================================================================
doc.add_heading("8. Adding Tutorials (Aparat/YouTube)", level=1)

doc.add_paragraph("Find the TUTORIALS array. The embedUrl must be the EMBED URL, not the watch URL:")

add_code_block("""export const TUTORIALS = [
  {
    id: "t1",
    title: { en: "Tutorial Title", de: "Tutorial Titel", fa: "عنوان آموزش" },
    duration: "12:34",  // mm:ss
    level: { en: "Beginner", de: "Anfänger", fa: "مقدماتی" },
    description: {
      en: "What you'll learn...",
      de: "Was du lernst...",
      fa: "چه یاد می‌گیری...",
    },
    embedUrl: "https://www.aparat.com/video/video/embed/videohash/XXXX/vframe",
    platform: "aparat",
  },
];""")

doc.add_heading("How to get the Aparat embed URL:", level=3)
doc.add_paragraph("1. Open your video on Aparat", style="List Number")
doc.add_paragraph("2. Click 'اشتراک گذاری' (Share) below the video", style="List Number")
doc.add_paragraph("3. Copy the 'embed' URL — it looks like:", style="List Number")
add_code_block("https://www.aparat.com/video/video/embed/videohash/ABC123/vframe")
doc.add_paragraph("4. Replace ABC123 with your video's hash", style="List Number")

doc.add_heading("For YouTube:", level=3)
add_code_block("https://www.youtube.com/embed/VIDEO_ID")

add_note("Tutorials show 6 at a time with a 'load more' button. You can add as many as you want.")

# ============================================================================
# 9. RF EQUIPMENT
# ============================================================================
doc.add_heading("9. Managing RF Lab Equipment List", level=1)

doc.add_paragraph("Find the RF_EQUIPMENT array. This shows your lab equipment with LED status indicators:")

add_code_block("""export const RF_EQUIPMENT = [
  { id: "vna", name: "Vector Network Analyzer", model: "Keysight PNA-X", status: "online" },
  { id: "sa", name: "Spectrum Analyzer", model: "R&S FSW", status: "online" },
  { id: "osc", name: "Oscilloscope", model: "Tektronix MSO64", status: "standby" },
];""")

doc.add_paragraph("Status options: 'online' (green LED), 'standby' (amber LED), 'offline' (gray LED)")

# ============================================================================
# 10. THEMES
# ============================================================================
doc.add_heading("10. Three Themes (Terminal / Midnight / Clean)", level=1)

doc.add_paragraph(
    "The site has 3 themes that visitors can switch with the colored dots in the navbar. "
    "The choice is saved in localStorage, so it persists across visits."
)

doc.add_heading("Theme 1: Terminal (default)", level=3)
doc.add_paragraph("Green on black, monospace font, CRT scanlines, Matrix rain background.")
doc.add_paragraph("Best for: Tech-savvy visitors, developer audiences, the 'hacker' aesthetic.")

doc.add_heading("Theme 2: Midnight", level=3)
doc.add_paragraph("Blue on dark navy, softer than pure black. No scanlines.")
doc.add_paragraph("Best for: Visitors who like dark mode but find pure black too harsh.")

doc.add_heading("Theme 3: Clean", level=3)
doc.add_paragraph("Light background, blue accents, sans-serif font (Inter). Professional and elegant.")
doc.add_paragraph("Best for: Recruiters, academics, non-technical visitors, daytime reading.")

add_tip("You can change the default theme by editing page.tsx and changing the initial state: useState<'terminal' | 'clean' | 'midnight'>('clean')")

# ============================================================================
# 11. TERMINAL COMMANDS
# ============================================================================
doc.add_heading("11. The Interactive Terminal — Commands", level=1)

doc.add_paragraph("Visitors can type these commands in the hero terminal:")

commands = [
    ("help", "Show all available commands"),
    ("about / whoami", "Short bio"),
    ("skills", "List all skills"),
    ("books", "List published books"),
    ("articles", "List articles & papers"),
    ("tutorials", "List video tutorials"),
    ("contact", "Show contact info"),
    ("social", "Show social links"),
    ("date", "Current UTC time"),
    ("scan", "Simulated RF spectrum scan"),
    ("chat", "Scroll to AI chat section"),
    ("clear / cls", "Clear terminal"),
    ("ls", "List sections"),
    ("pwd", "Show current directory"),
    ("matrix", "Easter egg: Matrix movie quote"),
    ("coffee", "Easter egg: coffee message"),
    ("42", "Easter egg: Answer to everything"),
    ("hello / hi / hey", "Friendly greeting"),
    ("visitor", "Show visitor number"),
    ("hack", "Easter egg: hacking joke"),
    ("admin", "Open admin panel (hidden from help)"),
]

for cmd, desc in commands:
    p = doc.add_paragraph()
    run = p.add_run(f"  {cmd}")
    run.font.name = "Consolas"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x00, 0x66, 0x00)
    p.add_run(f"  — {desc}")
    p.paragraph_format.left_indent = Cm(1)

# ============================================================================
# 12. SIGNAL LAB
# ============================================================================
doc.add_heading("12. Signal Lab — Generator + Oscilloscope", level=1)

doc.add_paragraph(
    "The About section contains a Signal Lab with two wirelessly connected devices:"
)

doc.add_heading("Signal Generator (Keysight 33600A):", level=3)
doc.add_paragraph("Waveform selector: sine / square / triangle / sawtooth", style="List Bullet")
doc.add_paragraph("Frequency slider: 0.5 – 10 Hz", style="List Bullet")
doc.add_paragraph("Amplitude slider: 10% – 100%", style="List Bullet")

doc.add_heading("Oscilloscope (Tektronix MSO64):", level=3)
doc.add_paragraph("Displays the generated signal in real-time", style="List Bullet")
doc.add_paragraph("Grid with voltage/time divisions", style="List Bullet")
doc.add_paragraph("Sweep cursor animation", style="List Bullet")

doc.add_paragraph(
    "When you change any control on the generator, the oscilloscope instantly updates. "
    "They are 'wirelessly connected' — there's a signal waves animation between them."
)

add_tip("This is pure JavaScript canvas animation — no real RF signals. It's a visual showcase of your RF expertise.")

# ============================================================================
# 13. AI CHAT
# ============================================================================
doc.add_heading("13. AI Chat Concierge", level=1)

doc.add_paragraph(
    "The chat section has an AI bot with callsign 'QRV-7' that talks to visitors. "
    "It uses the z-ai-web-dev-sdk LLM with a custom system prompt."
)

doc.add_heading("Bot personality:", level=3)
doc.add_paragraph("Friendly, curious, slightly nerdy", style="List Bullet")
doc.add_paragraph("Asks visitors for their opinions", style="List Bullet")
doc.add_paragraph("Recommends relevant content from the site", style="List Bullet")
doc.add_paragraph("Responds in the visitor's language (EN/DE/FA)", style="List Bullet")
doc.add_paragraph("Never claims to BE you — it's the site's AI assistant", style="List Bullet")

doc.add_heading("To change the bot's personality:", level=3)
doc.add_paragraph("Edit the buildSystemPrompt() function in:")
add_code_block("src/app/api/chat/route.ts")

# ============================================================================
# 14. CONTACT FORM
# ============================================================================
doc.add_heading("14. Contact Form & Anti-Spam", level=1)

doc.add_paragraph(
    "The contact form does NOT show your email publicly. Instead, visitors fill out the form "
    "and messages are stored in the database. You see them in the admin panel."
)

doc.add_heading("Anti-spam features:", level=3)
doc.add_paragraph("Rate limit: 3 messages per 10 minutes per IP", style="List Bullet")
doc.add_paragraph("Bot detection via User-Agent", style="List Bullet")
doc.add_paragraph("Spam pattern matching (viagra, casino, multiple URLs, etc.)", style="List Bullet")
doc.add_paragraph("Message must be at least 10 characters", style="List Bullet")

# ============================================================================
# 15. ADMIN PANEL
# ============================================================================
doc.add_heading("15. Admin Panel — Messages, Chats, Settings", level=1)

doc.add_heading("How to access:", level=3)
doc.add_paragraph("URL: yoursite.com/#admin", style="List Bullet")
doc.add_paragraph("Keyboard: Ctrl + Shift + A", style="List Bullet")
doc.add_paragraph("Terminal: type 'admin' (hidden from help)", style="List Bullet")
doc.add_paragraph("Footer: click [admin] link", style="List Bullet")

doc.add_heading("Three tabs:", level=3)

doc.add_paragraph("1. Contact Messages — all messages from the contact form", style="List Number")
doc.add_paragraph("Search by name, email, or message content", style="List Bullet")
doc.add_paragraph("Export to CSV file", style="List Bullet")
doc.add_paragraph("Reply to each message (saved in database)", style="List Bullet")

doc.add_paragraph("2. AI Chat Logs — all conversations between visitors and the AI", style="List Number")
doc.add_paragraph("See full conversation history per session", style="List Bullet")
doc.add_paragraph("Inject your own reply as the AI (visitor sees it next time)", style="List Bullet")

doc.add_paragraph("3. Settings — site configuration", style="List Number")
doc.add_paragraph("API Kill Switch — disable AI chat instantly", style="List Bullet")
doc.add_paragraph("Edit display name, tagline, status (overrides content.ts)", style="List Bullet")
doc.add_paragraph("Bale messenger configuration", style="List Bullet")

# ============================================================================
# 16. BALE
# ============================================================================
doc.add_heading("16. Bale Messenger Integration", level=1)

doc.add_paragraph(
    "You can receive notifications and reply to messages directly from Bale messenger on your phone."
)

doc.add_heading("Setup steps:", level=3)
doc.add_paragraph("1. Create a bot in Bale: message @botfather, send /newbot", style="List Number")
doc.add_paragraph("2. Save the bot token (looks like: 123456789:ABCdef...)", style="List Number")
doc.add_paragraph("3. Send a message to your bot, then visit to get your chat ID:", style="List Number")
add_code_block("https://api.bale.ai/v1/botsYOUR_TOKEN/getUpdates")
doc.add_paragraph("4. In the admin panel → settings tab, enter bot token and chat ID", style="List Number")
doc.add_paragraph("5. Enable Bale notifications toggle", style="List Number")
doc.add_paragraph("6. Set up webhook so you can reply from Bale:", style="List Number")
add_code_block("https://api.bale.ai/v1/botsYOUR_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/bale/webhook")

doc.add_heading("Bale bot commands:", level=3)
bale_commands = [
    ("/help", "Show all commands"),
    ("/list", "Show 5 recent contact messages"),
    ("/reply {id} {text}", "Reply to a contact message"),
    ("/chat {sessionId} {text}", "Inject reply into AI chat"),
    ("/disable", "Disable AI chat API"),
    ("/enable", "Enable AI chat API"),
    ("/stats", "Show site statistics"),
]
for cmd, desc in bale_commands:
    p = doc.add_paragraph()
    run = p.add_run(f"  {cmd}")
    run.font.name = "Consolas"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x00, 0x66, 0x00)
    p.add_run(f"  — {desc}")

# ============================================================================
# 17. KILL SWITCH
# ============================================================================
doc.add_heading("17. API Kill Switch", level=1)

doc.add_paragraph(
    "If the AI chat is getting too many requests or you want to temporarily disable it:"
)

doc.add_heading("Method 1: Admin panel", level=3)
doc.add_paragraph("Go to #admin → settings → toggle 'AI Chat API' off/on")

doc.add_heading("Method 2: Bale command", level=3)
doc.add_paragraph("Send /disable to your Bale bot. Send /enable to re-enable.")

doc.add_paragraph("When disabled, the chat API returns HTTP 503 with a 'temporarily disabled' message.")

# ============================================================================
# 18. ANTI-THEFT
# ============================================================================
doc.add_heading("18. Anti-Theft Protection", level=1)

doc.add_paragraph("The site includes several measures to discourage template theft:")

doc.add_paragraph("Right-click context menu is disabled", style="List Bullet")
doc.add_paragraph("F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S are blocked", style="List Bullet")
doc.add_paragraph("DevTools detection — shows a warning overlay if developer tools are open", style="List Bullet")
doc.add_paragraph("Invisible watermark with deployment identifier", style="List Bullet")
doc.add_paragraph("All content separated from template logic (content.ts)", style="List Bullet")
doc.add_paragraph("Server-side features (AI chat, admin) don't work on a static copy", style="List Bullet")

add_note("No anti-theft measure is 100% foolproof. These raise the bar but a determined thief can still bypass them. The watermark helps you identify stolen copies.")

# ============================================================================
# 19. COLORS & FONTS
# ============================================================================
doc.add_heading("19. Changing Colors & Fonts", level=1)

doc.add_paragraph("All colors are defined as CSS variables in personal.css. Find the :root block:")

add_code_block(""":root {
  --bg: #000000;           /* Page background */
  --green: #00ff41;        /* Primary accent color */
  --green-bright: #39ff14; /* Bright accent for headings */
  --text: #c8ffc8;         /* Body text color */
  --text-dim: #4a7a4a;     /* Dimmed text */
  --border: #1a3a1a;       /* Border color */
  /* ... etc */
}""")

doc.add_paragraph("Each theme has its own color block:")
doc.add_paragraph("html[data-theme='terminal'] — green on black", style="List Bullet")
doc.add_paragraph("html[data-theme='midnight'] — blue on dark navy", style="List Bullet")
doc.add_paragraph("html[data-theme='clean'] — blue on white", style="List Bullet")

# ============================================================================
# 20. DEPLOYMENT
# ============================================================================
doc.add_heading("20. Deploying to Production", level=1)

doc.add_paragraph("This site runs on a Next.js dev server. For production deployment:")

doc.add_paragraph("1. Choose a hosting platform (Vercel, Netlify, Railway, etc.)", style="List Number")
doc.add_paragraph("2. Set environment variables:", style="List Number")
add_code_block("DATABASE_URL=your_production_database_url\nZAI_API_KEY=your_api_key\nBALE_BOT_TOKEN=your_bale_token")
doc.add_paragraph("3. For the database, switch from SQLite to PostgreSQL:", style="List Number")
doc.add_paragraph("Edit prisma/schema.prisma: change provider from 'sqlite' to 'postgresql'", style="List Bullet")
doc.add_paragraph("Run: bun run db:push", style="List Bullet")
doc.add_paragraph("4. Build and deploy:", style="List Number")
add_code_block("bun run build\n# Deploy the .next folder to your hosting platform")

# ============================================================================
# 21. BACKUP MESSENGER
# ============================================================================
doc.add_heading("21. Backup Messenger Strategy", level=1)

doc.add_paragraph(
    "In case Bale goes down or is unavailable, you should have a backup plan. "
    "Here's the recommendation:"
)

doc.add_heading("Phase 1 (Now): Bale as primary", level=3)
doc.add_paragraph("Bale is already integrated and working. Use it as your primary notification channel.")

doc.add_heading("Phase 2 (When Bale is down): Telegram as fallback", level=3)
doc.add_paragraph(
    "Telegram has a very similar Bot API to Bale. To add Telegram support:"
)
doc.add_paragraph("1. Create a Telegram bot via @BotFather", style="List Number")
doc.add_paragraph("2. Copy src/lib/bale.ts to src/lib/telegram.ts", style="List Number")
doc.add_paragraph("3. Change the API base URL from api.bale.ai to api.telegram.org", style="List Number")
doc.add_paragraph("4. Add a new API route: src/app/api/telegram/webhook/route.ts", style="List Number")
doc.add_paragraph("5. Add Telegram settings to the admin panel (similar to Bale)", style="List Number")

doc.add_heading("Phase 3 (Future): Email as ultimate fallback", level=3)
doc.add_paragraph(
    "For guaranteed delivery, set up email notifications using a service like Resend, SendGrid, or Amazon SES. "
    "This ensures you never miss a message even if all messengers are down."
)

add_tip("Don't start with Telegram/email now. Bale is working. Add backups only when you actually need them — premature optimization wastes time.")

# ============================================================================
# 22. FAQ
# ============================================================================
doc.add_heading("22. FAQ", level=1)

faqs = [
    ("How do I change the site title in the browser tab?",
     "Edit src/app/layout.tsx → metadata.title field."),
    ("How do I add a new section to the site?",
     "Edit src/app/page.tsx. Copy an existing section (like Books) and modify it. Add the nav link in the navbar."),
    ("How do I change the AI bot's responses?",
     "Edit buildSystemPrompt() in src/app/api/chat/route.ts. This controls the bot's personality and instructions."),
    ("Where are messages stored?",
     "In a SQLite database at db/custom.db. Use the admin panel to view them, or sqlite3 command line."),
    ("How do I reset the database?",
     "Run: rm db/custom.db && bun run db:push"),
    ("Can I add more languages?",
     "Yes. In content.ts: add the language code to the Lang type, LANGS array, and add a UI.xx object with all translations."),
    ("How do I disable the Matrix rain background?",
     "In page.tsx, remove the <MatrixRain /> line."),
    ("The tutorials don't load — why?",
     "The embedUrl must be the EMBED URL, not the watch URL. For Aparat, use the /embed/ format."),
]

for q, a in faqs:
    p = doc.add_paragraph()
    run = p.add_run("Q: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
    p.add_run(q)
    p.paragraph_format.space_before = Pt(10)
    
    p2 = doc.add_paragraph()
    run = p2.add_run("A: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x80, 0x00)
    p2.add_run(a)
    p2.paragraph_format.left_indent = Cm(0.5)

# ============================================================================
# SAVE
# ============================================================================
doc.save(OUTPUT)
print(f"✓ Tutorial saved to: {OUTPUT}")
print(f"  Size: {os.path.getsize(OUTPUT)} bytes")
