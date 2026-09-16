"""
Seed site texts — متن‌های پایه سایت.

این اسکریپت فقط متن‌های ضروری رو اضافه می‌کنه (نه داده‌ی تستی).
محتوای کامل از پنل ادمین قابل ویرایش هست.
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "db" / "custom.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# فقط کلیدهای ضروری (با مقادیر خالی — از پنل ادمین پر می‌شن)
essential_texts = [
    ("hero.greeting", "Hello", "Hallo", "سلام"),
    ("hero.name", "Your Name", "Ihr Name", "نام شما"),
    ("hero.tagline", "Your tagline here", "Ihr Slogan", "شعار شما"),
    ("hero.cta1", "View Work", "Arbeiten", "نمونه‌کارها"),
    ("hero.cta2", "Contact", "Kontakt", "تماس"),
    ("nav.about", "about", "über", "درباره"),
    ("nav.skills", "skills", "fähigkeiten", "مهارت‌ها"),
    ("nav.books", "books", "bücher", "کتاب‌ها"),
    ("nav.articles", "articles", "artikel", "مقالات"),
    ("nav.tutorials", "tutorials", "tutorials", "آموزش‌ها"),
    ("nav.chat", "chat", "chat", "گفت‌وگو"),
    ("nav.contact", "contact", "kontakt", "تماس"),
    ("footer.built", "Built with Next.js", "Gebaut mit Next.js", "ساخته‌شده با Next.js"),
]

count = 0
for key, en, de, fa in essential_texts:
    cur.execute("SELECT key FROM SiteText WHERE key = ?", (key,))
    if not cur.fetchone():
        cur.execute(
            "INSERT INTO SiteText (key, valueEn, valueDe, valueFa) VALUES (?, ?, ?, ?)",
            (key, en, de, fa)
        )
        count += 1

conn.commit()
print(f"Seeded {count} essential text strings (out of {len(essential_texts)}).")
print("Edit all texts from admin panel → Text tab.")

conn.close()
