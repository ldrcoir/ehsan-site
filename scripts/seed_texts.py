"""
Seed site texts — متن‌های پایه سایت.

این اسکریپت متن‌های پایه رو از src/lib/content.ts seed می‌کنه تا
پنل Text روی نصب تازه کامل پر باشه. مقادیر فقط وقتی insert می‌شن
که کلید از قبل وجود نداشته باشه — ویرایش‌های ادمین overwrite نمی‌شن.
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "db" / "custom.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# (key, valueEn, valueDe, valueFa) — values copied from src/lib/content.ts
# v1.1: کلیدهای یتیم حذف شدند (hero.name، hero.tagline، nav.*) — page.tsx از
# SiteSetting (name_*/tagline_*) و جدول NavItem می‌خواند؛ ویرایش این کلیدها
# هیچ اثری نداشت و در TextEditor گمراه‌کننده بود.
essential_texts = [
    # --- existing keys (kept as before) ---
    ("hero.greeting", "Hello", "Hallo", "سلام"),
    ("hero.cta1", "View Work", "Arbeiten", "نمونه‌کارها"),
    ("hero.cta2", "Contact", "Kontakt", "تماس"),
    # فوتر: فقط «© سال نام» — بدون خط «ساخته‌شده با ...» (درخواست صاحب سایت).
    # فاصله‌ی خالی عمدی است تا fallback کد هم نمایش داده نشود.
    ("footer.built", " ", " ", " "),
    # --- V1.1: about ---
    ("about.title", "Whoami", "Whoami", "whoami"),
    ("about.p1",
     "I'm a researcher working at the intersection of RF/Microwave engineering and AI. My work spans antenna design, electromagnetic simulation, and machine-learning applied to signals and RF systems.",
     "Ich bin Forscher an der Schnittstelle von RF/Mikrowellentechnik und KI. Meine Arbeit umfasst Antennendesign, elektromagnetische Simulation und maschinelles Lernen für Signale und RF-Systeme.",
     "پژوهشگری در مرز مهندسی RF/مایکروویو و هوش مصنوعی هستم. کار من شامل طراحی آنتن، شبیه‌سازی الکترومغناطیسی و یادگیری ماشین برای سیگنال‌ها و سیستم‌های RF است."),
    ("about.p2",
     "Beyond the lab, I write technical articles, translate between EN/DE/FA, and produce video tutorials to make complex topics approachable. Always open to collaboration on research and writing.",
     "Neben der Forschung schreibe ich technische Artikel, übersetze zwischen EN/DE/FA und erstelle Video-Tutorials, um komplexe Themen zugänglich zu machen. Immer offen für Zusammenarbeit.",
     "بیرون از آزمایشگاه، مقاله‌ی فنی می‌نویسم، بین EN/DE/FA ترجمه می‌کنم و آموزش ویدیویی می‌سازم تا مباحث پیچیده دسترس‌پذیر بشن. همیشه آماده‌ی همکاری."),
    ("about.factsTitle", "/etc/info", "/etc/info", "/etc/info"),
    # full strings: "<value> <label>"
    ("about.stat1", "5+ Years in research", "5+ Jahre Forschung", "+۵ سال پژوهش"),
    ("about.stat2", "20+ Publications", "20+ Publikationen", "+۲۰ انتشار"),
    ("about.stat3", "100+ Tutorials published", "100+ Tutorials", "+۱۰۰ آموزش"),
    ("about.stat4", "3 Languages written in", "3 Sprachen", "۳ زبان"),
    # full strings: "<key>: <value>"
    ("about.fact1", "location: Earth 🌍", "ort: Erde 🌍", "موقعیت: زمین 🌍"),
    ("about.fact2", "languages: EN · DE · FA", "sprachen: EN · DE · FA", "زبان‌ها: EN · DE · FA"),
    ("about.fact3", "focus: RF · AI · Writing", "fokus: RF · AI · Schreiben", "تمرکز: RF · AI · نوشتن"),
    # --- v1.1 (admin-editable everything): chat section chrome ---
    ("chat.title", "Chat with Me", "Chat mit mir", "گفت‌وگو با من"),
    ("chat.subtitle", "// ask anything — I or my AI will respond", "// frag alles — ich oder meine KI antwortet", "// هرچی بپرس — من یا هوش مصنوعی جواب می‌دیم"),
    ("chat.callsign", "QRV-7", "QRV-7", "QRV-7"),
    # --- v1.1 (admin-editable everything): clips section chrome ---
    ("clips.title", "Clips", "Clips", "ویدیوها"),
    ("clips.subtitle", "// educational videos", "// lehrvideos", "// ویدیوهای آموزشی"),
    ("clips.empty", "No clips yet.", "Noch keine Clips.", "هنوز ویدیویی اضافه نشده."),
    ("about.fact4", "status: available", "status: verfügbar", "وضعیت: آماده"),
    # --- V1.1: section titles/subtitles ---
    ("skills.title", "Toolbox", "Werkzeugkasten", "جعبه‌ابزار"),
    ("skills.subtitle", "// what I work with", "// womit ich arbeite", "// با چی کار می‌کنم"),
    ("books.title", "Books", "Bücher", "کتاب‌ها"),
    ("books.subtitle", "// written & translated", "// geschrieben & übersetzt", "// نوشته‌شده و ترجمه‌شده"),
    ("articles.title", "Articles & Papers", "Artikel & Papiere", "مقالات و پژوهش‌ها"),
    ("articles.subtitle", "// selected writing", "// ausgewählte Texte", "// نوشته‌های منتخب"),
    ("tutorials.title", "Tutorials", "Tutorials", "آموزش‌ها"),
    ("tutorials.subtitle", "// video lessons", "// Video-Lektionen", "// درس‌های ویدیویی"),
    # --- V1.1: contact ---
    ("contact.title", "Open Channel", "Kanal öffnen", "باز کردن کانال"),
    ("contact.subtitle", "// open a channel", "// Kanal öffnen", "// باز کردن کانال"),
    ("contact.desc",
     "Have a project, question, or just want to talk? Drop a message via the form below — I read everything and reply within a day or two. No email exposed; your message goes straight to my private inbox.",
     "Projekt, Frage oder einfach Hallo? Nachricht über das Formular — ich antworte innerhalb von 1–2 Tagen. Keine E-Mail öffentlich; Nachricht geht an meinen privaten Posteingang.",
     "پروژه، سؤال یا فقط سلام؟ از طریق فرم زیر پیام بذار — همه رو می‌خونم و ظرف ۱–۲ روز جواب می‌دم. ایمیل عمومی در سایت قرار داده نشده؛ پیام مستقیم به صندوق خصوصی من می‌رسه."),
    ("contact.socialsLabel", "channels", "kanäle", "کانال‌ها"),
    ("contact.success", "✓ message received. thank you!", "✓ Nachricht erhalten. Danke!", "✓ پیام دریافت شد. ممنون!"),
    ("contact.formName", "Name", "Name", "نام"),
    ("contact.formEmail", "Your Email (for reply)", "Deine E-Mail (für Antwort)", "ایمیل شما (برای پاسخ)"),
    ("contact.formMessage", "Message", "Nachricht", "پیام"),
    ("contact.formSubmit", "send [enter]", "senden [enter]", "ارسال [enter]"),
    ("contact.formSending", "transmitting...", "übertrage...", "در حال ارسال..."),
    # --- V1.1: chat welcome ---
    ("chat.welcome",
     ">> Patched through. I'm the site's AI concierge. What brings you here today?",
     ">> Verbindung hergestellt. Ich bin der KI-Concierge der Seite. Was führt dich her?",
     ">> اتصال برقرار شد. من دستیار هوش مصنوعی سایت هستم. چه چیزی امروز اینجا آوردت؟"),
    # --- v1.1.1 (audit P1-G5): سیستم‌پرامپت AI — خالی = پرامپت پیش‌فرض؛ هر متنی
    # که ادمین اینجا بنویسد جایگزین کامل پرامپت می‌شود (Text tab → بخش ai)
    ("ai.system_prompt", "", "", ""),
]

count = 0
# v1.0 (audit W41-45 #10): epoch-ms مثل فرمت Prisma — نه ISO TEXT
import time
now = int(time.time() * 1000)
for key, en, de, fa in essential_texts:
    cur.execute("SELECT key FROM SiteText WHERE key = ?", (key,))
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO SiteText (key, valueEn, valueDe, valueFa, updatedAt) VALUES (?, ?, ?, ?, ?)",
            (key, en, de, fa, now)
        )
        count += 1

conn.commit()
print(f"Seeded {count} text strings (out of {len(essential_texts)} — existing keys were skipped).")
print("Edit all texts from admin panel → Text tab.")

conn.close()
