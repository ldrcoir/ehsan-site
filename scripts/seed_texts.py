"""Seed all site text strings to DB."""
import sqlite3
from pathlib import Path

DB = Path("/home/z/my-project/db/custom.db")
conn = sqlite3.connect(DB)
cur = conn.cursor()

texts = [
    # Hero
    ("hero.greeting", "Hello, world.", "سلام، دنیا.", "Hallo, Welt."),
    ("hero.cta1", "View my work", "نمونه‌کارها", "Arbeiten ansehen"),
    ("hero.cta2", "Get in touch", "تماس بگیر", "Kontakt"),

    # About
    ("about.title", "Whoami", "whoami", "Whoami"),
    ("about.p1", "I'm a researcher working at the intersection of RF/Microwave engineering and AI. My work spans antenna design, electromagnetic simulation, and machine-learning applied to signals and RF systems.",
     "من پژوهشگری هستم که در مرز مهندسی RF/مایکروویو و هوش مصنوعی کار می‌کنم. کار من شامل طراحی آنتن، شبیه‌سازی الکترومغناطیسی و یادگیری ماشین برای سیگنال‌ها و سیستم‌های RF است.",
     "Ich bin Forscher an der Schnittstelle von RF/Mikrowellentechnik und KI."),
    ("about.p2", "Beyond the lab, I write technical articles, translate between EN/DE/FA, and produce video tutorials. Always open to collaboration.",
     "بیرون از آزمایشگاه، مقاله‌ی فنی می‌نویسم، ترجمه می‌کنم و آموزش ویدیویی می‌سازم. همیشه آماده‌ی همکاری.",
     "Neben der Forschung schreibe ich Artikel und erstelle Video-Tutorials."),
    ("about.factsTitle", "/etc/info", "/etc/info", "/etc/info"),
    ("about.stat1", "Years in research", "سال پژوهش", "Jahre Forschung"),
    ("about.stat2", "Publications", "انتشار", "Publikationen"),
    ("about.stat3", "Tutorials published", "آموزش", "Tutorials"),
    ("about.stat4", "Languages written in", "زبان", "Sprachen"),

    # Skills
    ("skills.title", "Toolbox", "جعبه‌ابزار", "Werkzeugkasten"),
    ("skills.subtitle", "// what I work with", "// با چی کار می‌کنم", "// womit ich arbeite"),

    # Books
    ("books.title", "Books", "کتاب‌ها", "Bücher"),
    ("books.subtitle", "// written & translated", "// نوشته‌شده و ترجمه‌شده", "// geschrieben & übersetzt"),
    ("books.view", "open", "باز کردن", "öffnen"),

    # Articles
    ("articles.title", "Articles & Papers", "مقالات و پژوهش‌ها", "Artikel & Papiere"),
    ("articles.subtitle", "// selected writing", "// نوشته‌های منتخب", "// ausgewählte Texte"),
    ("articles.read", "read", "خواندن", "lesen"),

    # Tutorials
    ("tutorials.title", "Tutorials", "آموزش‌ها", "Tutorials"),
    ("tutorials.subtitle", "// video lessons", "// درس‌های ویدیویی", "// Video-Lektionen"),
    ("tutorials.watch", "watch", "تماشا", "ansehen"),

    # Chat
    ("chat.title", "Chat with Me", "گفت‌وگو با من", "Chat mit mir"),
    ("chat.subtitle", "// ask anything", "// هرچی بپرس", "// frag alles"),

    # Contact
    ("contact.title", "Open Channel", "باز کردن کانال", "Kanal öffnen"),
    ("contact.subtitle", "// open a channel", "// باز کردن کانال", "// Kanal öffnen"),
    ("contact.desc", "Have a project, question, or just want to talk? Drop a message.",
     "پروژه، سؤال یا فقط سلام؟ از طریق فرم زیر پیام بذار.",
     "Projekt, Frage oder einfach Hallo?"),
    ("contact.name", "Name", "نام", "Name"),
    ("contact.email", "Your Email (for reply)", "ایمیل شما (برای پاسخ)", "Deine E-Mail"),
    ("contact.message", "Message", "پیام", "Nachricht"),
    ("contact.submit", "send", "ارسال", "senden"),
    ("contact.success", "Message received. Thank you!", "پیام دریافت شد. ممنون!", "Nachricht erhalten. Danke!"),

    # Footer
    ("footer.built", "Built with care.", "ساخته‌شده با عشق.", "Mit Sorgfalt erstellt."),

    # Status bar
    ("status.online", "online", "آنلاین", "online"),
    ("status.time", "time", "زمان", "Zeit"),

    # Equipment rack
    ("equipment.title", "// lab equipment rack", "// رک تجهیزات آزمایشگاه", "// Laborausstattung"),
]

for key, en, fa, de in texts:
    cur.execute("""
        INSERT OR REPLACE INTO SiteText (key, valueEn, valueFa, valueDe, updatedAt)
        VALUES (?, ?, ?, ?, datetime('now'))
    """, (key, en, fa, de))

conn.commit()
conn.close()
print(f"Seeded {len(texts)} text strings")
