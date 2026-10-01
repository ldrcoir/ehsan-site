#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate TUTORIAL_FA_V18.8.docx — Persian tutorial for Personal Site V18.8
"""

import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUT_PATH = "/home/z/my-project/public/TUTORIAL_FA_V18.8.docx"
OUT_PATH_DOWNLOAD = "/home/z/my-project/download/TUTORIAL_FA_V18.8.docx"

FONT_FA = "Vazirmatn"
FONT_FALLBACK = "Calibri"

# Colors
COLOR_PRIMARY = RGBColor(0x14, 0xB8, 0xA6)  # teal-500
COLOR_DARK = RGBColor(0x0F, 0x17, 0x2A)     # slate-900
COLOR_MUTED = RGBColor(0x64, 0x74, 0x8B)    # slate-500
COLOR_CODE_BG = "F1F5F9"  # slate-100


def set_cell_bg(cell, color_hex):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), color_hex)
    tc_pr.append(shd)


def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = FONT_FA
        run.font.size = Pt(16 - level * 2)
        run.font.color.rgb = COLOR_PRIMARY if level == 1 else COLOR_DARK
        rPr = run._element.get_or_add_rPr()
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.append(rFonts)
        rFonts.set(qn('w:eastAsia'), FONT_FA)
        rFonts.set(qn('w:cs'), FONT_FA)
    return h


def add_para(doc, text, bold=False, italic=False, size=11):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(text)
    run.font.name = FONT_FA
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = COLOR_DARK
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.append(rFonts)
    rFonts.set(qn('w:eastAsia'), FONT_FA)
    rFonts.set(qn('w:cs'), FONT_FA)
    return p


def add_code(doc, code_text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    # Add shading
    pPr = p._element.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), COLOR_CODE_BG)
    pPr.append(shd)
    run = p.add_run(code_text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    run.font.color.rgb = COLOR_DARK
    run.font.bold = False
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(3)
    run = p.add_run(text)
    run.font.name = FONT_FA
    run.font.size = Pt(11)
    run.font.color.rgb = COLOR_DARK


def build_tutorial():
    doc = Document()

    # Set default font
    style = doc.styles['Normal']
    style.font.name = FONT_FA
    style.font.size = Pt(11)

    # Page margins
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2)
        section.right_margin = Cm(2)

    # ===== Cover =====
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_before = Pt(120)
    run = title.add_run("سایت شخصی Ehsan Morad")
    run.font.name = FONT_FA
    run.font.size = Pt(28)
    run.font.bold = True
    run.font.color.rgb = COLOR_PRIMARY

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_before = Pt(12)
    run = subtitle.add_run("راهنمای نصب و راه‌اندازی — نسخه V18.8")
    run.font.name = FONT_FA
    run.font.size = Pt(16)
    run.font.color.rgb = COLOR_DARK

    date_p = doc.add_paragraph()
    date_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    date_p.paragraph_format.space_before = Pt(6)
    run = date_p.add_run("۱۰ مهر ۱۴۰۵ — ۱ اکتبر ۲۰۲۶")
    run.font.name = FONT_FA
    run.font.size = Pt(12)
    run.font.color.rgb = COLOR_MUTED

    doc.add_page_break()

    # ===== Table of Contents =====
    add_heading(doc, "فهرست مطالب", level=1)
    add_para(doc, "این آموزش شامل ۱۲ فصل است:")
    chapters = [
        "۱. مقدمه و قابلیت‌ها",
        "۲. پیش‌نیازها",
        "۳. نصب سریع (یک دستور)",
        "۴. ورود ادمین و تغییر رمز",
        "۵. تنظیم reCAPTCHA",
        "۶. تنظیم HTTPS با دامنه",
        "۷. پنل ادمین — معرفی ۱۰ تب",
        "۸. تنظیم AI Chat (OpenAI / Anthropic / Groq / Ollama)",
        "۹. تنظیم Bale Bot و Telegram Bot",
        "۱۰. مدیریت کاربران دسترسی",
        "۱۱. بک‌آپ خودکار و ریست رمز",
        "۱۲. امنیت و رفع اشکال",
    ]
    for c in chapters:
        add_bullet(doc, c)

    doc.add_page_break()

    # ===== Chapter 1 =====
    add_heading(doc, "۱. مقدمه و قابلیت‌ها", level=1)
    add_para(doc,
        "این سایت یک پلتفرم شخصی کامل برای نمایش رزومه، مقالات، کلیپ‌ها، "
        "آزمایشگاه تعاملی و چت AI است. تمام بخش‌ها از یک پنل ادمین مدیریت می‌شود "
        "و هیچ دانش فنی لازم نیست. سایت با Next.js 16 ساخته شده و به‌صورت standalone "
        "روی VPS اجرا می‌شود — بدون نیاز به npm install روی سرور."
    )
    add_para(doc, "قابلیت‌های اصلی:", bold=True)
    add_bullet(doc, "صفحه اصلی با تم ترمینال/RF و افکت ماتریکسی")
    add_bullet(doc, "آزمایشگاه تعاملی: اسیلوسکوپ، ژنراتور سیگنال، رک تجهیزات")
    add_bullet(doc, "چت AI با ۵ provider (OpenAI، Anthropic، Groq، OpenRouter، Ollama)")
    add_bullet(doc, "فرم تماس با reCAPTCHA + honeypot + time-trap")
    add_bullet(doc, "پنل ادمین کامل با ۱۰ تب")
    add_bullet(doc, "پشتیبانی از ۳ زبان (فارسی، انگلیسی، آلمانی)")
    add_bullet(doc, "PWA (نصب روی موبایل + آفلاین)")
    add_bullet(doc, "RSS Feed + Sitemap + SEO کامل")
    add_bullet(doc, "بک‌آپ خودکار هر شب")

    # ===== Chapter 2 =====
    add_heading(doc, "۲. پیش‌نیازها", level=1)
    add_para(doc, "برای نصب سایت به موارد زیر نیاز دارید:")
    add_bullet(doc, "VPS با Ubuntu 22.04 یا 24.04 (حداقل ۱GB RAM)")
    add_bullet(doc, "دسترسی root (sudo)")
    add_bullet(doc, "یک دامنه (اختیاری — برای HTTPS)")
    add_bullet(doc, "پورت ۳۰۰۰ باز در فایروال")

    # ===== Chapter 3 =====
    add_heading(doc, "۳. نصب سریع (یک دستور)", level=1)
    add_para(doc, "کافیست دستورات زیر را به ترتیب اجرا کنید:")
    add_code(doc,
        "wget https://github.com/ldrcoir/ehsan-site-private/raw/main/public/install-v18.8.zip\n"
        "unzip install-v18.8.zip\n"
        "cd personal-site\n"
        "sudo ./install.sh"
    )
    add_para(doc,
        "اسکریپت install.sh به‌صورت خودکار کارهای زیر را انجام می‌دهد:"
    )
    add_bullet(doc, "نصب Node.js 22 (اگه نصب نیست)")
    add_bullet(doc, "نصب SQLite3 و nginx")
    add_bullet(doc, "ساخت دیتابیس با ۲۹ جدول")
    add_bullet(doc, "ساخت کاربر admin با رمز تصادفی ۱۶ کاراکتری")
    add_bullet(doc, "تولید SESSION_SECRET و Webhook secrets با openssl")
    add_bullet(doc, "تنظیم systemd با user غیر root (ehsansite)")
    add_bullet(doc, "تنظیم فایروال (ufw)")
    add_bullet(doc, "تنظیم nginx به‌عنوان reverse proxy")
    add_bullet(doc, "تنظیم HTTPS با certbot (اگه دامنه ست شده)")
    add_para(doc,
        "بعد از اتمام نصب، رمز ادمین روی صفحه چاپ می‌شود. حتماً آن را ذخیره کنید "
        "چون دوباره نمایش داده نمی‌شود."
    )

    # ===== Chapter 4 =====
    add_heading(doc, "۴. ورود ادمین و تغییر رمز", level=1)
    add_para(doc, "بعد از نصب، به آدرس زیر بروید:")
    add_code(doc, "http://YOUR_IP:3000/user-login")
    add_para(doc, "اطلاعات ورود:")
    add_bullet(doc, "username: admin")
    add_bullet(doc, "password: (رمزی که install.sh چاپ کرد)")
    add_para(doc,
        "بعد از اولین ورود، حتماً رمز را عوض کنید:", bold=True
    )
    add_para(doc, "۱. به پنل ادمین → تنظیمات بروید")
    add_para(doc, "۲. روی تب «رمز عبور» کلیک کنید")
    add_para(doc, "۳. رمز فعلی را وارد کنید")
    add_para(doc, "۴. رمز جدید (حداقل ۸ کاراکتر) را وارد کنید")
    add_para(doc, "۵. روی «ذخیره» کلیک کنید")

    # ===== Chapter 5 =====
    add_heading(doc, "۵. تنظیم reCAPTCHA", level=1)
    add_para(doc,
        "برای جلوگیری از اسپم در فرم تماس، reCAPTCHA v2 اجباری است."
    )
    add_para(doc, "مراحل:")
    add_para(doc, "۱. به https://www.google.com/recaptcha/admin بروید")
    add_para(doc, "۲. سایت v2 ثبت کنید (دامنه خود را وارد کنید)")
    add_para(doc, "۳. Site Key و Secret Key را کپی کنید")
    add_para(doc, "۴. در سرور، فایل .env را ویرایش کنید:")
    add_code(doc, "sudo nano /home/ehsan/personal-site/.env")
    add_para(doc, "۵. مقادیر زیر را تنظیم کنید:")
    add_code(doc,
        "RECAPTCHA_SITE_KEY=your_site_key_here\n"
        "RECAPTCHA_SECRET_KEY=your_secret_key_here"
    )
    add_para(doc, "۶. سرویس را ری‌استارت کنید:")
    add_code(doc, "sudo systemctl restart personal-site")

    # ===== Chapter 6 =====
    add_heading(doc, "۶. تنظیم HTTPS با دامنه", level=1)
    add_para(doc,
        "اگر دامنه دارید، install.sh به‌صورت خودکار HTTPS را با certbot تنظیم می‌کند. "
        "کافیست قبل از نصب، DNS دامنه را به IP سرور اشاره دهید."
    )
    add_para(doc, "اگر بعد از نصب می‌خواهید HTTPS را اضافه کنید:")
    add_code(doc,
        "sudo certbot --nginx -d ehsanmorad.ir -d www.ehsanmorad.ir\n"
        "sudo systemctl reload nginx"
    )
    add_para(doc, "بعد از تنظیم HTTPS، HSTS به‌صورت خودکار فعال می‌شود.")

    # ===== Chapter 7 =====
    add_heading(doc, "۷. پنل ادمین — معرفی ۱۰ تب", level=1)
    add_para(doc, "پنل ادمین شامل ۱۰ تب است:")
    add_bullet(doc, "داشبورد: آمار بازدید، پیام‌ها، کاربران")
    add_bullet(doc, "پیام‌ها: مدیریت پیام‌های فرم تماس (reply/delete)")
    add_bullet(doc, "محتوا: CRUD کتاب، مقاله، آموزش، مهارت، تجهیزات")
    add_bullet(doc, "متن‌ها: ویرایش ۳۶ متن در ۳ زبان")
    add_bullet(doc, "منو: مدیریت لینک‌های ناوبری")
    add_bullet(doc, "تم‌ها: ۷ تم آماده + تم‌ساز")
    add_bullet(doc, "کاربران: access control + permissions + hours/days")
    add_bullet(doc, "کلیپ‌ها: مدیریت کلیپ‌های آپارات")
    add_bullet(doc, "فونت: انتخاب از ۵ فونت")
    add_bullet(doc, "تنظیمات: password، handle، name×3، tagline×3، email، bale، telegram، AI providers، font، lang")

    # ===== Chapter 8 =====
    add_heading(doc, "۸. تنظیم AI Chat", level=1)
    add_para(doc,
        "سایت از ۵ ارائه‌دهنده AI پشتیبانی می‌کند. می‌توانید یکی یا چند تا را فعال کنید. "
        "اگه یکی fail شد، به‌صورت خودکار بعدی امتحان می‌شود (fallback chain)."
    )
    add_para(doc, "ارائه‌دهنده‌ها:", bold=True)
    add_bullet(doc, "OpenAI (gpt-4o-mini) — به API key نیاز داره")
    add_bullet(doc, "Anthropic (claude-3.5-sonnet) — به API key نیاز داره")
    add_bullet(doc, "Groq (llama-3.3-70b) — رایگان با API key از console.groq.com")
    add_bullet(doc, "OpenRouter (qwen-2.5-72b) — به API key نیاز داره")
    add_bullet(doc, "Ollama (llama3.2) — محلی، بدون API key")
    add_para(doc, "مراحل تنظیم:")
    add_para(doc, "۱. به پنل ادمین → تنظیمات → AI Providers بروید")
    add_para(doc, "۲. روی provider مورد نظر کلیک کنید")
    add_para(doc, "۳. API Key را وارد کنید (به‌صورت امن ذخیره می‌شود)")
    add_para(doc, "۴. اگر می‌خواهید فعال شود، toggle enabled را روشن کنید")
    add_para(doc, "۵. priority را تنظیم کنید (کمتر = اولویت بیشتر)")
    add_para(doc, "۶. ذخیره کنید")
    add_para(doc,
        "برای Ollama (محلی)، باید Ollama را روی سرور نصب کنید:"
    )
    add_code(doc, "curl -fsSL https://ollama.com/install.sh | sh\nollama pull llama3.2")
    add_para(doc, "بعد از نصب، Ollama روی پورت 11434 اجرا می‌شود.")

    # ===== Chapter 9 =====
    add_heading(doc, "۹. تنظیم Bale Bot و Telegram Bot", level=1)
    add_para(doc,
        "وقتی کسی از فرم تماس یا چت استفاده می‌کند، می‌توانید notification بگیرید."
    )
    add_para(doc, "Bale Bot:")
    add_para(doc, "۱. با @BotFather در Bale یک bot بسازید")
    add_para(doc, "۲. Token را کپی کنید")
    add_para(doc, "۳. chat_id خود را بگیرید (به bot پیام بدهید و از getUpdates استفاده کنید)")
    add_para(doc, "۴. به پنل ادمین → تنظیمات → Bale Bot بروید")
    add_para(doc, "۵. Token و chat_id را وارد کنید")
    add_para(doc, "۶. ذخیره کنید")
    add_para(doc, "Telegram Bot: همین مراحل با @BotFather در Telegram.")

    # ===== Chapter 10 =====
    add_heading(doc, "۱۰. مدیریت کاربران دسترسی", level=1)
    add_para(doc,
        "می‌توانید به کاربران دیگر دسترسی بدهید (مثلاً فقط پیام‌ها رو ببینن، "
        "یا فقط محتوا رو مدیریت کنن)."
    )
    add_para(doc, "مراحل:")
    add_para(doc, "۱. به پنل ادمین → کاربران بروید")
    add_para(doc, "۲. روی «افزودن کاربر» کلیک کنید")
    add_para(doc, "۳. username و رمز تصادفی را وارد کنید")
    add_para(doc, "۴. role را انتخاب کنید (admin یا user)")
    add_para(doc, "۵. اگر user است، permissions را انتخاب کنید")
    add_para(doc, "۶. می‌توانید روزها و ساعات مجاز را هم تنظیم کنید")
    add_para(doc, "۷. ذخیره کنید")

    # ===== Chapter 11 =====
    add_heading(doc, "۱۱. بک‌آپ خودکار و ریست رمز", level=1)
    add_para(doc,
        "install.sh به‌صورت خودکار یک cron job برای بک‌آپ هر شب ساعت ۳ بامداد تنظیم می‌کند. "
        "بک‌آپ‌ها در /home/ehsan/personal-site/backups/ ذخیره می‌شوند و ۷ روز نگه داشته می‌شوند."
    )
    add_para(doc, "ریست رمز ادمین (اگر فراموش کردید):", bold=True)
    add_code(doc,
        "cd /home/ehsan/personal-site\n"
        "sudo bash scripts/reset-admin-password.sh"
    )
    add_para(doc,
        "این اسکریپت یک رمز تصادفی ۱۶ کاراکتری جدید تولید می‌کند و آن را روی صفحه چاپ می‌کند. "
        "حتماً ذخیره کنید چون دوباره نمایش داده نمی‌شود."
    )

    # ===== Chapter 12 =====
    add_heading(doc, "۱۲. امنیت و رفع اشکال", level=1)
    add_para(doc, "سایت از لایه‌های امنیتی زیر تشکیل شده:")
    add_bullet(doc, "bcrypt password hashing")
    add_bullet(doc, "HMAC-SHA256 session tokens")
    add_bullet(doc, "timing-safe comparisons (against session hijack)")
    add_bullet(doc, "rate limiting (login 5/15min, contact/chat 8/15min)")
    add_bullet(doc, "honeypot + time-trap on contact form")
    add_bullet(doc, "reCAPTCHA mandatory + fail-closed")
    add_bullet(doc, "CSRF protection (Origin check)")
    add_bullet(doc, "Body size limit 1MB")
    add_bullet(doc, "HSTS on HTTPS")
    add_bullet(doc, "CSP + security headers (X-Frame-Options, etc.)")
    add_bullet(doc, "SSRF protection on baseUrl")
    add_bullet(doc, "XFF spoofing fix (prefer x-real-ip)")
    add_bullet(doc, "Chat session ownership (visitorId mandatory)")
    add_bullet(doc, "Bot token/API key masking in all API responses")
    add_bullet(doc, "Random admin password (not hardcoded)")
    add_bullet(doc, "SESSION_SECRET entropy check + lazy-load")
    add_bullet(doc, "Cookie secure:true (production) + sameSite:strict + httpOnly")
    add_bullet(doc, "systemd با user غیر root (ehsansite)")
    add_bullet(doc, ".env با chmod 600")
    add_bullet(doc, "db با chmod 600")

    add_para(doc, "رفع اشکال:", bold=True)
    add_para(doc, "اگر سایت بالا نمی‌آید:")
    add_code(doc, "sudo systemctl status personal-site\nsudo journalctl -u personal-site -n 50")
    add_para(doc, "اگر دیتابیس مشکل دارد:")
    add_code(doc, "cd /home/ehsan/personal-site\nsqlite3 db/custom.db \".tables\"")
    add_para(doc, "اگر nginx مشکل دارد:")
    add_code(doc, "sudo nginx -t\nsudo systemctl status nginx")
    add_para(doc, "اگر پورت اشغال است:")
    add_code(doc, "sudo lsof -i :3000\nsudo kill -9 <PID>")

    add_para(doc, "")
    add_para(doc,
        "برای پشتیبانی بیشتر، به GitHub repo مراجعه کنید: "
        "https://github.com/ldrcoir/ehsan-site",
        italic=True, size=10
    )

    # Save
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(OUT_PATH_DOWNLOAD), exist_ok=True)
    doc.save(OUT_PATH)
    doc.save(OUT_PATH_DOWNLOAD)
    print(f"✅ Saved: {OUT_PATH}")
    print(f"✅ Saved: {OUT_PATH_DOWNLOAD}")
    print(f"   Size: {os.path.getsize(OUT_PATH)} bytes")


if __name__ == "__main__":
    build_tutorial()
