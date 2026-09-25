#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate TUTORIAL_FA_V17.2.docx — Persian tutorial for Personal Site V17.2
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT = "/home/z/my-project/download/TUTORIAL_FA_V17.2.docx"
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

doc = Document()

# تنظیم فونت پیش‌فرض
style = doc.styles["Normal"]
style.font.name = "B Nazanin"
style.font.size = Pt(12)
# برای فارسی، فونت شرقی رو هم ست کن
rPr = style.element.get_or_add_rPr()
rFonts = rPr.find(qn("w:rFonts"))
if rFonts is None:
    rFonts = OxmlElement("w:rFonts")
    rPr.append(rFonts)
rFonts.set(qn("w:cs"), "B Nazanin")
rFonts.set(qn("w:eastAsia"), "B Nazanin")

# تنظیم حاشیه صفحه
for section in doc.sections:
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)

# جهت RTL
for section in doc.sections:
    sectPr = section._sectPr
    bidi = OxmlElement("w:bidi")
    sectPr.append(bidi)


def add_heading(text, level=1):
    """افزودن heading با فونت فارسی"""
    h = doc.add_heading(text, level=level)
    h.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for run in h.runs:
        run.font.name = "B Nazanin"
        rPr = run._element.get_or_add_rPr()
        rFonts = rPr.find(qn("w:rFonts"))
        if rFonts is None:
            rFonts = OxmlElement("w:rFonts")
            rPr.append(rFonts)
        rFonts.set(qn("w:cs"), "B Nazanin")
        rFonts.set(qn("w:eastAsia"), "B Nazanin")
    return h


def add_para(text, bold=False, italic=False, color=None, size=None):
    """افزودن پاراگراف"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.font.name = "B Nazanin"
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = RGBColor(*color)
    if size:
        run.font.size = Pt(size)
    # ست کردن فونت east-asia
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:cs"), "B Nazanin")
    rFonts.set(qn("w:eastAsia"), "B Nazanin")
    return p


def add_bullet(text):
    """افزودن bullet"""
    p = doc.add_paragraph(style="List Bullet")
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(text)
    run.font.name = "B Nazanin"
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:cs"), "B Nazanin")
    rFonts.set(qn("w:eastAsia"), "B Nazanin")
    return p


def add_code(text):
    """افزودن بلاک کد"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.left_indent = Cm(1)
    p.paragraph_format.right_indent = Cm(1)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.font.name = "Courier New"
    run.font.size = Pt(10)
    # background
    rPr = run._element.get_or_add_rPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), "F0F0F0")
    rPr.append(shd)
    return p


# ============================================================================
# جلد
# ============================================================================
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.paragraph_format.space_before = Pt(120)
run = title.add_run("آموزش کامل سایت شخصی\nنسخه V17.2")
run.font.name = "B Nazanin"
run.font.size = Pt(32)
run.bold = True
run.font.color.rgb = RGBColor(0, 100, 0)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle.paragraph_format.space_before = Pt(24)
run = subtitle.add_run("راهنمای نصب، پیکربندی و مدیریت")
run.font.name = "B Nazanin"
run.font.size = Pt(16)
run.italic = True
run.font.color.rgb = RGBColor(74, 122, 74)

author = doc.add_paragraph()
author.alignment = WD_ALIGN_PARAGRAPH.CENTER
author.paragraph_format.space_before = Pt(180)
run = author.add_run("تاریخ: ۲۰۲۶-۰۹-۲۵\nنسخه: V17.2")
run.font.name = "B Nazanin"
run.font.size = Pt(12)

doc.add_page_break()

# ============================================================================
# فهرست
# ============================================================================
add_heading("فهرست مطالب", level=1)

chapters = [
    "فصل ۱ — نصب سریع",
    "فصل ۲ — ورود و امنیت اولیه",
    "فصل ۳ — پنل ادمین — ۱۰ تب کامل",
    "فصل ۴ — تنظیمات (Settings)",
    "فصل ۵ — مدیریت محتوا",
    "فصل ۶ — مدیریت کاربران و دسترسی",
    "فصل ۷ — کلیپ‌های آپارات",
    "فصل ۸ — چت هوش مصنوعی (AI)",
    "فصل ۹ — اعلان‌ها (Bale + Telegram + Email)",
    "فصل ۱۰ — امنیت و ممیزی",
    "فصل ۱۱ — رفع مشکل (Troubleshooting)",
    "فصل ۱۲ —_appendix — دستورات مفید",
]

for ch in chapters:
    add_bullet(ch)

doc.add_page_break()

# ============================================================================
# فصل ۱
# ============================================================================
add_heading("فصل ۱ — نصب سریع", level=1)

add_para("این فصل نحوه نصب کامل سایت رو در ۳ دقیقه با یک دستور توضیح می‌ده.", italic=True, color=(100, 100, 100))

add_heading("پیش‌نیازها", level=2)
add_bullet("سرور VPS با Ubuntu 22.04 یا بالاتر")
add_bullet("حداقل ۱ گیگابایت RAM")
add_bullet("دسترسی root (sudo)")
add_bullet("دامنه‌ی ثبت‌شده (اختیاری برای HTTPS)")
add_bullet("کلیدهای reCAPTCHA v2 (از Google)")

