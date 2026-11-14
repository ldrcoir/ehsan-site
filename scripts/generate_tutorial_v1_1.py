#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_tutorial_v1_1.py — تولید راهنمای فارسی Word برای نسخه v1.1
=================================================================

خروجی (هر دو مسیر، همزمان):
  - public/TUTORIAL_FA_1.0.docx
  - download/TUTORIAL_FA_1.0.docx

ویژگی‌ها:
  - فونت Vazirmatn (با rFonts برای eastAsia/cs)
  - راست‌چین (RTL) + bidi روی section
  - بلوکهای کد با فونت Consolas و پس‌زمینه‌ی خاکستری روشن
  - ۱۴ فصل + جلد
  - idempotent: اجرای مجدد، هر دو فایل رو بازسازی می‌کنه

استفاده:
  python3 scripts/generate_tutorial_v1_1.py
"""

import os
from pathlib import Path

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_PATHS = [
    PROJECT_ROOT / "public" / "TUTORIAL_FA_1.0.docx",
    PROJECT_ROOT / "download" / "TUTORIAL_FA_1.0.docx",
]

FONT_FA = "Vazirmatn"
FONT_CODE = "Consolas"
CODE_SHADE = "F2F2F2"   # خاکستری روشن برای بلوکهای کد

doc = Document()

# ----------------------------------------------------------------------------
# تنظیمات پایه: فونت Normal، حاشیه‌ها، RTL
# ----------------------------------------------------------------------------
style = doc.styles["Normal"]
style.font.name = FONT_FA
style.font.size = Pt(12)

_rpr = style.element.get_or_add_rPr()
_rfonts = _rpr.find(qn("w:rFonts"))
if _rfonts is None:
    _rfonts = OxmlElement("w:rFonts")
    _rpr.append(_rfonts)
_rfonts.set(qn("w:ascii"), FONT_FA)
_rfonts.set(qn("w:hAnsi"), FONT_FA)
_rfonts.set(qn("w:cs"), FONT_FA)
_rfonts.set(qn("w:eastAsia"), FONT_FA)

for section in doc.sections:
    section.left_margin = Cm(2)
    section.right_margin = Cm(2)
    section.top_margin = Cm(2)
    section.bottom_margin = Cm(2)
    # جهت RTL برای کل سند
    sect_pr = section._sectPr
    bidi = OxmlElement("w:bidi")
    sect_pr.append(bidi)


def _set_run_fonts(run, font_name):
    """ست کردن فونت برای یک run (شامل eastAsia و cs — لازم برای فارسی)"""
    run.font.name = font_name
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rPr.append(rFonts)
    rFonts.set(qn("w:ascii"), font_name)
    rFonts.set(qn("w:hAnsi"), font_name)
    rFonts.set(qn("w:cs"), font_name)
    rFonts.set(qn("w:eastAsia"), font_name)


# ----------------------------------------------------------------------------
# توابع کمکی
# ----------------------------------------------------------------------------
def add_heading(text, level=1):
    """تیتر راست‌چین با فونت فارسی"""
    h = doc.add_heading(text, level=level)
    h.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for run in h.runs:
        _set_run_fonts(run, FONT_FA)
    return h


def add_para(text, bold=False, italic=False, color=None, size=None):
    """پاراگراف راست‌چین"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    _set_run_fonts(run, FONT_FA)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = RGBColor(*color)
    if size:
        run.font.size = Pt(size)
    return p


def add_bullet(text):
    """آیتم لیست (bullet)"""
    p = doc.add_paragraph(style="List Bullet")
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run(text)
    _set_run_fonts(run, FONT_FA)
    return p


def _shaded_code_line(text):
    """یک خط کد: چپ‌چین + Consolas + پس‌زمینه‌ی خاکستری روشن"""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.right_indent = Cm(0.8)
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(text if text else " ")
    _set_run_fonts(run, FONT_CODE)
    run.font.size = Pt(10)
    # پس‌زمینه‌ی خط — روی کل پاراگراف
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), CODE_SHADE)
    pPr.append(shd)
    return p


def add_code(block):
    """بلوک کد چندخطی — هر خط یه پاراگراف سایه‌دار"""
    for line in block.strip("\n").split("\n"):
        _shaded_code_line(line.rstrip())
    # فاصله بعد از بلوک
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(2)
    return spacer


