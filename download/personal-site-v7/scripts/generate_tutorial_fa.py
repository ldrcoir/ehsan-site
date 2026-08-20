"""
Generate a comprehensive Persian (Farsi) Word tutorial for the personal site.
"""

from docx import Document
from docx.shared import Pt, Inches, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUTPUT = "/home/z/my-project/download/SITE_TUTORIAL_FA.docx"

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
style_normal.paragraph_format.line_spacing = 1.5
style_normal.paragraph_format.space_after = Pt(6)

# Set RTL for the whole document
for section in doc.sections:
    sectPr = section._sectPr
    bidi = OxmlElement("w:bidi")
    sectPr.append(bidi)

# Heading colors
for i, size in [(1, 20), (2, 16), (3, 13)]:
    style = doc.styles[f"Heading {i}"]
    style.font.name = "Calibri"
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
    style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.RIGHT

# ---- Helper functions ----
def add_code_block(text):
    """Add a monospace code block with gray background."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.left_indent = Cm(0.5)
    run = p.add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x00, 0x80, 0x00)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F0F0F0")
    shd.set(qn("w:val"), "clear")
    p._p.get_or_add_pPr().append(shd)
    return p

def add_note(text):
    p = doc.add_paragraph()
    run = p.add_run("⚠ توجه: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0xCC, 0x66, 0x00)
    p.add_run(text).font.color.rgb = RGBColor(0x66, 0x44, 0x00)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    return p

def add_tip(text):
    p = doc.add_paragraph()
    run = p.add_run("💡 نکته: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
    p.add_run(text)
    return p

def add_persian(text):
    """Add a Persian paragraph with RTL."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = Pt(11)
    # Set RTL
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)
    return p

# ============================================================================
# COVER
# ============================================================================
for _ in range(6):
    doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("سایت شخصی")
run.font.size = Pt(36)
run.font.bold = True
run.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
pPr = p._p.get_or_add_pPr()
bidi = OxmlElement("w:bidi")
pPr.append(bidi)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("آموزش کامل سفارشی‌سازی")
run.font.size = Pt(18)
run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
pPr = p._p.get_or_add_pPr()
bidi = OxmlElement("w:bidi")
pPr.append(bidi)

doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("پژوهشگر RF/مایکروویو · برنامه‌نویس AI/ML · نویسنده و مترجم")
run.font.size = Pt(12)
run.font.italic = True
run.font.color.rgb = RGBColor(0x88, 0x88, 0x88)
pPr = p._p.get_or_add_pPr()
bidi = OxmlElement("w:bidi")
pPr.append(bidi)

doc.add_paragraph()
doc.add_paragraph()

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = p.add_run("نسخه ۵.۰ — اسیلوسکوپ واقعی · چند ارائه‌دهنده AI · CRM")
run.font.size = Pt(10)
run.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)

doc.add_page_break()

# ============================================================================
# TABLE OF CONTENTS
# ============================================================================
doc.add_heading("فهرست مطالب", level=1)

toc_items = [
    "۱. مقدمه و معماری",
    "۲. شروع کار — همه چیز کجاست",
    "۳. سفارشی‌سازی اطلاعات شخصی",
    "۴. افزودن لینک‌های اجتماعی",
    "۵. ویرایش مهارت‌ها",
    "۶. افزودن کتاب‌ها",
    "۷. افزودن مقالات",
    "۸. افزودن آموزش‌ها (آپارات/یوتیوب)",
    "۹. مدیریت تجهیزات آزمایشگاه RF",
    "۱۰. سه تم (ترمینال / نیمه‌شب / تمیز)",
    "۱۱. ترمینال تعاملی — دستورات",
    "۱۲. آزمایشگاه سیگنال — ژنراتور + اسیلوسکوپ واقعی",
    "۱۳. دستیار هوش مصنوعی و مدیریت ارائه‌دهنده‌ها",
    "۱۴. فرم تماس و ضد اسپم",
    "۱۵. پنل مدیریت — پیام‌ها، چت‌ها، تنظیمات، CRM",
    "۱۶. یکپارچه‌سازی Bale Messenger",
    "۱۷. کلید خاموش/روشن API",
    "۱۸. محافظت ضد سرقت قالب",
    "۱۹. تغییر رنگ‌ها و فونت‌ها",
    "۲۰. استقرار در پروداکشن",
    "۲۱. استراتژی بک‌آپ مسنجر",
    "۲۲. سؤالات متداول",
]
for item in toc_items:
    p = doc.add_paragraph(item)
    p.paragraph_format.left_indent = Cm(1)
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_page_break()

# ============================================================================
# 1. INTRODUCTION
# ============================================================================
doc.add_heading("۱. مقدمه و معماری", level=1)