add_heading("مرحله ۱ — دانلود پکیج", level=2)
add_para("روی سرور وارد شوید و دستور زیر رو اجرا کنید:")
add_code("wget https://github.com/ldrcoir/ehsan-site-private/raw/main/public/install-v17.2.zip\nunzip install-v17.2.zip\ncd personal-site")

add_heading("مرحله ۲ — اجرای نصب‌خودکار", level=2)
add_para("اسکریپت نصب خودکار همه چیز رو انجام می‌ده:")
add_code("sudo ./install.sh")
add_para("این اسکریپت به‌طور خودکار:")
add_bullet("Node.js v22 نصب می‌کنه (اگه نباشه)")
add_bullet("Nginx و SQLite و UFW نصب می‌کنه")
add_bullet("فایروال ست می‌کنه (پورت‌های 22, 80, 443)")
add_bullet("Swap 2GB می‌سازه (اگه رم کم باشه)")
add_bullet("SESSION_SECRET قوی تولید می‌کنه (openssl rand -hex 32)")
add_bullet("Webhook secrets تولید می‌کنه")
add_bullet("دیتابیس SQLite با permissions امن می‌سازه")
add_bullet("systemd service با user غیر root (ehsansite)")
add_bullet("Nginx رو به‌عنوان reverse-proxy تنظیم می‌کنه")
add_bullet("HTTPS رو با certbot فعال می‌کنه (اگه دامنه ست شده باشه)")

add_heading("مرحله ۳ — تست سایت", level=2)
add_para("بعد از نصب، سایت باید روی این آدرس در دسترس باشه:")
add_code("http://YOUR_IP:3000")
add_para("یا اگه HTTPS ست شده:")
add_code("https://ehsanmorad.ir")

add_heading("مرحله ۴ — ورود به پنل ادمین", level=2)
add_para("آدرس پنل ادمین:")
add_code("http://YOUR_IP:3000/user-login")
add_para("اطلاعات پیش‌فرض:")
add_bullet("Username: admin")
add_bullet("Password: admin123")
add_para("⚠️ هشدار:", bold=True, color=(255, 0, 0))
add_para("حتماً بعد از اولین ورود، از پنل → تنظیمات → تغییر رمز، رمز رو عوض کنید! رمز فعلی رو هم باید وارد کنید.", color=(200, 0, 0))

doc.add_page_break()

# ============================================================================
# فصل ۲
# ============================================================================
add_heading("فصل ۲ — ورود و امنیت اولیه", level=1)

add_heading("ورود به سیستم", level=2)
add_para("بعد از نصب، به آدرس /user-login برید. با username و password وارد بشید.")
add_para("بعد از ورود موفق:")
add_bullet("یه session cookie بهتون داده می‌شه (HttpOnly + Secure + SameSite=Strict)")
add_bullet("مدت اعتبار session: ۲۴ ساعت")
add_bullet("بعد از ۲۴ ساعت باید دوباره وارد بشید")
add_bullet("اگه تب رو ببندید، session باقی می‌مونه (تا ۲۴ ساعت)")

add_heading("تغییر رمز ادمین", level=2)
add_para("اولین کاری که باید بکنید، تغییر رمزه. به مسیر زیر برید:")
add_code("پنل → تنظیمات (Settings) → تغییر رمز")
add_para("باید:")
add_bullet("رمز فعلی (admin123) رو وارد کنید")
add_bullet("رمز جدید (حداقل ۶ کاراکتر) رو وارد کنید")
add_bullet("دکمه show/hide برای دیدن/مخفی‌کردن رمز")
add_para("بعد از تغییر موفق، باید دوباره با رمز جدید وارد بشید.")

add_heading("تنظیم reCAPTCHA (ضروری)", level=2)
add_para("بدون reCAPTCHA، فرم تماس کار نمی‌کنه!", bold=True, color=(255, 0, 0))
add_para("مراحل:")
add_bullet("به https://www.google.com/recaptcha/admin برید")
add_bullet("یه سایت v2 (checkbox) ثبت کنید")
add_bullet("دامنه‌تون رو اضافه کنید (مثلاً ehsanmorad.ir)")
add_bullet("Site Key و Secret Key رو بگیرید")
add_bullet("فایل .env رو ویرایش کنید:")
add_code("sudo nano /home/ehsan/personal-site/.env")
add_bullet("این دو خط رو پر کنید:")
add_code('RECAPTCHA_SECRET="your-secret-key-here"\nNEXT_PUBLIC_RECAPTCHA_SITEKEY="your-site-key-here"')
add_bullet("سرویس رو restart کنید:")
add_code("sudo systemctl restart personal-site")

add_heading("تنظیم HTTPS (ضروری برای production)", level=2)
add_para("برای امنیت cookie و login، حتماً HTTPS فعال کنید.")
add_para("اگه دامنه دارید:")
add_code("sudo certbot --nginx -d ehsanmorad.ir -d www.ehsanmorad.ir")
add_para("certbot خودش:")
add_bullet("SSL certificate رایگان از Let's Encrypt می‌گیره")
add_bullet("Nginx config رو خودکار آپدیت می‌کنه")
add_bullet("HTTP رو به HTTPS redirect می‌کنه")
add_bullet("هر ۹۰ روز خودکار renew می‌کنه")