# ============================================================================
# جلد
# ============================================================================
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.paragraph_format.space_before = Pt(140)
_run = title.add_run("سایت شخصی Ehsan Morad")
_set_run_fonts(_run, FONT_FA)
_run.font.size = Pt(30)
_run.bold = True
_run.font.color.rgb = RGBColor(0, 90, 60)

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle.paragraph_format.space_before = Pt(20)
_run = subtitle.add_run("راهنمای نصب و راه‌اندازی — نسخه 1.0")
_set_run_fonts(_run, FONT_FA)
_run.font.size = Pt(17)
_run.font.color.rgb = RGBColor(70, 110, 90)

meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.paragraph_format.space_before = Pt(160)
_run = meta.add_run("نسخه: 1.1\nپنل ادمین ۱۲ تبی — چت AI — ۳ زبان — PWA")
_set_run_fonts(_run, FONT_FA)
_run.font.size = Pt(12)
_run.font.color.rgb = RGBColor(90, 90, 90)

doc.add_page_break()

# ============================================================================
# ۱. مقدمه و قابلیت‌ها
# ============================================================================
add_heading("۱. مقدمه و قابلیت‌ها", 1)
add_para(
    "این سند، راهنمای کامل نصب و مدیریت «سایت شخصی Ehsan Morad» نسخه 1.0 هست. "
    "همه‌چیز از یک پکیج آماده نصب می‌شه — بدون نیاز به npm install یا build روی سرور."
)
add_para("قابلیت‌های اصلی:", bold=True)
add_bullet("پنل ادمین با ۱۲ تب (داشبورد، پیام‌ها، چت‌ها، محتوا، متن‌ها، منو، تم‌ها، کاربران، کلیپ‌ها، فونت، آمار، تنظیمات)")
add_bullet("چت AI با ۵ ارائه‌دهنده + پشتیبانی Ollama محلی (بدون هزینه)")
add_bullet("۳ زبان: فارسی (RTL)، English، Deutsch")
add_bullet("PWA — نصب روی موبایل + آیکون")
add_bullet("RSS و sitemap.xml خودکار")
add_bullet("بک‌آپ خودکار شبانه (هر شب ۳ بامداد، نگه‌داری ۷ نسخه)")
add_bullet("لایه‌های امنیتی چندگانه (bcrypt، HMAC، CSRF، rate limit، reCAPTCHA و …)")

# ============================================================================
# ۲. پیش‌نیازها
# ============================================================================
add_heading("۲. پیش‌نیازها", 1)
add_bullet("سرور Ubuntu 22.04 یا 24.04 (VPS)")
add_bullet("حداقل ۱ گیگابایت RAM (install.sh خودش swap می‌سازه)")
add_bullet("دسترسی root (یا sudo)")
# v1.1.1 (audit P6): متن پورت اصلاح شد — پورت 3000 فقط داخل سرور است؛ nginx پورت 80 جلو است
add_bullet("پورت‌های 80 و 443 باز (بازدیدکنندگان از nginx وارد می‌شن؛ app فقط روی 127.0.0.1:3000 گوش می‌ده)")
add_bullet("یک دامنه (اختیاری — برای HTTPS و reCAPTCHA)")
add_para("نکته: اگر دامنه ندارید، سایت با IP و HTTP کار می‌کنه؛ بعداً همیشه می‌تونید دامنه اضافه کنید.")

# ============================================================================
# ۳. نصب سریع
# ============================================================================
add_heading("۳. نصب سریع", 1)
add_para("روی سرور تازه، فقط این چهار دستور رو بزنید:")
add_code(
    """
wget https://github.com/ldrcoir/ehsan-site/raw/main/public/install-v1.1.zip
unzip install-v1.1.zip
cd personal-site
sudo ./install.sh
"""
)
add_para(
    "⚠️ مهم: installer موقع نصب، یک «رمز تصادفی» برای ادمین تولید می‌کنه و "
    "فقط «یک بار» روی صفحه چاپ می‌شه — همان لحظه یادداشتش کنید!",
    bold=True
)
add_para("install.sh خودش این کارها رو انجام می‌ده: swap، Node.js، Nginx، فایروال، "
         "دیتابیس، systemd (با user غیر root)، cron بک‌آپ شبانه، و اگر دامنه ست شده "
         "باشه، HTTPS با certbot.")