add_persian(
    "این آموزش نحوه‌ی سفارشی‌سازی کامل سایت شخصی شما را توضیح می‌دهد. "
    "سایت با Next.js 16، TypeScript، Prisma (SQLite) و z-ai-web-dev-sdk برای چت هوش مصنوعی ساخته شده است. "
    "این سایت دارای تم RF/الکترونیکی منحصربه‌فرد با چندین حالت بصری، "
    "ترمینال تعاملی، آزمایشگاه ژنراتور سیگنال + اسیلوسکوپ واقعی، و پنل مدیریت کامل است."
)

doc.add_heading("ویژگی‌های منحصربه‌فرد سایت:", level=3)
features = [
    "سه تم قابل تعویض (ترمینال هکری، نیمه‌شب آبی، تمیز حرفه‌ای)",
    "ترمینال تعاملی که بازدیدکننده دستور تایپ می‌کند",
    "ژنراتور سیگنال واقعی با کنترل کامل (موج، فرکانس، دامنه، آفست، امپدانس، مدولاسیون)",
    "اسیلوسکوپ واقعی با TIME/DIV، VOLT/DIV، OFFSET، TRIGGER، COUPLING، و اندازه‌گیری‌های خودکار",
    "چت هوش مصنوعی با پشتیبانی از چند ارائه‌دهنده (OpenAI، Anthropic، Z.ai، Ollama)",
    "CRM کامل برای مدیریت پیام‌ها (وضعیت، تگ، یادداشت، تاریخچه)",
    "پنل مدیریت قابل دسترسی از مرورگر یا Bale messenger",
    "محافظت ضد سرقت (غیرفعال‌سازی راست‌کلیک، تشخیص DevTools)",
    "سه زبان: انگلیسی، آلمانی، فارسی (با RTL و تقویم شمسی)",
    "همه‌ی محتوا در یک فایل — بدون نیاز به کدنویسی برای تغییر متن",
]
for f in features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 2. GETTING STARTED
# ============================================================================
doc.add_heading("۲. شروع کار — همه چیز کجاست", level=1)

add_persian(
    "مهم‌ترین چیز: تمام محتوای شما در یک فایل قرار دارد. "
    "به‌ندرت نیاز به تغییر فایل‌های دیگر دارید."
)

doc.add_heading("فایلی که باید ویرایش کنید:", level=3)
add_code_block("src/lib/content.ts")

add_persian(
    "این فایل شامل: نام شما، تگ‌لاین، لینک‌های اجتماعی، مهارت‌ها، کتاب‌ها، مقالات، "
    "آموزش‌ها، تجهیزات آزمایشگاه، و تمام متن‌های رابط کاربری به ۳ زبان است. "
    "این فایل را در هر ویرایشگر متنی باز کنید و مقادیر را تغییر دهید."
)

doc.add_heading("سایر فایل‌های مهم (معمولاً نیاز به تغییر ندارند):", level=3)
files = [
    "src/app/page.tsx — چیدمان صفحه اصلی (همه‌ی بخش‌ها)",
    "src/app/personal.css — تمام استایل بصری (رنگ، فونت، چیدمان)",
    "src/app/api/chat/route.ts — بک‌اند چت AI (شخصیت بات)",
    "src/app/api/contact/route.ts — بک‌اند فرم تماس",
    "src/lib/providers.ts — مدیریت ارائه‌دهنده‌های AI",
    "src/lib/bale.ts — یکپارچه‌سازی Bale messenger",
    "prisma/schema.prisma — مدل‌های دیتابیس",
]
for f in files:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 3. PERSONAL INFO
# ============================================================================
doc.add_heading("۳. سفارشی‌سازی اطلاعات شخصی", level=1)

add_persian("فایل src/lib/content.ts را باز کنید و بخش PERSONAL را در نزدیکی ابتدا پیدا کنید:")

add_code_block("""export const PERSONAL = {
  handle: "your_handle",          // نام کاربری کوتاه در نوار ناوبری
  fullName: {
    en: "Your Name",              // نام انگلیسی
    de: "Ihr Name",               // نام آلمانی
    fa: "اسم شما",                 // نام فارسی
  },
  tagline: {
    en: "RF/Microwave Researcher · AI/ML Programmer · Writer & Translator",
    de: "RF/Mikrowellen-Forscher · AI/ML-Programmierer · Autor & Übersetzer",
    fa: "پژوهشگر RF/مایکروویو · برنامه‌نویس AI/ML · نویسنده و مترجم",
  },
  adminPassword: "admin123",      // این را تغییر دهید!
};""")