doc.add_page_break()

# ============================================================================
# فصل ۳
# ============================================================================
add_heading("فصل ۳ — پنل ادمین — ۱۰ تب کامل", level=1)

add_para("پنل ادمین شامل ۱۰ تب هست که هر کدوم قابلیت خاص خودش رو داره.", italic=True, color=(100, 100, 100))

add_heading("۱. 📊 داشبورد (Overview)", level=2)
add_para("اطلاعات حساب شما:")
add_bullet("Username و Role (admin یا user)")
add_bullet("آخرین ورود")
add_bullet("وضعیت حساب (فعال/غیرفعال)")
add_bullet("بازه دسترسی (اگه محدود شده)")

add_heading("۲. 📨 پیام‌ها (Messages)", level=2)
add_para("پیام‌هایی که بازدیدکنندگان از فرم تماس فرستادن.")
add_para("قابلیت‌ها:")
add_bullet("مشاهده همه پیام‌ها (جدیدترین اول)")
add_bullet("پاسخ به پیام (ذخیره در دیتابیس)")
add_bullet("حذف پیام")
add_bullet("نمایش تاریخ و ساعت دریافت")

add_heading("۳. 📁 محتوا (Content)", level=2)
add_para("مدیریت کتاب‌ها، مقالات، آموزش‌ها، مهارت‌ها، و تجهیزات.")
add_bullet("افزودن مورد جدید")
add_bullet("ویرایش مورد موجود")
add_bullet("حذف مورد")
add_bullet("فعال/غیرفعال‌کردن visible (نمایش در سایت)")
add_bullet("تغییر ترتیب (order)")
add_bullet("واردکردن گروهی (bulk import)")

add_heading("۴. 📝 متن‌ها (Texts)", level=2)
add_para("همه متن‌های سایت رو می‌تونید ویرایش کنید — در ۳ زبان!")
add_bullet("عنوان‌ها")
add_bullet("توضیحات")
add_bullet("دکمه‌ها")
add_bullet("متن‌های footer")
add_para("هر متن ۳ فیلد داره: انگلیسی (en)، فارسی (fa)، آلمانی (de).")

add_heading("۵. 🧭 منو (Navigation)", level=2)
add_para("مدیریت منوی بالای سایت.")
add_bullet("افزودن لینک جدید")
add_bullet("ویرایش لینک")
add_bullet("حذف لینک")
add_bullet("تغییر ترتیب (با دکمه‌های بالا/پایین)")
add_bullet("فعال/غیرفعال‌کردن نمایش")
add_para("هر لینک ۳ برچسب داره (fa/en/de).")

add_heading("۶. 🎨 تم‌ها (Themes)", level=2)
add_para("مدیریت تم‌های رنگی سایت.")
add_bullet("۷ تم آماده")
add_bullet("ساخت تم سفارشی (۱۷ رنگ قابل تنظیم)")
add_bullet("پیش‌نمایش زنده")
add_bullet("فعال/غیرفعال‌کردن تم")

add_heading("۷. 👥 کاربران (Users)", level=2)
add_para("مدیریت کاربرانی که به پنل دسترسی دارن.")
add_para("قابلیت‌ها:")
add_bullet("افزودن کاربر جدید")
add_bullet("تعیین نقش (admin یا user)")
add_bullet("تعیین دسترسی به تب‌ها (permissions)")
add_bullet("تعیین ساعات مجاز (مثلاً ۹ تا ۱۷)")
add_bullet("تعیین روزهای مجاز (مثلاً دوشنبه تا جمعه)")
add_bullet("تعیین تاریخ انقضا")
add_bullet("فعال/غیرفعال‌کردن کاربر")
add_bullet("مشاهده لاگ‌های دسترسی")

add_heading("۸. 🎬 کلیپ‌ها (Clips)", level=2)
add_para("مدیریت ویدیوهای آپارات.")
add_para("برای اضافه‌کردن ویدیو:")
add_bullet("ویدیو رو در آپارات آپلود کنید")
add_bullet("روی ویدیو کلیک کنید → اشتراک‌گذاری")
add_bullet("گزینه «جای‌گذاری در وبلاگ» رو انتخاب کنید")
add_bullet("کد embed رو کپی کنید")
add_bullet("در پنل → کلیپ‌ها → افزودن → کد رو paste کنید")

add_heading("۹. 🔤 فونت (Font)", level=2)
add_para("انتخاب فونت سایت.")
add_bullet("Vazirmatn — پیش‌فرض فارسی")
add_bullet("Inter — مدرن انگلیسی")
add_bullet("Lora — سریف کلاسیک")
add_bullet("Fira Code — مونو اسپیس")
add_bullet("Geist Mono — مونو مدرن")
add_para("انتخاب در localStorage مرورگر ذخیره می‌شه.")

add_heading("۱۰. ⚙️ تنظیمات (Settings)", level=2)
add_para("تب کامل تنظیمات — در فصل ۴ مفصل توضیح داده شده.")