# ============================================================================
# ۴. ورود ادمین و تغییر رمز
# ============================================================================
add_heading("۴. ورود ادمین و تغییر رمز", 1)
# v1.1.1 (audit P6): آدرس پورت 3000 → پورت 80 (nginx) — 3000 فایروال‌شده و loopback است
add_para("بعد از نصب، به این آدرس برید (پورت 80 — nginx جلوی سایت است):")
add_code("http://YOUR_IP/user-login")
add_bullet("username: admin")
add_bullet("password: همان رمز تصادفی که install.sh چاپ کرد")
add_para("اگر رمز را همان لحظه ندیده‌اید، روی سرور این فایل را بخوانید (فقط root):")
add_code("sudo cat /path/to/personal-site/db/.admin-initial-password.txt")
add_para("بعد از اولین ورود، حتماً رمز رو عوض کنید:", bold=True)
add_para("پنل → تب «تنظیمات» → بخش Password → رمز جدید (حداقل ۱۲ کاراکتر — نیاز به current password داره).")
add_para("اگر رمز رو فراموش کردید، روی سرور این رو اجرا کنید:")
add_code("sudo bash scripts/reset-admin-password.sh")
add_para("این اسکریپت یک رمز تصادفی جدید می‌سازه و فقط یک بار چاپش می‌کنه.")

# ============================================================================
# ۵. تنظیم reCAPTCHA
# ============================================================================
add_heading("۵. تنظیم reCAPTCHA", 1)
add_para("فرم تماس بدون reCAPTCHA کار نمی‌کنه. مراحل:")
add_bullet("به https://www.google.com/recaptcha/admin بروید")
add_bullet("یک سایت جدید از نوع «reCAPTCHA v2» (Checkbox) ثبت کنید")
add_bullet("دامنه‌تون رو به سایت اضافه کنید (و بعداً دامنه‌ی جدید رو هم)")
add_bullet("Site Key و Secret Key رو بگیرید")
add_para("بعد در فایل .env روی سرور این دو خط رو پر کنید:")
add_code(
    """
# مسیر نصب هر جا که zip را باز کرده‌اید (همان پوشه‌ی install.sh)
# nano /path/to/personal-site/.env
RECAPTCHA_SECRET="<secret-key>"
NEXT_PUBLIC_RECAPTCHA_SITEKEY="<site-key>"
"""
)
add_para("و سرویس رو restart کنید:")
add_code("sudo systemctl restart personal-site")

# ============================================================================
# ۶. HTTPS با دامنه
# ============================================================================
add_heading("۶. HTTPS با دامنه", 1)
add_para("اگر دامنه دارید:")
add_bullet("تو پنل DNS، یک رکورد A از دامنه به IP سرور بزنید")
add_bullet("صبر کنید تا DNS منتشر بشه (install.sh با دستور host چکش می‌کنه — به dnsutils نیاز داره)")
add_bullet("اگر موقع نصب دامنه فعال بوده، install.sh خودش certbot رو اجرا می‌کنه")
add_para("اگر بعداً خواستید دستی فعال کنید:")
add_code(
    """
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN --redirect
"""
)
# v1.1.1 (audit P6): نام واحد systemd اصلاح شد + redirect ذکر شد
add_para("تمدید خودکار certificate هم نصب می‌شه (certbot.timer). فلگ --redirect باعث می‌شه HTTP به HTTPS ریدایرکت بشه.")

# ============================================================================
# ۷. پنل ادمین — ۱۲ تب
# ============================================================================
add_heading("۷. پنل ادمین — ۱۲ تب", 1)
# v1.1.1: آدرس ورود از طریق nginx
add_para("ورود: http://YOUR_IP/user-login → بعد از لاگین، پنل کامل باز می‌شه.")
add_bullet("داشبورد — نمای کلی و آخرین رخدادها")
add_bullet("پیام‌ها — دیدن/پاسخ/حذف پیامهای فرم تماس")
add_bullet("چت‌ها — دیدن چت‌های بازدیدکننده‌ها و جواب‌دادن بهشون (جدید در v1.1)")
add_bullet("محتوا — book / article / tutorial / skill / equipment")
add_bullet("متن‌ها — متن‌های ۳ زبان + افزودن و حذف کلیدهای جدید")
add_bullet("منو — لینک‌های ناوبار")
add_bullet("تم‌ها — تم‌های آماده + تم سفارشی (تغییرات همین لحظه اعمال می‌شن)")
add_bullet("کاربران — ساخت کاربر دسترسی با نقش/سطح دسترسی")
add_bullet("کلیپ‌ها — ویدیوهای آپارات")
add_bullet("فونت — انتخاب فونت سایت")
add_bullet("آمار — بازدیدها + رخدادهای امنیتی (جدید در v1.1)")
add_bullet("تنظیمات — همه‌چیز:")
add_para("  • Password (با current password)   • Handle", italic=False)
add_para("  • Name و Tagline در ۳ زبان   • Email forwarding")
add_para("  • Bale bot + دکمه‌ی Test   • Telegram bot + دکمه‌ی Test")
add_para("  • AI Providers (۵ ارائه‌دهنده)   • Socials (شبکه‌های اجتماعی)")
add_para("  • تم و فونت پیش‌فرض   • نمایش/عدم‌نمایش بخش‌ها (sections)")

