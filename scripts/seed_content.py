"""Seed content models with default data."""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent.parent / "db" / "custom.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

# --- Books ---
books = [
    ("b1", "Book Title One", "Buchtitel Eins", "عنوان کتاب اول", "2024",
     "Publisher Name", "Verlag", "ناشر",
     "A short description.", "Kurze Beschreibung.", "توضیح کوتاه."),
    ("b2", "Book Title Two", "Buchtitel Zwei", "عنوان کتاب دوم", "2023",
     "Another Publisher", "Anderer Verlag", "ناشر دیگر",
     "Second book desc.", "Zweites Buch.", "توضیح کتاب دوم."),
    ("b3", "Book Title Three", "Buchtitel Drei", "عنوان کتاب سوم", "2022",
     "Third Publisher", "Dritter Verlag", "ناشر سوم",
     "Third book desc.", "Drittes Buch.", "توضیح کتاب سوم."),
]
for b in books:
    cur.execute("""INSERT OR REPLACE INTO Book (id,titleEn,titleDe,titleFa,year,publisherEn,publisherDe,publisherFa,descEn,descDe,descFa,cover,link,"order",visible,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,datetime('now'),datetime('now'))""",
        (b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7],b[8],b[9],b[10],"linear-gradient(135deg,#003b00,#00ff41)","#",books.index(b)))

# --- Articles ---
articles = [
    ("a1", "Article One", "Artikel Eins", "مقاله اول", "Journal", "Zeitschrift", "نام مجله", "2024-09", "Research Paper", "Forschungspapier", "مقاله پژوهشی", "Summary 1.", "Zusammenfassung 1.", "خلاصه ۱."),
    ("a2", "Article Two", "Artikel Zwei", "مقاله دوم", "Blog", "Blog", "وبلاگ", "2024-04", "Tutorial", "Tutorial", "آموزش", "Summary 2.", "Zusammenfassung 2.", "خلاصه ۲."),
    ("a3", "Article Three", "Artikel Drei", "مقاله سوم", "Conference", "Konferenz", "کنفرانس", "2023-11", "Paper", "Papier", "مقاله", "Summary 3.", "Zusammenfassung 3.", "خلاصه ۳."),
]
for a in articles:
    cur.execute("""INSERT OR REPLACE INTO Article (id,titleEn,titleDe,titleFa,venueEn,venueDe,venueFa,date,typeEn,typeDe,typeFa,summaryEn,summaryDe,summaryFa,link,"order",visible,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,datetime('now'),datetime('now'))""",
        (a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[7],a[8],a[9],a[10],a[11],a[12],a[13],"#",articles.index(a)))

# --- Tutorials ---
tutorials = [
    ("t1", "Python Tutorial 1", "Tutorial 1", "آموزش پایتون ۱", "10:00", "Beginner", "Anfänger", "مقدماتی", "Learn Python basics", "Python Grundlagen", "مبانی پایتون", "https://www.aparat.com/video/video/embed/videohash/example1/vframe"),
    ("t2", "Python Tutorial 2", "Tutorial 2", "آموزش پایتون ۲", "20:00", "Intermediate", "Fortgeschritten", "متوسط", "Advanced Python", "Fortgeschrittenes Python", "پایتون پیشرفته", "https://www.aparat.com/video/video/embed/videohash/example2/vframe"),
    ("t3", "Python Tutorial 3", "Tutorial 3", "آموزش پایتون ۳", "30:00", "Advanced", "Fortgeschritten", "پیشرفته", "Expert Python", "Experte Python", "پایتون خبره", "https://www.aparat.com/video/video/embed/videohash/example3/vframe"),
    ("t4", "Python Tutorial 4", "Tutorial 4", "آموزش پایتون ۴", "15:00", "Beginner", "Anfänger", "مقدماتی", "Python data structures", "Datenstrukturen", "ساختار داده", "https://www.aparat.com/video/video/embed/videohash/example4/vframe"),
]
for t in tutorials:
    cur.execute("""INSERT OR REPLACE INTO Tutorial (id,titleEn,titleDe,titleFa,duration,levelEn,levelDe,levelFa,descEn,descDe,descFa,embedUrl,platform,playlist,"order",visible,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,1,datetime('now'),datetime('now'))""",
        (t[0],t[1],t[2],t[3],t[4],t[5],t[6],t[7],t[8],t[9],t[10],t[11],"aparat",tutorials.index(t)))

# --- Skills ---
skills = [
    ("s1", "RF & Microwave", "RF & Mikrowelle", "RF و مایکروویو", "Antenna Design, EM Simulation, S-Parameters, Matching Networks"),
    ("s2", "AI / ML", "KI / ML", "هوش مصنوعی", "Python, PyTorch, TensorFlow, Deep Learning"),
    ("s3", "Programming", "Programmierung", "برنامه‌نویسی", "Python, MATLAB, C/C++, JavaScript, Bash"),
    ("s4", "Writing", "Schreiben", "نویسندگی", "Technical Writing, EN ↔ DE ↔ FA, Editing"),
]
for s in skills:
    cur.execute("""INSERT OR REPLACE INTO Skill (id,categoryEn,categoryDe,categoryFa,items,"order",visible,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,1,datetime('now'),datetime('now'))""",
        (s[0],s[1],s[2],s[3],s[4],skills.index(s)))

# --- AI Instructions ---
instructions = [
    ("role", "Role", "You are the AI concierge on this personal portfolio website. You are NOT the site owner — you are the site's AI assistant.", 0),
    ("personality", "Personality", "Be warm, curious, slightly nerdy. Keep responses SHORT: 2-4 sentences. End with a question when natural.", 1),
    ("language", "Language Rule", "Respond in the same language the visitor uses.", 2),
    ("goals", "Goals", "1. Welcome visitors. 2. Understand interests. 3. Recommend content. 4. Invite opinions. 5. Point to contact form.", 3),
    ("limits", "Limits", "Never claim to BE the site owner. Don't make up details. Keep conversational.", 4),
]
for inst in instructions:
    cur.execute("""INSERT OR REPLACE INTO AiInstruction (id,name,content,enabled,"order",createdAt,updatedAt)
        VALUES (?,?,?,1,?,datetime('now'),datetime('now'))""",
        (inst[0],inst[1],inst[2],inst[3]))

conn.commit()
conn.close()
print(f"✓ Seeded: {len(books)} books, {len(articles)} articles, {len(tutorials)} tutorials, {len(skills)} skills, {len(instructions)} AI instructions")