doc.add_page_break()

# ============================================================================
# فصل ۴
# ============================================================================
add_heading("فصل ۴ — تنظیمات (Settings)", level=1)

add_para("این تب قلب پنل ادمینه — همه تنظیمات مهم اینجا انجام می‌شه.", italic=True, color=(100, 100, 100))

add_heading("انتخاب زبان پنل و فونت", level=2)
add_bullet("زبان پنل: فارسی / English / Deutsch")
add_bullet("فونت سایت: ۵ گزینه")
add_para("انتخاب‌ها در localStorage ذخیره می‌شن و بلافاصله اعمال می‌شن.")

add_heading("تغییر نام و شعار", level=2)
add_para("نام نمایشی و شعار (tagline) رو در ۳ زبان می‌تونید عوض کنید.")
add_para("نام در ۳ فیلد جدا ذخیره می‌شه:")
add_bullet("نام فارسی (name_fa)")
add_bullet("نام انگلیسی (name_en)")
add_bullet("نام آلمانی (name_de)")
add_para("همین برای شعار (tagline_fa/en/de).")
add_para("نام کاربری (handle) هم قابل تغییره — مثلاً @ehsanmorad")

add_heading("تغییر رمز", level=2)
add_para("برای امنیت بیشتر، تغییر رمز نیاز به رمز فعلی داره:")
add_bullet("رمز فعلی رو وارد کنید")
add_bullet("رمز جدید (حداقل ۶ کاراکتر) رو وارد کنید")
add_bullet("رمز جدید باید با رمز فعلی متفاوت باشه")
add_bullet("اگه رمز فعلی اشتباه باشه، خطا می‌ده")

add_heading("ایمیل فوروارد", level=2)
add_para("پیام‌های تماس به این ایمیل فوروارد می‌شن.")
add_para("از formsubmit.co استفاده می‌شه — رایگان و بدون ثبت‌نام.")
add_para("نکته: اولین بار، formsubmit.co یه ایمیل تأیید می‌فرسته.")

add_heading("تنظیم Bale Bot", level=2)
add_para("برای دریافت اعلان پیام‌های جدید در Bale:")
add_bullet("در Bale، به @botfather پیام بدید: /newbot")
add_bullet("نام و username بات رو تعیین کنید")
add_bullet("Bot Token رو بگیرید و اینجا وارد کنید")
add_bullet("Chat ID خودتون رو بگیرید (می‌تونید از @userinfobot بگیرید)")
add_bullet("ذخیره رو بزنید")
add_para("بعد از تنظیم، هر پیام تماس جدید به Bale شما فوروارد می‌شه.")

add_heading("تنظیم Telegram Bot", level=2)
add_para("مشابه Bale، اما با Telegram:")
add_bullet("در Telegram به @BotFather پیام بدید: /newbot")
add_bullet("Bot Token رو بگیرید")
add_bullet("Chat ID خودتون رو بگیرید (از @userinfobot)")
add_bullet("توکن و Chat ID رو در پنل وارد کنید")

add_heading("تنظیم AI Provider", level=2)
add_para("برای چت هوش مصنوعی، یه یا چند provider فعال کنید:")
add_bullet("OpenAI (GPT-4, GPT-3.5) — به API key نیاز داره")
add_bullet("Anthropic (Claude) — به API key نیاز داره")
add_bullet("Ollama (محلی — رایگان) — به baseUrl نیاز داره")
add_bullet("Groq — به API key نیاز داره")
add_para("اولویت (priority) تعیین می‌کنه کدوم provider اول امتحان می‌شه.")

add_para("برای Ollama محلی:")
add_code("# روی همون سرور:\ncurl -fsSL https://ollama.com/install.sh | sh\nollama pull llama3.2\n# در پنل:\n# baseUrl: http://localhost:11434\n# model: llama3.2")

add_para("همچنین یه kill switch هست — اگه apiEnabled رو خاموش کنید، چت AI کار نمی‌کنه.")

doc.add_page_break()

# ============================================================================
# فصل ۵
# ============================================================================
add_heading("فصل ۵ — مدیریت محتوا", level=1)

add_heading("کتاب‌ها", level=2)
add_para("برای هر کتاب:")
add_bullet("عنوان (fa/en/de)")
add_bullet("توضیحات (fa/en/de)")
add_bullet("ناشر")
add_bullet("لینک خرید یا دانلود")
add_bullet("ترتیب نمایش")
add_bullet("visible (نمایش/مخفی)")

add_heading("مقالات", level=2)
add_bullet("عنوان (fa/en/de)")
add_bullet("خلاصه (fa/en/de)")
add_bullet("نام مجله/کنفرانس")
add_bullet("لینک")

add_heading("آموزش‌ها", level=2)
add_bullet("عنوان (fa/en/de)")
add_bullet("توضیحات (fa/en/de)")
add_bullet("URL ویدیو (آپارات/یوتیوب/vimeo)")
add_bullet("سه‌شنبه‌ی محتوا")