# ============================================================================
# ۸. تنظیم AI Chat
# ============================================================================
add_heading("۸. تنظیم AI Chat", 1)
add_para("از تب «تنظیمات» بخش AI Providers، کلید هر ارائه‌دهنده رو وارد کنید "
         "(۵ ارائه‌دهنده‌ی ابری پشتیبانی می‌شه).")
add_para("برای AI کاملاً رایگان و محلی، Ollama رو روی سرور نصب کنید:")
add_code(
    """
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
"""
)
add_para("بعد در تنظیمات، provider رو روی Ollama بذارید (آدرس http://127.0.0.1:11434).")
# v1.1.1 (audit P6): AI Rules داخل تب «محتوا» است، نه تب جدا
add_para("بخش «AI Rules» داخل تب «محتوا» قواعد رو مستقیم به system prompt چت می‌فرسته — "
         "یعنی شخصیت و محدودیت‌های چت رو همین‌جا تعریف کنید. متن کامل پرامپت هم از "
         "تب «متن‌ها» با کلید ai.system_prompt قابل تغییره (خالی = پرامپت پیش‌فرض).")

# ============================================================================
# ۹. ربات‌های Bale / Telegram
# ============================================================================
add_heading("۹. ربات‌های Bale / Telegram", 1)
add_para("برای دریافت پیامهای فرم تماس تو مسنجر:")
add_bullet("تو Bale یا Telegram به BotFather پیام بدید و با /newbot یک ربات بسازید")
add_bullet("Token ربات رو کپی کنید")
add_bullet("chatId خودتون رو بگیرید (برای Telegram: @userinfobot)")
add_bullet("در پنل → تنظیمات → بخش Bale/Telegram، token و chatId رو وارد کنید")
add_bullet("با دکمه‌ی «Test» ارسال رو امتحان کنید")
# v1.1.1 (audit P6): webhook خودکار ست نمی‌شود — دستی با هدر secret
add_para("Webhook باید دستی ثبت بشه (یک بار):")
add_code(
    """
curl -X POST "https://api.bale.ai/v1/bots<BOT_TOKEN>/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://YOUR_DOMAIN/api/bale/webhook"}'

# Secret فقط با هدر ارسال می‌شه (تو .env هست):
#   x-webhook-secret: <BALE_WEBHOOK_SECRET از .env>
"""
)
add_para("برای Telegram هم مشابه با آدرس api.telegram.org و مسیر /api/telegram/webhook.")

# ============================================================================
# ۱۰. مدیریت کاربران دسترسی
# ============================================================================
add_heading("۱۰. مدیریت کاربران دسترسی", 1)
add_para("از تب «کاربران» می‌تونید برای افراد دیگه حساب بسازید:")
add_bullet("نقش (role) و سطح دسترسی به بخش‌ها (permissions)")
add_bullet("ساعات مجاز ورود (hours) و روزهای مجاز (days)")
add_bullet("تاریخ انقضا (expiry) — بعد از اون حساب غیرفعال می‌شه")
add_bullet("فعال/غیرفعال کردن دستی + دیدن لاگ ورودها")

# ============================================================================
# ۱۱. انتقال سایت به سرور دیگر
# ============================================================================
add_heading("۱۱. انتقال سایت به سرور دیگر", 1)
add_para("روی سرور قدیمی (سرویس می‌تونه روشن بمونه):")
add_code("bash scripts/export-site.sh")
add_para("خروجی: ~/site-migration-<timestamp>.tar.gz (snapshot دیتابیس + .env + بک‌آپ‌ها)")
add_para("کپی به سرور جدید:")
add_code("scp ~/site-migration-*.tar.gz root@NEW_SERVER_IP:/root/")
add_para("روی سرور جدید — اول نصب تمیز، بعد import:")
add_code(
    """
wget https://github.com/ldrcoir/ehsan-site/raw/main/public/install-v1.1.zip
unzip install-v1.1.zip && cd personal-site
sudo ./install.sh
sudo bash scripts/import-site.sh /root/site-migration-<timestamp>.tar.gz
"""
)
add_para("import-site.sh دیتابیس رو نصب می‌کنه، .env رو MERGE می‌کنه "
         "(DATABASE_URL جدید می‌مونه؛ secretها و tokenهای قدیمی برمی‌گردن)، "
         "schema رو heal می‌کنه و سرویس رو بالا میاره.")