add_note("رمز adminPassword را از 'admin123' به چیزی قوی تغییر دهید. این از پنل مدیریت شما محافظت می‌کند.")

add_tip("«handle» نام کاربری کوتاه شماست که در نوار ناوبری و فوتر نمایش داده می‌شود. با حروف کوچک، بدون فاصله استفاده کنید.")

# ============================================================================
# 4. SOCIAL LINKS
# ============================================================================
doc.add_heading("۴. افزودن لینک‌های اجتماعی", level=1)

add_persian("آرایه SOCIALS را در content.ts پیدا کنید. لینک‌ها را اضافه یا حذف کنید:")

add_code_block("""export const SOCIALS = [
  { id: "github", label: "GitHub", url: "https://github.com/", handle: "your_username" },
  { id: "linkedin", label: "LinkedIn", url: "https://linkedin.com/in/", handle: "your_username" },
  { id: "devto", label: "dev.to", url: "https://dev.to/", handle: "your_username" },
  { id: "medium", label: "Medium", url: "https://medium.com/@", handle: "your_username" },
];""")

add_persian("برای افزودن لینک جدید، یک خط را کپی کرده و مقادیر را تغییر دهید:")
add_code_block('{ id: "youtube", label: "YouTube", url: "https://youtube.com/@", handle: "your_channel" },')

# ============================================================================
# 5. SKILLS
# ============================================================================
doc.add_heading("۵. ویرایش مهارت‌ها", level=1)

add_persian("آرایه SKILLS را پیدا کنید. هر دسته دارای نام (به ۳ زبان) و لیست تگ‌هاست:")

add_code_block("""export const SKILLS = [
  {
    category: { en: "RF & Microwave", de: "RF & Mikrowelle", fa: "RF و مایکروویو" },
    items: ["Antenna Design", "EM Simulation", "S-Parameters", "Matching Networks"],
  },
  {
    category: { en: "AI / ML", de: "KI / ML", fa: "هوش مصنوعی / یادگیری ماشین" },
    items: ["Python", "PyTorch", "TensorFlow", "Deep Learning"],
  },
  // دسته‌های بیشتر اضافه کنید...
];""")

add_tip("تگ‌ها به‌صورت چیپ‌های کوچک نمایش داده می‌شوند. کوتاه نگهشان دارید (۱-۲ کلمه).")

# ============================================================================
# 6. BOOKS
# ============================================================================
doc.add_heading("۶. افزودن کتاب‌ها", level=1)