add_heading("مهارت‌ها", level=2)
add_bullet("عنوان دسته")
add_bullet("آیتم‌ها (با کاما جدا کنید)")
add_bullet("visible")

add_heading("قواعد AI", level=2)
add_para("این قواعد به AI گفته می‌شه چطور رفتار کنه.")
add_bullet("عنوان")
add_bullet("محتوای قاعده")
add_bullet("enabled")

add_heading("تجهیزات آزمایشگاه", level=2)
add_bullet("نام (fa/en/de)")
add_bullet("برند")
add_bullet("مدل")
add_bullet("مشخصات فنی (JSON)")
add_bullet("visible")

add_heading("واردکردن گروهی", level=2)
add_para("برای افزودن چندین مورد همزمان:")
add_bullet("روی «Bulk Import» کلیک کنید")
add_bullet("متن JSON رو paste کنید")
add_bullet("فرمت:")
add_code('[\n  {"titleFa": "کتاب ۱", "titleEn": "Book 1", ...},\n  {"titleFa": "کتاب ۲", ...}\n]')
add_bullet("روی «Import» کلیک کنید")

doc.add_page_break()

# ============================================================================
# فصل ۶
# ============================================================================
add_heading("فصل ۶ — مدیریت کاربران و دسترسی", level=1)

add_heading("ساخت کاربر جدید", level=2)
add_para("برای دادن دسترسی به دیگران:")
add_bullet("روی «+ کاربر جدید» کلیک کنید")
add_bullet("Username (حداقل ۳ کاراکتر)")
add_bullet("Display Name (نام نمایشی)")
add_bullet("Password (حداقل ۶ کاراکتر)")
add_bullet("Role: admin یا user")
add_bullet("Permissions: کدام تب‌ها قابل دسترسی باشن")
add_bullet("Allowed Hours: مثلاً ۹ تا ۱۷")
add_bullet("Allowed Days: مثلاً دوشنبه تا جمعه")
add_bullet("Expires At: تاریخ انقضا (اختیاری)")

add_heading("مدیریت دسترسی", level=2)
add_para("سه نوع محدودیت:")
add_para("۱. محدودیت بر اساس تب (Permissions):", bold=True)
add_bullet("هر تب به‌صورت جدا قابل اجازه/ممنوع هست")
add_bullet("مثلاً: یه کاربر فقط به «پیام‌ها» دسترسی داشته باشه")

add_para("۲. محدودیت زمانی (Hours):", bold=True)
add_bullet("Allowed Hour Start و End به UTC هست")
add_bullet("مثلاً ۹ تا ۱۷ یعنی ۹ صبح تا ۵ بعدازظهر UTC")
add_bullet("اگه تهران هستید، ۱۲:۳۰ تا ۲۰:۳۰ UTC بزنید")

add_para("۳. محدودیت روزهای هفته (Days):", bold=True)
add_bullet("۰ = یکشنبه، ۱ = دوشنبه، ...، ۶ = شنبه")
add_bullet("می‌تونید چند روز انتخاب کنید (با کاما جدا)")

add_para("۴. محدودیت تاریخ انقضا (Expires At):", bold=True)
add_bullet("اگه ست بشه، بعد از این تاریخ کاربر دیگه دسترسی نداره")

add_heading("لاگ‌های دسترسی", level=2)
add_para("برای هر کاربر، لاگ‌های زیر ذخیره می‌شن:")
add_bullet("زمان ورود (با IP)")
add_bullet("زمان خروج")
add_bullet("User-Agent مرورگر")
add_bullet("نتیجه (موفق/ناموفق)")
add_para("برای مشاهده: پنل → کاربران → لاگ‌ها")

doc.add_page_break()

# ============================================================================
# فصل ۷
# ============================================================================
add_heading("فصل ۷ — کلیپ‌های آپارات", level=1)

add_heading("افزودن کلیپ جدید", level=2)
add_para("مراحل:")
add_bullet("ویدیو رو در آپارات آپلود کنید")
add_bullet("روی ویدیو کلیک کنید")
add_bullet("گزینه «اشتراک‌گذاری» رو بزنید")
add_bullet("گزینه «جای‌گذاری در وبلاگ» (Embed) رو انتخاب کنید")
add_bullet("کل کد embed رو کپی کنید (شامل <iframe>)")
add_bullet("در پنل → کلیپ‌ها → افزودن کلیپ")
add_bullet("عنوان، توضیحات، و کد embed رو paste کنید")
add_bullet("دسته‌بندی (مثلاً آموزش، پروژه)")
add_bullet("visible (نمایش در سایت)")
add_bullet("ترتیب")

add_heading("امنیت کلیپ‌ها", level=2)
add_para("سیستم sanitize-embed داره کد embed رو پاک می‌کنه:")
add_bullet("فقط iframe از آپارات/یوتیوب/vimeo مجاز هست")
add_bullet("سایر تگ‌های HTML حذف می‌شن")
add_bullet("جلوگیری از XSS از طریق embed")

add_heading("CSP و کلیپ‌ها", level=2)
add_para("Content-Security-Policy فقط به این دامنه‌ها اجازه frame می‌ده:")
add_bullet("aparat.com")
add_bullet("youtube.com")
add_bullet("player.vimeo.com")