add_para("چک‌لیست بعد از مهاجرت:", bold=True)
add_bullet("Webhookهای Bale/Telegram رو برای دامنه‌ی جدید ثبت کنید (setWebhook)")
add_bullet("sudo certbot --nginx -d YOUR_DOMAIN")
add_bullet("دامنه‌ی جدید رو تو console گوگل reCAPTCHA اضافه کنید")
add_bullet("تست فرم تماس و چت AI")

# ============================================================================
# ۱۲. بک‌آپ خودکار
# ============================================================================
add_heading("۱۲. بک‌آپ خودکار", 1)
add_para("install.sh یک cron نصب می‌کنه:")
add_code(
    """
# /etc/cron.d/personal-site-backup
# مسیر نصب هر جا که zip را باز کرده‌اید (install.sh خودش مسیر واقعی را می‌نویسد)
0 3 * * * root cd /path/to/personal-site && bash scripts/auto-backup.sh \\
  >> /var/log/personal-site-backup.log 2>&1
"""
)
add_bullet("هر شب ساعت ۳ بامداد اجرا می‌شه")
add_bullet("snapshot با sqlite3 .backup — سرویس روشن می‌مونه")
add_bullet("خروجی: backups/db_*.db.gz با نگه‌داری ۷ نسخه‌ی آخر")
add_bullet("پرمیشن فایلهای بک‌آپ: 600")
# v1.1.1 (audit S6-M3): retention جدید
add_bullet("حذف خودکار لاگ‌های قدیمی‌تر از ۳۰ روز (PageView/SecurityLog/AccessLog) — جلوگیری از پر شدن دیسک")
add_para("بازیابی دستی: فایل .gz رو باز کنید و به db/custom.db برگردونید "
         "(سرویس رو اول stop کنید).")

# ============================================================================
# ۱۳. امنیت
# ============================================================================
add_heading("۱۳. امنیت", 1)
add_para("لایه‌های امنیتی v1.1:")
add_bullet("هش رمز با bcrypt (cost 10) — هیچ رمز پیش‌فرضی وجود نداره")
add_bullet("session با امضای HMAC-SHA256 + مقایسه‌های timing-safe")
add_bullet("محافظت CSRF (Origin check در middleware)")
add_bullet("rate limit روی login و فرمها + سقف حجم body")
add_bullet("reCAPTCHA اجباری (fail-closed) + honeypot + time-trap")
add_bullet("محافظت SSRF (بلاک IPv6 و redirect-bypass)")
add_bullet("پاک‌سازی XSS (sanitize — مخصوصاً iframeها)")
add_bullet("IP blocking — بلاک واقعاً اعمال می‌شه")
add_bullet("security headers کامل (CSP، HSTS، X-Frame-Options و …)")
add_bullet("no-store روی صفحات داینامیک/admin")
add_bullet("systemd با user غیر root (ehsansite) + NoNewPrivileges")
add_bullet("chmod 600 روی .env، دیتابیس و بک‌آپ‌ها")

# ============================================================================
# ۱۴. رفع اشکال
# ============================================================================
add_heading("۱۴. رفع اشکال", 1)
add_para("سایت بالا نیومد؟ به این ترتیب چک کنید:")
add_code(
    """
systemctl status personal-site
journalctl -u personal-site -n 30
sudo nginx -t
# پورت 3000 فقط داخل سرور است (loopback) — از بیرون nginx روی 80/443 جواب می‌دهد:
sudo ss -tlnp | grep :3000
curl -I http://127.0.0.1:3000/api/content
"""
)
add_para("رمز ادمین فراموش شده؟")
add_code("sudo bash scripts/reset-admin-password.sh")
# v1.1.1 (audit P6): list_messages.py داخل پکیج نیست — با sqlite3 مستقیم
add_para("پیامها رو می‌خواید مستقیم از دیتابیس ببینید؟ (روی سرور)")
add_code(
    """
sudo sqlite3 /path/to/personal-site/db/custom.db \\
  "SELECT name, email, substr(message,1,50) FROM ContactMessage ORDER BY createdAt DESC LIMIT 10;"
"""
)
add_para("دیتابیس مشکل داره؟ schema رو heal کنید:")
add_code("python3 scripts/apply_schema.py")
add_para("اگر مشکل حل نشد، لاگ کامل رو برای بررسی نگه دارید:")
add_code("journalctl -u personal-site --since today > /tmp/site.log")

# ============================================================================
# ذخیره
# ============================================================================
for out in OUT_PATHS:
    out.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out))
    size = out.stat().st_size
    print(f"✅ saved: {out} ({size:,} bytes)")
print("done — public/ و download/ هر دو به‌روز شدن (idempotent)")