add_persian("آرایه BOOKS را پیدا کنید. هر کتاب دارای عنوان، سال، ناشر، توضیح، و کاور است:")

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
    cover: "linear-gradient(135deg,#003b00,#00ff41)",  // گرادیان CSS
    link: "https://amazon.com/...",  // لینک خرید/خواندن
  },
];""")

add_tip("فیلد «cover» یک گرادیان CSS است. از https://cssgradient.io برای تولید گرادیان‌های زیبا استفاده کنید.")

# ============================================================================
# 7. ARTICLES
# ============================================================================
doc.add_heading("۷. افزودن مقالات", level=1)

add_persian("آرایه ARTICLES را پیدا کنید. هر مقاله دارای عنوان، محل انتشار، تاریخ، نوع، خلاصه، و لینک است:")

add_code_block("""export const ARTICLES = [
  {
    id: "a1",
    title: { en: "Article Title", de: "Artikeltitel", fa: "عنوان مقاله" },
    venue: { en: "Journal Name", de: "Zeitschrift", fa: "نام مجله" },
    date: "2024-09",  // فرمت YYYY-MM
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
doc.add_heading("۸. افزودن آموزش‌ها (آپارات/یوتیوب)", level=1)

add_persian("آرایه TUTORIALS را پیدا کنید. embedUrl باید URL امبد باشد، نه URL تماشا:")

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

doc.add_heading("نحوه‌ی گرفتن URL امبد آپارات:", level=3)
steps = [
    "ویدیوی خود را در آپارات باز کنید",
    "روی «اشتراک‌گذاری» زیر ویدیو کلیک کنید",
    "URL «embed» را کپی کنید — به این شکل است:",
    "کد ABC123 را با هش ویدیوی خود جایگزین کنید",
]
for i, s in enumerate(steps, 1):
    p = doc.add_paragraph(f"{i}. {s}", style="List Number")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

add_code_block("https://www.aparat.com/video/video/embed/videohash/ABC123/vframe")

doc.add_heading("برای یوتیوب:", level=3)
add_code_block("https://www.youtube.com/embed/VIDEO_ID")

add_note("آموزش‌ها ۶ تا در هر صفحه نمایش داده می‌شوند با دکمه «بارگذاری بیشتر». می‌توانید هر تعداد که می‌خواهید اضافه کنید.")

# ============================================================================
# 9. RF EQUIPMENT
# ============================================================================
doc.add_heading("۹. مدیریت تجهیزات آزمایشگاه RF", level=1)

add_persian("آرایه RF_EQUIPMENT را پیدا کنید. این تجهیزات آزمایشگاه شما را با نشانگر LED وضعیت نمایش می‌دهد:")

add_code_block("""export const RF_EQUIPMENT = [
  { id: "vna", name: "Vector Network Analyzer", model: "Keysight PNA-X", status: "online" },
  { id: "sa", name: "Spectrum Analyzer", model: "R&S FSW", status: "online" },
  { id: "osc", name: "Oscilloscope", model: "Tektronix MSO64", status: "standby" },
];""")

add_persian("گزینه‌های وضعیت: «online» (LED سبز)، «standby» (LED کهربایی)، «offline» (LED خاکستری)")

# ============================================================================
# 10. THEMES
# ============================================================================
doc.add_heading("۱۰. سه تم (ترمینال / نیمه‌شب / تمیز)", level=1)

add_persian(
    "سایت دارای ۳ تم است که بازدیدکنندگان می‌توانند با نقاط رنگی در نوار ناوبری بین آن‌ها جابجا شوند. "
    "انتخاب در localStorage ذخیره می‌شود و در بازدیدهای بعدی حفظ می‌گردد."
)

doc.add_heading("تم ۱: ترمینال (پیش‌فرض)", level=3)
add_persian("سبز روی مشکی، فونت monospace، خطوط اسکن CRT، پس‌زمینه باران ماتریکسی.")
add_persian("بهترین برای: بازدیدکنندگان فنی، مخاطبان توسعه‌دهنده، زیبایی‌شناسی «هکری».")

doc.add_heading("تم ۲: نیمه‌شب", level=3)
add_persian("آبی روی سرمه‌ای تیره، نرم‌تر از مشکی خالص. بدون خطوط اسکن.")
add_persian("بهترین برای: بازدیدکنندگانی که حالت تیره را دوست دارند اما مشکی خالص را خشن می‌دانند.")

doc.add_heading("تم ۳: تمیز", level=3)
add_persian("پس‌زمینه روشن، لهجه‌های آبی، فونت sans-serif (Inter). حرفه‌ای و ظریف.")
add_persian("بهترین برای: استخدام‌کنندگان، آکادمیک، بازدیدکنندگان غیرفنی، مطالعه در روز.")

add_tip("می‌توانید تم پیش‌فرض را با ویرایش page.tsx و تغییر حالت اولیه تغییر دهید: useState<'terminal' | 'clean' | 'midnight'>('clean')")

# ============================================================================
# 11. TERMINAL COMMANDS
# ============================================================================
doc.add_heading("۱۱. ترمینال تعاملی — دستورات", level=1)

add_persian("بازدیدکنندگان می‌توانند این دستورات را در ترمینال هرو تایپ کنند:")

commands = [
    ("help", "نمایش همه‌ی دستورات موجود"),
    ("about / whoami", "معرفی کوتاه"),
    ("skills", "لیست همه‌ی مهارت‌ها"),
    ("books", "لیست کتاب‌های منتشرشده"),
    ("articles", "لیست مقالات و پژوهش‌ها"),
    ("tutorials", "لیست آموزش‌های ویدیویی"),
    ("contact", "نمایش اطلاعات تماس"),
    ("social", "نمایش لینک‌های اجتماعی"),
    ("date", "زمان فعلی UTC"),
    ("scan", "اسکن طیف RF شبیه‌سازی‌شده"),
    ("chat", "اسکرول به بخش چت AI"),
    ("clear / cls", "پاک‌سازی ترمینال"),
    ("ls", "لیست بخش‌ها"),
    ("pwd", "نمایش مسیر فعلی"),
    ("matrix", "ایستر اگ: نقل قول فیلم ماتریکس"),
    ("coffee", "ایستر اگ: پیام قهوه"),
    ("42", "ایستر اگ: جواب نهایی زندگی"),
    ("hello / hi / hey", "سلام دوستانه"),
    ("visitor", "نمایش شماره بازدیدکننده"),
    ("hack", "ایستر اگ: شوخی هک"),
]

for cmd, desc in commands:
    p = doc.add_paragraph()
    run = p.add_run(f"  {cmd}")
    run.font.name = "Consolas"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x00, 0x66, 0x00)
    p.add_run(f"  — {desc}")
    p.paragraph_format.left_indent = Cm(1)
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 12. SIGNAL LAB
# ============================================================================
doc.add_heading("۱۲. آزمایشگاه سیگنال — ژنراتور + اسیلوسکوپ واقعی", level=1)

add_persian(
    "بخش About دارای آزمایشگاه سیگنال با دو دستگاه واقعی است که بی‌سیم به هم متصل‌اند. "
    "این دیگر فقط یک نمایشگر ساده نیست — هر دو دستگاه کنترل‌های کامل دارند."
)

doc.add_heading("ژنراتور سیگنال (Keysight 33600A):", level=3)
gen_features = [
    "انتخاب موج: sine / square / triangle / sawtooth",
    "محدوده فرکانس: Hz / kHz / MHz",
    "فرکانس دقیق: اسلایدر",
    "دامنه (Vpp): 0.01V تا 10V",
    "آفست DC: -5V تا +5V",
    "امپدانس خروجی: 50Ω / 600Ω / High-Z",
    "مدولاسیون: NONE / AM / FM",
    "فرکانس مدولاسیون: 1-100 Hz",
    "خروجی روشن/خاموش",
]
for f in gen_features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("اسیلوسکوپ دیجیتال (Tektronix MSO64):", level=3)
osc_features = [
    "TIME/DIV: 1ms تا 500ms در هر بخش",
    "VOLT/DIV: 10mV تا 5V در هر بخش",
    "OFFSET: موقعیت عمودی -5V تا +5V",
    "COUPLING: AC / DC / GND",
    "TRIGGER MODE: AUTO / NORM / SINGLE",
    "TRIGGER EDGE: RISE / FALL",
    "TRIGGER LEVEL: -5V تا +5V",
    "CHANNEL ON/OFF",
    "اندازه‌گیری خودکار: Vpp، Vrms، Vavg، فرکانس، دوره",
    "گرید با محورهای مرکزی و تیک‌مارک",
    "نشانگر سطح تریگر (فلش کهربایی)",
    "نشانگر آفست (فلش سبز)",
]
for f in osc_features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

add_persian(
    "وقتی هر کنترل ژنراتور را تغییر می‌دهید، اسیلوسکوپ فوراً به‌روز می‌شود. "
    "آن‌ها «بی‌سیم متصل‌اند» — یک انیمیشن موج سیگنال بینشان است."
)

add_tip("این انیمیشن canvas جاوااسکریپت خالص است — سیگنال RF واقعی نیست. یک نمایش بصری از تخصص RF شماست.")

# ============================================================================
# 13. AI CHAT + PROVIDERS
# ============================================================================
doc.add_heading("۱۳. دستیار هوش مصنوعی و مدیریت ارائه‌دهنده‌ها", level=1)

add_persian(
    "بخش چت دارای یک بات AI با کال‌ساین «QRV-7» است که با بازدیدکنندگان صحبت می‌کند. "
    "سایت از چندین ارائه‌دهنده AI با زنجیره fallback پشتیبانی می‌کند."
)

doc.add_heading("ارائه‌دهنده‌های پشتیبانی‌شده:", level=3)
providers = [
    ("Z.ai (پیش‌فرض)", "استفاده از z-ai-web-dev-sdk، بدون نیاز به API key"),
    ("OpenAI", "GPT-4o، GPT-4o-mini و غیره. نیاز به API key"),
    ("Anthropic Claude", "Claude 3.5 Sonnet و غیره. نیاز به API key"),
    ("Ollama (محلی)", "اجرا روی کامپیوتر خودتان، بدون API key"),
    ("Custom", "هر endpoint سازگار با OpenAI"),
]
for name, desc in providers:
    p = doc.add_paragraph()
    run = p.add_run(f"• {name}: ")
    run.bold = True
    p.add_run(desc)
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("مدیریت ارائه‌دهنده‌ها از پنل ادمین:", level=3)
steps = [
    "به #admin بروید → تب settings → بخش AI Providers",
    "برای هر ارائه‌دهنده: فعال/غیرفعال، API key، model، priority",
    "priority تعیین می‌کند کدام اول امتحان شود (کمتر = اولویت بالاتر)",
    "اگر یک ارائه‌دهنده fail شود، بعدی امتحان می‌شود",
]
for i, s in enumerate(steps, 1):
    p = doc.add_paragraph(f"{i}. {s}", style="List Number")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("شخصیت بات:", level=3)
bat_features = [
    "دوستانه، کنجکاو، کمی نردی",
    "از بازدیدکنندگان نظراتشان را می‌پرسد",
    "محتوای مرتبط از سایت پیشنهاد می‌کند",
    "به زبان بازدیدکننده پاسخ می‌دهد (EN/DE/FA)",
    "هرگز ادعا نمی‌کند که شماست — دستیار AI سایت است",
]
for f in bat_features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("تغییر شخصیت بات:", level=3)
add_persian("تابع buildSystemPrompt() را ویرایش کنید:")
add_code_block("src/app/api/chat/route.ts")

# ============================================================================
# 14. CONTACT FORM
# ============================================================================
doc.add_heading("۱۴. فرم تماس و ضد اسپم", level=1)

add_persian(
    "فرم تماس ایمیل شما را به‌صورت عمومی نمایش نمی‌دهد. در عوض، بازدیدکنندگان فرم را پر می‌کنند "
    "و پیام‌ها در دیتابیس ذخیره می‌شوند. شما آن‌ها را در پنل ادمین می‌بینید."
)

doc.add_heading("ویژگی‌های ضد اسپم:", level=3)
anti_spam = [
    "Rate limit: ۳ پیام در ۱۰ دقیقه از هر IP",
    "تشخیص بات از طریق User-Agent",
    "تطبیق الگوی اسپم (viagra، casino، چند URL و غیره)",
    "پیام باید حداقل ۱۰ کاراکتر باشد",
]
for f in anti_spam:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 15. ADMIN PANEL
# ============================================================================
doc.add_heading("۱۵. پنل مدیریت — پیام‌ها، چت‌ها، تنظیمات، CRM", level=1)

doc.add_heading("نحوه دسترسی:", level=3)
access = [
    "URL: yoursite.com/#admin",
    "کیبورد: Ctrl + Shift + A",
    "ترمینال: دستور «admin» (از help حذف شده)",
    "فوتر: کلیک روی لینک [admin]",
]
for a in access:
    p = doc.add_paragraph(a, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("چهار تب:", level=3)

doc.add_heading("۱. پیام‌های تماس (CRM کامل)", level=3)
crm_features = [
    "جستجو بر اساس نام، ایمیل، یا محتوای پیام",
    "خروجی CSV",
    "پاسخ به هر پیام (در دیتابیس ذخیره می‌شود)",
    "تغییر وضعیت: new / read / replied / archived",
    "افزودن تگ به پیام‌ها (مثلاً: مهم، فوری، همکاری)",
    "ایجاد تگ‌های سفارشی با رنگ",
    "یادداشت خصوصی روی هر پیام",
    "مشاهده تاریخچه پاسخ‌ها",
]
for f in crm_features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("۲. لاگ‌های چت AI", level=3)
chat_features = [
    "مشاهده کامل تاریخچه مکالمه هر سشن",
    "تزریق پاسخ خودتان به‌عنوان AI (بازدیدکننده دفعه بعد می‌بیند)",
]
for f in chat_features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("۳. تنظیمات", level=3)
settings_features = [
    "کلید خاموش/روشن API — غیرفعال‌سازی فوری چت AI",
    "ویرایش نام نمایشی، تگ‌لاین، وضعیت",
    "پیکربندی Bale messenger",
    "مدیریت ارائه‌دهنده‌های AI (افزودن/حذف/فعال‌سازی/API key)",
]
for f in settings_features:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 16. BALE
# ============================================================================
doc.add_heading("۱۶. یکپارچه‌سازی Bale Messenger", level=1)

add_persian(
    "می‌توانید اعلان‌ها را مستقیماً از Bale messenger روی گوشی خود دریافت کنید و به پیام‌ها پاسخ دهید."
)

doc.add_heading("مراحل راه‌اندازی:", level=3)
bale_steps = [
    "ایجاد بات در Bale: پیام به @botfather، ارسال /newbot",
    "ذخیره bot token (شکل: 123456789:ABCdef...)",
    "ارسال پیام به بات خود، سپس بازدید برای گرفتن chat ID:",
    "در پنل ادمین → تب settings، bot token و chat ID را وارد کنید",
    "فعال‌سازی toggle اعلان‌های Bale",
    "راه‌اندازی webhook تا بتوانید از Bale پاسخ دهید:",
]
for i, s in enumerate(bale_steps, 1):
    p = doc.add_paragraph(f"{i}. {s}", style="List Number")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

add_code_block("https://api.bale.ai/v1/botsYOUR_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/bale/webhook")

doc.add_heading("دستورات بات Bale:", level=3)
bale_commands = [
    ("/help", "نمایش همه‌ی دستورات"),
    ("/list", "نمایش ۵ پیام تماس اخیر"),
    ("/reply {id} {text}", "پاسخ به پیام تماس"),
    ("/chat {sessionId} {text}", "تزریق پاسخ به چت AI"),
    ("/disable", "غیرفعال‌سازی چت AI"),
    ("/enable", "فعال‌سازی چت AI"),
    ("/stats", "نمایش آمار سایت"),
]
for cmd, desc in bale_commands:
    p = doc.add_paragraph()
    run = p.add_run(f"  {cmd}")
    run.font.name = "Consolas"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x00, 0x66, 0x00)
    p.add_run(f"  — {desc}")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 17. KILL SWITCH
# ============================================================================
doc.add_heading("۱۷. کلید خاموش/روشن API", level=1)

add_persian("اگر چت AI درخواست‌های زیادی دریافت می‌کند یا می‌خواهید موقتاً آن را غیرفعال کنید:")

doc.add_heading("روش ۱: پنل ادمین", level=3)
add_persian("به #admin بروید → settings → toggle «AI Chat API» را خاموش/روشن کنید")

doc.add_heading("روش ۲: دستور Bale", level=3)
add_persian("/disable را به بات Bale خود بفرستید. /enable برای فعال‌سازی مجدد.")

add_persian("وقتی غیرفعال است، چت API کد HTTP 503 با پیام «موقتاً غیرفعال» برمی‌گرداند.")

# ============================================================================
# 18. ANTI-THEFT
# ============================================================================
doc.add_heading("۱۸. محافظت ضد سرقت قالب", level=1)

add_persian("سایت دارای چندین اقدام برای بازدارندگی سرقت قالب است:")

anti_theft = [
    "منوی راست‌کلیک غیرفعال است",
    "F12، Ctrl+Shift+I، Ctrl+U، Ctrl+S مسدود شده‌اند",
    "تشخیص DevTools — اورلی هشدار اگر ابزار توسعه‌دهنده باز است",
    "واترمارک نامرئی با شناسه deployment",
    "تمام محتوا از منطق قالب جدا است (content.ts)",
    "ویژگی‌های سمت سرور (چت AI، ادمین) روی کپی استاتیک کار نمی‌کنند",
]
for f in anti_theft:
    p = doc.add_paragraph(f, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

add_note("هیچ اقدام ضد سرقتی ۱۰۰٪ غیرقابل نفوذ نیست. این‌ها سطح را بالا می‌برند اما یک دزد مصمم هنوز می‌تواند دور بزند. واترمارک به شناسایی کپی‌های دزدی کمک می‌کند.")

# ============================================================================
# 19. COLORS & FONTS
# ============================================================================
doc.add_heading("۱۹. تغییر رنگ‌ها و فونت‌ها", level=1)

add_persian("تمام رنگ‌ها به‌صورت متغیرهای CSS در personal.css تعریف شده‌اند. بلوک :root را پیدا کنید:")

add_code_block(""":root {
  --bg: #000000;           /* پس‌زمینه صفحه */
  --green: #00ff41;        /* رنگ لهجه اصلی */
  --green-bright: #39ff14; /* لهجه روشن برای تیترها */
  --text: #c8ffc8;         /* رنگ متن بدنه */
  --text-dim: #4a7a4a;     /* متن کم‌رنگ */
  --border: #1a3a1a;       /* رنگ حاشیه */
  /* ... غیره */
}""")

add_persian("هر تم بلوک رنگی خودش را دارد:")
themes = [
    "html[data-theme='terminal'] — سبز روی مشکی",
    "html[data-theme='midnight'] — آبی روی سرمه‌ای تیره",
    "html[data-theme='clean'] — آبی روی سفید",
]
for t in themes:
    p = doc.add_paragraph(t, style="List Bullet")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# 20. DEPLOYMENT
# ============================================================================
doc.add_heading("۲۰. استقرار در پروداکشن", level=1)

add_persian("این سایت روی dev server Next.js اجرا می‌شود. برای استقرار production:")

deploy_steps = [
    "انتخاب پلتفرم هاستینگ (Vercel، Netlify، Railway و غیره)",
    "تنظیم متغیرهای محیط:",
    "برای دیتابیس، از SQLite به PostgreSQL تغییر دهید:",
    "Build و deploy:",
]
for i, s in enumerate(deploy_steps, 1):
    p = doc.add_paragraph(f"{i}. {s}", style="List Number")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

add_code_block("DATABASE_URL=your_production_database_url\nZAI_API_KEY=your_api_key\nBALE_BOT_TOKEN=your_bale_token")

add_persian("ویرایش prisma/schema.prisma: تغییر provider از 'sqlite' به 'postgresql'")
add_code_block("bun run db:push")
add_code_block("bun run build")

# ============================================================================
# 21. BACKUP MESSENGER
# ============================================================================
doc.add_heading("۲۱. استراتژی بک‌آپ مسنجر", level=1)

add_persian(
    "در صورت قطع یا در دسترس نبودن Bale، باید یک برنامه بک‌آپ داشته باشید. "
    "پیشنهاد:"
)

doc.add_heading("فاز ۱ (الان): Bale به‌عنوان اصلی", level=3)
add_persian("Bale یکپارچه شده و کار می‌کند. از آن به‌عنوان کانال اعلان اصلی استفاده کنید.")

doc.add_heading("فاز ۲ (وقتی Bale قطع است): Telegram به‌عنوان بک‌آپ", level=3)
add_persian("Telegram API بات بسیار شبیه Bale دارد. برای افزودن پشتیبانی Telegram:")
tele_steps = [
    "ایجاد بات Telegram از طریق @BotFather",
    "کپی src/lib/bale.ts به src/lib/telegram.ts",
    "تغییر URL پایه API از api.bale.ai به api.telegram.org",
    "افزودن مسیر API جدید: src/app/api/telegram/webhook/route.ts",
    "افزودن تنظیمات Telegram به پنل ادمین (مشابه Bale)",
]
for i, s in enumerate(tele_steps, 1):
    p = doc.add_paragraph(f"{i}. {s}", style="List Number")
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

doc.add_heading("فاز ۳ (آینده): ایمیل به‌عنوان بک‌آپ نهایی", level=3)
add_persian(
    "برای تضمین تحویل، اعلان‌های ایمیل را با سرویسی مثل Resend، SendGrid یا Amazon SES تنظیم کنید. "
    "این تضمین می‌کند حتی اگر همه مسنجرها قطع باشند، هرگز پیامی را از دست نمی‌دهید."
)

add_tip("الان با Telegram/ایمیل شروع نکنید. Bale کار می‌کند. بک‌آپ‌ها را فقط وقتی واقعاً نیاز داشتید اضافه کنید — بهینه‌سازی زودرس وقت تلف می‌کند.")

# ============================================================================
# 22. FAQ
# ============================================================================
doc.add_heading("۲۲. سؤالات متداول", level=1)

faqs = [
    ("چطور عنوان سایت را در تب مرورگر تغییر دهم؟",
     "ویرایش src/app/layout.tsx → فیلد metadata.title"),
    ("چطور یک بخش جدید به سایت اضافه کنم؟",
     "ویرایش src/app/page.tsx. یک بخش موجود (مثل Books) را کپی و تغییر دهید. لینک ناوبری را اضافه کنید."),
    ("چطور پاسخ‌های بات AI را تغییر دهم؟",
     "ویرایش buildSystemPrompt() در src/app/api/chat/route.ts. این شخصیت و دستورالعمل‌های بات را کنترل می‌کند."),
    ("پیام‌ها کجا ذخیره می‌شوند؟",
     "در دیتابیس SQLite در db/custom.db. از پنل ادمین برای مشاهده استفاده کنید، یا خط فرمان sqlite3."),
    ("چطور دیتابیس را ریست کنم؟",
     "اجرا: rm db/custom.db && bun run db:push"),
    ("می‌توانم زبان‌های بیشتری اضافه کنم؟",
     "بله. در content.ts: کد زبان را به type Lang، آرایه LANGS اضافه کنید، و یک آبجکت UI.xx با تمام ترجمه‌ها اضافه کنید."),
    ("چطور باران ماتریکسی را غیرفعال کنم؟",
     "در page.tsx، خط <MatrixRain /> را حذف کنید."),
    ("آموزش‌ها لود نمی‌شوند — چرا؟",
     "embedUrl باید URL EMBED باشد، نه URL تماشا. برای آپارات، از فرمت /embed/ استفاده کنید."),
    ("چطور ارائه‌دهنده AI جدید اضافه کنم؟",
     "پنل ادمین → settings → بخش AI Providers → افزودن ارائه‌دهنده جدید با API key و model."),
    ("چطور وضعیت پیام را در CRM تغییر دهم؟",
     "پنل ادمین → تب messages → روی پیام کلیک کنید → منوی وضعیت → new/read/replied/archived."),
]

for q, a in faqs:
    p = doc.add_paragraph()
    run = p.add_run("سؤال: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x66, 0xCC)
    p.add_run(q)
    p.paragraph_format.space_before = Pt(10)
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

    p2 = doc.add_paragraph()
    run = p2.add_run("پاسخ: ")
    run.bold = True
    run.font.color.rgb = RGBColor(0x00, 0x80, 0x00)
    p2.add_run(a)
    p2.paragraph_format.left_indent = Cm(0.5)
    pPr = p2._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    pPr.append(bidi)

# ============================================================================
# SAVE
# ============================================================================
doc.save(OUTPUT)
print(f"✓ آموزش فارسی ذخیره شد: {OUTPUT}")
print(f"  حجم: {os.path.getsize(OUTPUT)} bytes")