doc.add_page_break()

# ============================================================================
# فصل ۸
# ============================================================================
add_heading("فصل ۸ — چت هوش مصنوعی (AI)", level=1)

add_heading("نحوه کار", level=2)
add_para("بازدیدکننده می‌تونه با یه AI چت کنه. شما تعیین می‌کنید از کدوم provider استفاده بشه.")
add_para("Fallback chain:")
add_bullet("اول OpenAI (اگه فعال و API key داشته باشه)")
add_bullet("اگه نشد، Anthropic")
add_bullet("اگه نشد، Ollama محلی")
add_bullet("اگه همه نشدن، Groq")
add_bullet("اگه هیچ‌کدوم نبودن، پیام دمو نمایش داده می‌شه")

add_heading("تنظیم Ollama محلی (رایگان)", level=2)
add_para("اگه نمی‌خواید به API های پولی وابسته باشید، Ollama محلی عالیه!")
add_para("نصب:")
add_code("curl -fsSL https://ollama.com/install.sh | sh")
add_para("دانلود مدل:")
add_code("ollama pull llama3.2  # 3.8GB\n# یا\nollama pull qwen2.5:7b  # 4.4GB")
add_para("تست:")
add_code("curl http://localhost:11434/api/generate -d \'{\n  \"model\": \"llama3.2\",\n  \"prompt\": \"Hello\"\n}'")
add_para("تنظیم در پنل:")
add_bullet("Provider: Ollama")
add_bullet("baseUrl: http://localhost:11434")
add_bullet("Model: llama3.2")
add_bullet("Enabled: true")
add_bullet("Priority: 1")

add_heading("API Kill Switch", level=2)
add_para("اگه نمی‌خواید چت کار کنه:")
add_bullet("پنل → تنظیمات → بخش AI")
add_bullet("«چت AI فعال» رو خاموش کنید")
add_bullet("ذخیره رو بزنید")

add_heading("Rate Limit", level=2)
add_bullet("هر IP می‌تونه ۸ پیام در ۱۵ دقیقه بفرسته")
add_bullet("اگه بیشتر بفرسته، 429 (rate_limit) می‌گیره")

doc.add_page_break()

# ============================================================================
# فصل ۹
# ============================================================================
add_heading("فصل ۹ — اعلان‌ها (Bale + Telegram + Email)", level=1)

add_heading("راه‌اندازی Bale Bot", level=2)
add_para("مرحله ۱ — ساخت بات:")
add_bullet("در Bale، به @botfather پیام بدید: /newbot")
add_bullet("نام بات (مثلاً: Ehsan Site Bot)")
add_bullet("username (مثلاً: ehsan_site_bot)")
add_bullet("Bot Token رو کپی کنید")

add_para("مرحله ۲ — گرفتن Chat ID:")
add_bullet("به بات خودتون یه پیام بدید")
add_bullet("به این آدرس برید (با جایگزینی TOKEN):")
add_code("https://api.bale.ai/v1/bots<TOKEN>/getUpdates")
add_bullet("در پاسخ، chat.id رو پیدا کنید")

add_para("مرحله ۳ — تنظیم در پنل:")
add_bullet("پنل → تنظیمات → بخش Bale")
add_bullet("Bot Token و Chat ID رو وارد کنید")
add_bullet("ذخیره رو بزنید")

add_para("مرحله ۴ — تنظیم Webhook:")
add_para("برای اینکه بات بتونه پاسخ بده:")
add_code("curl https://api.bale.ai/v1/bots<TOKEN>/setWebhook \\\n  -d 'url=https://ehsanmorad.ir/api/bale/webhook?secret=YOUR_WEBHOOK_SECRET'")
add_para("WEBHOOK_SECRET رو install.sh بهتون داده. توی فایل .env هست.")

add_heading("راه‌اندازی Telegram Bot", level=2)
add_para("مشابه Bale:")
add_bullet("در Telegram به @BotFather پیام بدید: /newbot")
add_bullet("Bot Token رو بگیرید")
add_bullet("Chat ID خودتون رو بگیرید")
add_bullet("در پنل → تنظیمات → بخش Telegram وارد کنید")
add_bullet("Webhook رو ست کنید:")
add_code("curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://ehsanmorad.ir/api/telegram/webhook?secret=YOUR_TG_SECRET")

add_heading("ایمیل فوروارد", level=2)
add_para("از formsubmit.co استفاده می‌شه — رایگان!")
add_bullet("ایمیل خودتون رو در پنل → تنظیمات → ایمیل فوروارد وارد کنید")
add_bullet("ذخیره رو بزنید")
add_para("اولین باری که یه پیام جدید میاد:")
add_bullet("formsubmit.co یه ایمیل تأیید به شما می‌فرسته")
add_bullet("روی لینک تأیید کلیک کنید")
add_bullet("از اون به بعد، همه پیام‌ها به ایمیل شما فوروارد می‌شن")

doc.add_page_break()

# ============================================================================
# فصل ۱۰
# ============================================================================
add_heading("فصل ۱۰ — امنیت و ممیزی", level=1)

add_heading("قابلیت‌های امنیتی V17.2", level=2)

add_heading("احراز هویت", level=3)
add_bullet("Session cookie با HMAC-SHA256")
add_bullet("Cookie flags: HttpOnly + Secure + SameSite=Strict")
add_bullet(" bcrypt با salt rounds=10 برای هش رمز")
add_bullet("timingSafeEqual برای مقایسه امضا (جلوگیری از timing attack)")
add_bullet("SESSION_SECRET قوی (openssl rand -hex 32) + entropy check")

add_heading("محافظت در برابر حملات", level=3)
add_bullet("Authentication bypass — رفع شد")
add_bullet("CSRF protection با Origin header check در middleware")
add_bullet("Rate limit: login 5/15min، contact/chat 8/15min")
add_bullet("Body size limit: 1MB")
add_bullet("XSS prevention: nav href + tutorial embedUrl + book/article link scheme validation")
add_bullet("sanitize-embed.ts برای کلیپ‌های آپارات")
add_bullet("SQL injection — Prisma parameterized queries")
add_bullet("Path traversal — نداریم (هیچ file upload نیست)")

add_heading("Security Headers", level=3)
add_bullet("Content-Security-Policy (CSP)")
add_bullet("X-Frame-Options: DENY")
add_bullet("X-Content-Type-Options: nosniff")
add_bullet("Referrer-Policy: strict-origin-when-cross-origin")
add_bullet("Permissions-Policy: camera/mic/geolocation/payment=()")
add_bullet("X-XSS-Protection: 0")
add_bullet("X-Powered-By: مخفی")
add_bullet("HSTS (روی HTTPS)")
add_bullet("frame-ancestors: 'none'")

add_heading("reCAPTCHA + Honeypot + Time-trap", level=3)
add_bullet("reCAPTCHA v2 اجباری + fail-closed")
add_bullet("Honeypot: فیلد مخفی «website» — بات‌ها پر می‌کنن")
add_bullet("Time-trap: اگه زیر ۲ ثانیه submit بشه، رد می‌شه")
add_bullet("Rate limit: ۳ پیام در ۱۰ دقیقه برای هر IP")

add_heading("Webhook Security", level=3)
add_bullet("BALE_WEBHOOK_SECRET و TELEGRAM_WEBHOOK_SECRET اجباری")
add_bullet("مقایسه با timingSafeEqual (نه ===)")
add_bullet("Secret می‌تونه در URL یا هدر X-Webhook-Secret باشه")

add_heading("Server Hardening", level=3)
add_bullet("systemd با user غیر root (ehsansite)")
add_bullet(".env با chmod 600")
add_bullet("db/custom.db با chmod 600")
add_bullet("NoNewPrivileges در systemd")
add_bullet("ProtectSystem=full")
add_bullet("PrivateTmp=true")
add_bullet("UFW firewall فعال")

add_heading("۲۰ ممیزی parallel", level=2)
add_para("در V17.2، ۲۰ worker parallel اجرا شد تا همه جنبه‌های امنیتی چک بشه:")
add_bullet("auth bypass")
add_bullet("XSS")
add_bullet("SQL/injection")
add_bullet("rate limit")
add_bullet("secrets")
add_bullet("panel UI")
add_bullet("completeness")
add_bullet("TypeScript")
add_bullet("Next config")
add_bullet("session")
add_bullet("data validation")
add_bullet("user mgmt")
add_bullet("CSRF")
add_bullet("headers")
add_bullet("settings")
add_bullet("chat/messages")
add_bullet("install scripts")
add_bullet("i18n")
add_bullet("prisma")
add_bullet("integration")

doc.add_page_break()

# ============================================================================
# فصل ۱۱
# ============================================================================
add_heading("فصل ۱۱ — رفع مشکل (Troubleshooting)", level=1)

add_heading("سایت بالا نمیاد", level=2)
add_code("sudo systemctl status personal-site\nsudo journalctl -u personal-site -n 50")

add_heading("خطای 502 Bad Gateway", level=2)
add_para("احتمالاً Node.js بالا نیومده:")
add_code("sudo systemctl restart personal-site\nsleep 3\ncurl http://localhost:3000")

add_heading("Login کار نمی‌کنه", level=2)
add_para("چک کنید:")
add_bullet("Cookie secure=true فقط روی HTTPS کار می‌کنه")
add_bullet("اگه HTTP هستید، باید NODE_ENV=development ست کنید")
add_bullet("یا HTTPS رو فعال کنید")

add_heading("reCAPTCHA کار نمی‌کنه", level=2)
add_bullet("چک کنید کلیدها در .env ست شده باشن")
add_bullet("چک کنید دامنه در Google reCAPTCHA admin ثبت شده باشه")
add_bullet("CSP باید google.com رو در frame-src اجازه بده")

add_heading("Bale/Telegram اعلان نمیاد", level=2)
add_bullet("چک کنید bot token و chat ID درست باشن")
add_bullet("Webhook URL رو تست کنید:")
add_code("curl https://api.bale.ai/v1/bots<TOKEN>/getWebhookInfo")
add_bullet("اگه webhook ست نیست، با curl ست کنید")

add_heading("پنل ادمین 401 می‌ده", level=2)
add_bullet("Session منقضی شده — دوباره login کنید")
add_bullet("Cookie پاک شد — cookie‌های سایت رو پاک کنید")
add_bullet("اگه SESSION_SECRET عوض شده، همه session‌ها باطل می‌شن")

add_heading("ریست رمز ادمین (اگه فراموش کردید)", level=2)
add_code("cd /home/ehsan/personal-site  # یا مسیر نصب\nsudo bash scripts/reset-admin-password.sh")
add_para("این اسکریپت رمز رو به admin123 برمی‌گردونه. حتماً بعداً عوضش کنید!")

add_heading("دیتابیس خراب شد", level=2)
add_para("بکاپ بگیرید:")
add_code("cp db/custom.db db/custom.db.bak.$(date +%Y%m%d)")
add_para("ریست:")
add_code("systemctl stop personal-site\nrm db/custom.db\npython3 scripts/seed_content.py\npython3 scripts/seed_equipment.py\npython3 scripts/seed_texts.py\npython3 scripts/seed_access_users.py\nsystemctl start personal-site")

doc.add_page_break()

# ============================================================================
# فصل ۱۲
# ============================================================================
add_heading("فصل ۱۲ — Appendix — دستورات مفید", level=1)

add_heading("دستورات systemd", level=2)
add_code("# وضعیت سرویس\nsudo systemctl status personal-site\n\n# restart\nsudo systemctl restart personal-site\n\n# stop/start\nsudo systemctl stop personal-site\nsudo systemctl start personal-site\n\n# لاگ‌های زنده\nsudo journalctl -u personal-site -f\n\n# لاگ‌های ۱۰۰ خط آخر\nsudo journalctl -u personal-site -n 100")

add_heading("دستورات Nginx", level=2)
add_code("# تست config\nsudo nginx -t\n\n# reload\nsudo systemctl reload nginx\n\n# لاگ‌های دسترسی\nsudo tail -f /var/log/nginx/access.log\n\n# لاگ‌های خطا\nsudo tail -f /var/log/nginx/error.log")

add_heading("دستورات دیتابیس", level=2)
add_code("# ورود به SQLite\nsqlite3 /home/ehsan/personal-site/db/custom.db\n\n# لیست جداول\n.tables\n\n# تعداد کاربران\nSELECT count(*) FROM AccessUser;\n\n# لیست ادمین‌ها\nSELECT id, username, displayName FROM AccessUser WHERE role='admin';\n\n# تعداد پیام‌های تماس\nSELECT count(*) FROM ContactMessage;\n\n# خروج (exit)\n.quit")

add_heading("دستورات امنیتی", level=2)
add_code("# وضعیت فایروال\nsudo ufw status verbose\n\n# پورت‌های باز\nsudo ss -tulpn | grep LISTEN\n\n# اتصالات فعال\nsudo netstat -an | grep ESTABLISHED\n\n# عملیات‌های اخیر\nsudo last -n 20\n\n# بکاپ‌گیری\nsudo tar -czf /tmp/site-backup-$(date +%Y%m%d).tar.gz \\\n  --exclude='node_modules' \\\n  --exclude='.next' \\\n  /home/ehsan/personal-site/")

add_heading("دستورات SSL/HTTPS", level=2)
add_code("# وضعیت certificate\nsudo certbot certificates\n\n# تمدید دستی\nsudo certbot renew --dry-run\n\n# certificate جدید\nsudo certbot --nginx -d ehsanmorad.ir -d www.ehsanmorad.ir")

add_heading("فایل‌های مهم", level=2)
add_bullet("/home/ehsan/personal-site/.env — متغیرهای محیطی (محرم)")
add_bullet("/home/ehsan/personal-site/db/custom.db — دیتابیس")
add_bullet("/home/ehsan/personal-site/install.sh — اسکریپت نصب")
add_bullet("/etc/systemd/system/personal-site.service — تنظیمات سرویس")
add_bullet("/etc/nginx/sites-available/nginx-ehsanmorad.conf — تنظیمات Nginx")

add_heading("متغیرهای محیطی (.env)", level=2)
add_code("# نمونه\nDATABASE_URL=\"file:/home/ehsan/personal-site/db/custom.db\"\nNODE_ENV=\"production\"\nPORT=3000\nHOSTNAME=\"0.0.0.0\"\nSESSION_SECRET=\"<openssl rand -hex 32>\"\nNEXT_PUBLIC_SITE_URL=\"https://ehsanmorad.ir\"\nRECAPTCHA_SECRET=\"<your-recaptcha-secret>\"\nNEXT_PUBLIC_RECAPTCHA_SITEKEY=\"<your-recaptcha-sitekey>\"\nBALE_WEBHOOK_SECRET=\"<random-hex>\"\nTELEGRAM_WEBHOOK_SECRET=\"<random-hex>\"")

# ============================================================================
# ذخیره
# ============================================================================
doc.save(OUTPUT)
print(f"✅ Document saved to: {OUTPUT}")
print(f"   Size: {os.path.getsize(OUTPUT) / 1024:.1f} KB")
