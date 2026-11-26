#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
تولید سه سند Word با حروف فارسی برای EMA/deployment/:
  ۰۲-راهنمای-نصب-سایت.docx              — راهنمای مفصل نصب سایت روی VPS
  ۰۳-راهنمای-وصل-هوش-مصنوعی.docx         — راهنمای تنظیم کانال امن برای وصل AI
  ۰۴-راهنمای-ایجنت-ارزان‌تر.docx         — راهنمای استفاده از ایجنت ارزان‌تر

همه متن به فارسیِ کامل (با حروف فارسی) نوشته شده است.
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUT_DIR = "/home/z/my-project/EMA/deployment"
os.makedirs(OUT_DIR, exist_ok=True)

PERSIAN_FONT = "Vazirmatn"
MONO_FONT = "DejaVu Sans Mono"

# ---- Helpers ---------------------------------------------------------------

def set_rtl(paragraph):
    """تنظیم جهت پاراگراف به راست‌چین."""
    pPr = paragraph._p.get_or_add_pPr()
    bidi = OxmlElement('w:bidi')
    bidi.set(qn('w:val'), '1')
    pPr.append(bidi)
    # تنظیم جهت هر run
    for run in paragraph.runs:
        rPr = run._r.get_or_add_rPr()
        rtl = OxmlElement('w:rtl')
        rtl.set(qn('w:val'), '1')
        rPr.append(rtl)

def add_heading(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    set_rtl(h)
    for run in h.runs:
        run.font.name = PERSIAN_FONT
        run.font.size = Pt(16 if level == 1 else 13 if level == 2 else 11)
        if level == 1:
            run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
        elif level == 2:
            run.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
        else:
            run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
    return h

def add_para(doc, text, bold=False, italic=False, size=11, color=None, align=None):
    p = doc.add_paragraph()
    if align == 'center':
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif align == 'right':
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    elif align == 'justify':
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    else:
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.5
    run = p.add_run(text)
    run.font.name = PERSIAN_FONT
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color
    set_rtl(p)
    return p

def add_code_block(doc, code_text):
    """بلوک کد با پس‌زمینه خاکستری روشن."""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.right_indent = Cm(0.5)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.line_spacing = 1.15
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F2F2F2')
    pPr.append(shd)
    run = p.add_run(code_text)
    run.font.name = MONO_FONT
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(0x10, 0x40, 0x60)
    return p

def add_bullet(doc, text, level=0):
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.4
    run = p.add_run(text)
    run.font.name = PERSIAN_FONT
    run.font.size = Pt(11)
    set_rtl(p)
    return p

def add_numbered(doc, text):
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.4
    run = p.add_run(text)
    run.font.name = PERSIAN_FONT
    run.font.size = Pt(11)
    set_rtl(p)
    return p

def add_table(doc, headers, rows, col_widths=None):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.autofit = True
    hdr_cells = table.rows[0].cells
    for i, h in enumerate(headers):
        hdr_cells[i].text = ''
        p = hdr_cells[i].paragraphs[0]
        set_rtl(p)
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(10)
        run.font.name = PERSIAN_FONT
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        tcPr = hdr_cells[i]._tc.get_or_add_tcPr()
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), '2E74B5')
        tcPr.append(shd)
    for r_idx, row in enumerate(rows):
        cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row):
            cells[c_idx].text = ''
            p = cells[c_idx].paragraphs[0]
            set_rtl(p)
            run = p.add_run(str(val))
            run.font.size = Pt(10)
            run.font.name = PERSIAN_FONT
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)
    return table

def add_page_break(doc):
    doc.add_page_break()

def add_callout(doc, title, body, color='FFF4CE'):
    """جعبه یادآوری رنگی برای نکات مهم."""
    table = doc.add_table(rows=1, cols=1)
    table.autofit = True
    cell = table.rows[0].cells[0]
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color)
    tcPr.append(shd)
    cell.text = ''
    p = cell.paragraphs[0]
    set_rtl(p)
    run = p.add_run(title + '\n')
    run.bold = True
    run.font.size = Pt(11)
    run.font.name = PERSIAN_FONT
    run.font.color.rgb = RGBColor(0xC0, 0x50, 0x00)
    run2 = p.add_run(body)
    run2.font.size = Pt(10)
    run2.font.name = PERSIAN_FONT
    doc.add_paragraph()

def setup_doc_styles(doc):
    style = doc.styles['Normal']
    style.font.name = PERSIAN_FONT
    style.font.size = Pt(11)

def add_cover(doc, title, subtitle, doc_num):
    for _ in range(4):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("EMA — سایت شخصی احسان مراد")
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    run.italic = True
    run.font.name = PERSIAN_FONT

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(title)
    run.font.size = Pt(28)
    run.bold = True
    run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
    run.font.name = PERSIAN_FONT

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(subtitle)
    run.font.size = Pt(14)
    run.font.color.rgb = RGBColor(0x2E, 0x74, 0xB5)
    run.font.name = PERSIAN_FONT

    for _ in range(2):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(doc_num)
    run.font.size = Pt(36)
    run.bold = True
    run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)
    run.font.name = PERSIAN_FONT

    for _ in range(6):
        doc.add_paragraph()

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("سایت: ehsanmorad.ir  |  سرور: 31.70.76.10  |  گیت‌هاب: ldrcoir/ehsan-site")
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    run.font.name = PERSIAN_FONT

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("نسخه ۱.۰ rev5  |  ۱۴۰۵/۰۹/۰۵")
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
    run.font.name = PERSIAN_FONT

    add_page_break(doc)


# ============================================================================
# سند ۱: راهنمای نصب سایت
# ============================================================================

def build_doc1_nasb():
    doc = Document()
    setup_doc_styles(doc)

    add_cover(doc,
              "راهنمای نصب سایت",
              "گام به گام: از سرور خالی تا سایت کامل",
              "۰۲")

    # ---- ۱. مقدمه ----
    add_heading(doc, "۱. مقدمه — این سند چه می‌گوید؟", level=1)
    add_para(doc,
        "این سند را برای شما نوشتم تا بدانید از کجا شروع کنید و چه کار کنید که سایت شخصی "
        "احسان مراد (ehsanmorad.ir) روی سرور مجازی شما بدون مشکل بالا بیاید. تمام متن با "
        "حروف فارسی نوشته شده تا هر کسی، حتی بدون کیبورد فارسی هم بتواند آن را بخواند.")

    add_para(doc,
        "سرور مجازی شما: 31.70.76.10. دامنه: ehsanmorad.ir. ریپو گیت‌هاب: "
        "github.com/ldrcoir/ehsan-site. این سه تا مهم‌ترین اطلاعات هستند که همه‌جا باید "
        "یادتان باشد.")

    add_para(doc,
        "قبل از شروع، یک نگاه کلی به آنچه انجام می‌دهیم: شما یک پکیج zip از هوش مصنوعی "
        "می‌گیرید (در پوشه 01-UPLOAD-ZIP). این zip را به سرور آپلود می‌کنید، آن را باز "
        "می‌کنید، و یک اسکریپت نصب (install.sh) را اجرا می‌کنید. این اسکریپت همه کار را "
        "خودکار انجام می‌دهد: نصب Node.js، نصب nginx، ساخت دیتابیس، تولید رمز admin، "
        "نصب سرویس systemd، و نصب بک‌آپ شبانه.")

    add_callout(doc,
        "نکته مهم:",
        "اگر سرور شما تازه است و هیچ چیزی روی آن نیست (یا قبلاً سایت نداشتید)، بک‌آپ "
        "لازم نیست. فقط zip را آپلود و نصب کنید. اگر قبلاً یک سایت روی سرور بود، اول "
        "از آن بک‌آپ بگیرید (بخش ۳).")

    # ---- ۲. پیش‌نیازها ----
    add_heading(doc, "۲. پیش‌نیازها — چیزهای لازم", level=1)
    add_para(doc, "قبل از شروع، مطمئن شوید که این چیزها را دارید:")

    add_table(doc,
        ["چیز", "توضیح", "چگونه تهیه کنم؟"],
        [
            ["سرور مجازی", "یک سرور لینوکس (Ubuntu 22.04 یا 24.04) با دسترسی root", "ssh root@31.70.76.10"],
            ["دامنه", "ehsanmorad.ir که DNS آن به IP سرور اشاره می‌کند", "Cloudflare DNS: رکورد A → 31.70.76.10"],
            ["دسترسی SSH", "نام کاربری + رمز یا کلید SSH برای root", "از لپ‌تاپ: ssh root@31.70.76.10"],
            ["فایل zip", "ehsan-site-v1.0-rev5-1405-09-05.zip", "در پوشه 01-UPLOAD-ZIP"],
            ["توکن گیت‌هاب", "Personal Access Token با دسترسی repo (برای sync)", "GitHub Settings → Developer settings"],
            ["reCAPTCHA", "Google reCAPTCHA v2 Site Key + Secret", "recaptcha.admin.google.com"],
        ],
        col_widths=[3, 6, 6])

    add_para(doc, "")

    # ---- ۳. بک‌آپ از سرور قبلی ----
    add_heading(doc, "۳. بک‌آپ از سرور قبلی (فقط اگر سایت قدیمی دارید)", level=1)
    add_para(doc,
        "اگر سرور شما خالی است (هیچ سایت قدیمی نیست)، این بخش را رد کنید و به بخش ۴ "
        "بروید. اما اگر قبلاً یک نصب سایت روی آن بود، اول از آن بک‌آپ بگیرید تا هیچ "
        "داده‌ای از دست نرود.")

    add_heading(doc, "۳.۱. بک‌آپ از فایل‌ها", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site   # یا جایی که سایت قبلاً نصب شده بود\n"
        "tar -czf /root/backup-pre-rev5-$(date +%Y%m%d).tar.gz .\n"
        "ls -lh /root/backup-pre-rev5-*.tar.gz   # مطمئن شو فایل ساخته شد")

    add_heading(doc, "۳.۲. بک‌آپ از دیتابیس", level=2)
    add_code_block(doc,
        "# روش ۱: با ابزار sqlite3 (پیشنهادی)\n"
        "sqlite3 db/site.db \".backup '/root/site-db-backup-$(date +%Y%m%d).db'\"\n"
        "ls -lh /root/site-db-backup-*.db\n\n"
        "# روش ۲: کپی ساده فایل (در حالی که سایت خاموش است)\n"
        "systemctl stop ehsan-site\n"
        "cp db/site.db /root/site-db-backup-$(date +%Y%m%d).db\n"
        "systemctl start ehsan-site")

    add_heading(doc, "۳.۳. بک‌آپ از فایل .env", level=2)
    add_code_block(doc,
        "cp /home/ehsan/personal-site/.env /root/env-backup-$(date +%Y%m%d).txt\n"
        "cat /root/env-backup-*.txt   # محتوا را ببینید و رمزها را یادداشت کنید")

    add_callout(doc,
        "هشدار:",
        "فایل .env شامل رمزهای حساس است (دیتابیس، JWT، توکن کانال نگهداری). آن را در "
        "جای امن نگه دارید و هرگز به کسی نفرستید.")

    # ---- ۴. آپلود zip ----
    add_heading(doc, "۴. آپلود فایل zip به سرور", level=1)
    add_para(doc,
        "از لپ‌تاپ خودتان، فایل zip را با scp به سرور آپلود کنید. این کار بسته به سرعت "
        "اینترنت شما ممکن است ۱ تا ۵ دقیقه طول بکشد (حجم فایل ۱۳.۸ مگابایت است).")

    add_code_block(doc,
        "# از لپ‌تاپ (نه از روی سرور):\n"
        "scp EMA/deployment/01-UPLOAD-ZIP/ehsan-site-v1.0-rev5-1405-09-05.zip \\\n"
        "    root@31.70.76.10:/root/\n\n"
        "# بعد وارد سرور شوید و مطمئن شوید فایل رسیده:\n"
        "ssh root@31.70.76.10\n"
        "ls -lh /root/ehsan-site-v1.0-rev5-1405-09-05.zip")

    add_heading(doc, "۴.۱. چرا فایل ۱۳.۸ مگابایت است؟", level=2)
    add_para(doc,
        "این حجم طبیعی است برای یک پکیج Next.js + Prisma + SQLite. حدود ۶ مگابایت آن "
        "موتور کوئری Prisma است (libquery_engine-debian-openssl-3.0.x.so.node) که "
        "الزامی است و نمی‌توان آن را حذف کرد. بقیه شامل موتور Next.js، react-dom، و "
        "فایل‌های استاتیک build شده است. این حجم برای آپلود با scp مشکلی ایجاد "
        "نمی‌کند.")

    # ---- ۵. باز کردن zip ----
    add_heading(doc, "۵. باز کردن zip روی سرور", level=1)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /root\n"
        "unzip -o ehsan-site-v1.0-rev5-1405-09-05.zip -d /home/ehsan/\n"
        "ls -la /home/ehsan/personal-site/\n"
        "cd /home/ehsan/personal-site\n"
        "cat VERSION.txt   # باید بنویسد: 1.0 rev5 1405-09-05")

    # ---- ۶. اجرای install.sh ----
    add_heading(doc, "۶. اجرای اسکریپت نصب (install.sh)", level=1)
    add_para(doc,
        "این مهم‌ترین مرحله است. اسکریپت install.sh همه کار را خودکار انجام می‌دهد: "
        "نصب Node.js، نصب nginx، ساخت دیتابیس، نصب وابستگی‌ها، تنظیم سرویس systemd، "
        "و تنظیم بک‌آپ شبانه.")

    add_heading(doc, "۶.۱. پیدا کردن IP خودتان برای لیست مجاز", level=2)
    add_para(doc,
        "قبل از اجرای install.sh، باید IP عمومی خودتان را پیدا کنید تا به لیست مجاز "
        "کانال نگهداری اضافه شود. این کار امنیت کانال را بالا می‌برد — فقط شما (و "
        "هوش مصنوعی از طرف شما) می‌توانید به کانال وصل شوید.")

    add_code_block(doc,
        "# از لپ‌تاپ خودتان (نه سرور):\n"
        "curl https://api.ipify.org\n"
        "# خروجی چیزی مثل: 91.92.93.94\n"
        "# همین عدد را یادداشت کنید")

    add_heading(doc, "۶.۲. اجرای install.sh", level=2)
    add_para(doc,
        "حالا install.sh را با دو پرچم مهم اجرا کنید: --ai-bind برای فعال‌سازی حالت "
        "AI-Bind (حتی خواندن نیاز به توکن ویرایش دارد) و --ip-allowlist برای محدود "
        "کردن کانال به IP شما.")

    add_code_block(doc,
        "cd /home/ehsan/personal-site\n"
        "chmod +x install.sh\n"
        "./install.sh --ai-bind --ip-allowlist \"91.92.93.94\"\n\n"
        "# اگر IP شما چندتایی است یا CIDR دارید:\n"
        "./install.sh --ai-bind --ip-allowlist \"91.92.93.94,92.93.94.0/24\"\n\n"
        "# اگر نمی‌خواهید لیست IP بگذارید (پیشنهاد نمی‌شود):\n"
        "./install.sh --ai-bind --no-ip-allowlist")

    add_heading(doc, "۶.۳. مراحل اجرای install.sh", level=2)
    add_table(doc,
        ["مرحله", "کاری که انجام می‌شود", "زمان تقریبی"],
        [
            ["۱", "بررسی پیش‌نیازها (Node, npm, nginx, sqlite3)", "۵ ثانیه"],
            ["۲", "نصب Node.js 20 (اگر نصب نیست)", "۳۰ ثانیه"],
            ["۳", "نصب nginx (اگر نصب نیست)", "۱۰ ثانیه"],
            ["۴", "نصب وابستگی‌های npm (از node_modules موجود در zip)", "۵ ثانیه"],
            ["۵", "ساخت دیتابیس SQLite + اجرای migration", "۵ ثانیه"],
            ["۶", "تولید رمز admin اولیه + نمایش آن", "۱ ثانیه"],
            ["۷", "تولید توکن‌های کانال نگهداری (read, edit, encryption)", "۱ ثانیه"],
            ["۸", "نصب سرویس systemd (ehsan-site.service)", "۲ ثانیه"],
            ["۹", "نصب cron بک‌آپ شبانه (هر شب ۳ بامداد)", "۱ ثانیه"],
            ["۱۰", "تنظیم nginx با SSL خودکار (Caddy یا certbot)", "۱۰ ثانیه"],
            ["۱۱", "تست health check و نمایش URL نهایی", "۵ ثانیه"],
        ],
        col_widths=[1.5, 9, 3])

    add_callout(doc,
        "مهم:",
        "در پایان اجرای install.sh، رمز admin و توکن‌های کانال نگهداری روی صفحه نمایش "
        "داده می‌شوند. این‌ها را فوراً در جای امن ذخیره کنید — دوباره نمایش داده "
        "نمی‌شوند. همچنین در فایل‌های زیر ذخیره شده‌اند:\n"
        "  /home/ehsan/personal-site/db/.admin-password.txt\n"
        "  /home/ehsan/personal-site/db/.maintenance-token.txt\n"
        "  /home/z/my-project/personal-site/db/.maintenance-edit-token.txt\n"
        "  /home/ehsan/personal-site/db/.maintenance-enc-key.txt",
        color='FFE4E1')

    # ---- ۷. ورود اول admin ----
    add_heading(doc, "۷. اولین ورود به پنل مدیریت", level=1)
    add_para(doc,
        "بعد از نصب، به آدرس سایت بروید و با رمز نمایش‌داده‌شده وارد شوید.")

    add_code_block(doc,
        "# در مرورگر:\n"
        "https://ehsanmorad.ir/admin/login\n\n"
        "# نام کاربری: admin\n"
        "# رمز: [همان که install.sh نمایش داد]\n\n"
        "# بعد از اولین ورود، حتماً رمز را عوض کنید:\n"
        "# پنل مدیریت → تنظیمات → تغییر رمز")

    # ---- ۸. تنظیم reCAPTCHA ----
    add_heading(doc, "۸. تنظیم reCAPTCHA", level=1)
    add_para(doc,
        "برای جلوگیری از اسپم در فرم‌های تماس و نظرات، باید reCAPTCHA v2 را تنظیم کنید.")

    add_code_block(doc,
        "# ۱. به https://www.google.com/recaptcha/admin بروید\n"
        "# ۲. یک سایت جدید ثبت کنید:\n"
        "#    - Label: ehsanmorad.ir\n"
        "#    - Type: reCAPTCHA v2 → I'm not a robot checkbox\n"
        "#    - Domains: ehsanmorad.ir\n"
        "# ۳. Site Key و Secret Key را بگیرید\n"
        "# ۴. روی سرور:\n"
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site\n"
        "nano .env\n"
        "# این خط‌ها را اضافه/ویرایش کنید:\n"
        "#   RECAPTCHA_SITE_KEY=6Lc...your_site_key\n"
        "#   RECAPTCHA_SECRET_KEY=6Lc...your_secret_key\n"
        "# ۵. سرویس را ری‌استارت کنید:\n"
        "systemctl restart ehsan-site")

    # ---- ۹. تنظیم بات‌ها ----
    add_heading(doc, "۹. تنظیم بات‌های بله و تلگرام (اختیاری)", level=1)
    add_para(doc,
        "اگر می‌خواهید پیام‌های تماس و نظرات به بله یا تلگرام شما هم ارسال شوند، بات "
        "تنظیم کنید.")

    add_heading(doc, "۹.۱. بات بله", level=2)
    add_code_block(doc,
        "# ۱. در بله به @botfather پیام بدهید:\n"
        "#    /newbot\n"
        "# ۲. نام و یوزرنیم بات را بدهید\n"
        "# ۳. توکن بات را بگیرید\n"
        "# ۴. chat_id خودتان را بگیرید (به بات پیام بدهید، بعد:\n"
        "#    curl https://api.bale.ai/bot<TOKEN>/getUpdates)\n"
        "# ۵. در فایل .env:\n"
        "#   BALE_BOT_TOKEN=123456:ABC...\n"
        "#   BALE_CHAT_ID=123456789\n"
        "# ۶. ری‌استارت:\n"
        "systemctl restart ehsan-site")

    add_heading(doc, "۹.۲. بات تلگرام", level=2)
    add_code_block(doc,
        "# ۱. در تلگرام به @BotFather پیام بدهید: /newbot\n"
        "# ۲. توکن و chat_id را بگیرید (مشابه بله)\n"
        "# ۳. در فایل .env:\n"
        "#   TELEGRAM_BOT_TOKEN=123456:ABC...\n"
        "#   TELEGRAM_CHAT_ID=123456789\n"
        "# ۴. ری‌استارت:\n"
        "systemctl restart ehsan-site")

    # ---- ۱۰. تست کانال ----
    add_heading(doc, "۱۰. تست کانال نگهداری", level=1)
    add_para(doc,
        "بعد از نصب، مطمئن شوید کانال نگهداری کار می‌کند. این کانال همان چیزی است که "
        "هوش مصنوعی از طریق آن به سایت وصل می‌شود تا باگ‌ها را بگیرد و تغییرات روزانه "
        "را انجام دهد.")

    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site\n\n"
        "# تست ساده — وضعیت سایت را ببینید:\n"
        "bash scripts/maintenance.sh --ai-bind status\n\n"
        "# خروجی باید چیزی مثل این باشد:\n"
        '# {"ok":true,"status":"online","version":"1.0 rev5",...}')

    add_para(doc,
        "اگر خروجی ok:true بود، کانال کار می‌کند. اگر خطای 403 یا 401 گرفتید، توکن یا "
        "IP را اشتباه وارد کرده‌اید. اگر خطای 503 گرفتید، سرویس بالا نیامده — با "
        "systemctl status ehsan-site لاگ را ببینید.")

    # ---- ۱۱. جدول خطاها ----
    add_heading(doc, "۱۱. خطاهای رایج و راه‌حل", level=1)
    add_table(doc,
        ["خطا", "علت", "راه‌حل"],
        [
            ["ECONNREFUSED در پورت 3000", "سرویس بالا نیامده", "systemctl status ehsan-site && systemctl restart ehsan-site"],
            ["502 Bad Gateway از nginx", "سرویس Next.js کرش کرده", "journalctl -u ehsan-site -n 50 — لاگ را ببینید"],
            ["403 Forbidden روی /api/maintenance", "IP در لیست مجاز نیست", "install.sh --ip-allowlist را دوباره با IP درست اجرا کنید"],
            ["401 Unauthorized روی /api/maintenance", "توکن اشتباه", "cat db/.maintenance-edit-token.txt — توکن درست را بگیرید"],
            ["SSL Certificate خطا", "certbot/Caddy certificate نگرفته", "caddy reload یا certbot --nginx"],
            ["DB locked", "دو پروسه همزمان به دیتابیس دسترسی دارند", "systemctl restart ehsan-site"],
            ["پنل admin لاگین نمی‌کند", "رمز اشتباه یا JWT_SECRET عوض شده", "bash scripts/reset-admin-password.sh"],
            ["بات بله/تلگرام کار نمی‌کند", "توکن یا chat_id اشتباه", "curl https://api.telegram.org/bot<TOKEN>/getMe را تست کنید"],
        ],
        col_widths=[4, 4, 6])

    # ---- ۱۲. توصیه نهایی ----
    add_heading(doc, "۱۲. توصیه‌های نهایی", level=1)
    add_bullet(doc, "هر شب بک‌آپ خودکار گرفته می‌شود — ولی هفته‌ای یک‌بار دستی هم بک‌آپ بگیرید و روی لپ‌تاپ خودتان ذخیره کنید.")
    add_bullet(doc, "رمز admin را هر ۳ ماه یک‌بار عوض کنید.")
    add_bullet(doc, "اگر IP اینترنت شما عوض شد، install.sh --ip-allowlist را با IP جدید اجرا کنید.")
    add_bullet(doc, "هرگز فایل .env یا db/.maintenance-*-token.txt را به کسی نفرستید.")
    add_bullet(doc, "اگر باگی دیدید، به هوش مصنوعی بگویید — او از طریق کانال امن خودش رفع می‌کند.")
    add_bullet(doc, "آپدیت‌ها را از گیت‌هاب بگیرید: bash AI/sync-from-github-to-offline.sh")

    doc.save(os.path.join(OUT_DIR, "۰۲-راهنمای-نصب-سایت.docx"))
    print("✅ سند ۰۲ ساخته شد: راهنمای نصب سایت")


# ============================================================================
# سند ۲: راهنمای وصل هوش مصنوعی
# ============================================================================

def build_doc2_ai_vasl():
    doc = Document()
    setup_doc_styles(doc)

    add_cover(doc,
              "راهنمای وصل هوش مصنوعی",
              "تنظیم کانال امن چهارلایه بین AI و سرور",
              "۰۳")

    # ---- ۱. مقدمه ----
    add_heading(doc, "۱. مقدمه — این کانال چیست و چرا؟", level=1)
    add_para(doc,
        "این سند توضیح می‌دهد چگونه هوش مصنوعی (AI) از طریق یک کانال امن به سایت شما "
        "وصل می‌شود تا بتواند باگ‌ها را بگیرد، محتوا اضافه کند، تنظیمات را تغییر دهد، "
        "و کارهای روزانه را انجام دهد — بدون اینکه شما دستی چیزی وارد کنید.")

    add_para(doc,
        "چرا کانال امن؟ چون سرور شما در اینترنت است و هر کسی می‌تواند به آن درخواست "
        "بفرستد. اگر کانال امن نباشد، هکرها می‌توانند به پنل مدیریت دسترسی پیدا "
        "کنند، محتوا را پاک کنند، یا دیتابیس را خراب کنند. کانال امن با چهار لایه "
        "محافظت، این خطر را به حداقل می‌رساند.")

    add_para(doc,
        "چهار لایه عبارت‌اند از: (۱) لیست مجاز IP، (۲) توکن خواندن، (۳) توکن ویرایش، "
        "(۴) رمزنگاری AES-256-GCM. هر لایه به تنهایی یک سد است و اگر یکی شکسته شود، "
        "بقیه هنوز محافظت می‌کنند.")

    # ---- ۲. چهار لایه امنیت ----
    add_heading(doc, "۲. چهار لایه امنیت کانال", level=1)
    add_table(doc,
        ["لایه", "نام", "توضیح", "متغیر محیطی"],
        [
            ["۱", "لیست مجاز IP", "فقط IPهایی که در لیست هستند می‌توانند به کانال دسترسی داشته باشند", "MAINTENANCE_IP_ALLOWLIST"],
            ["۲", "توکن خواندن", "رمز ۳۲+ کاراکتری برای عملیات فقط خواندن (status, messages, ...)", "MAINTENANCE_TOKEN"],
            ["۳", "توکن ویرایش", "رمز ۴۸+ کاراکتری برای عملیات ویرایش (texts.set, clip.add, ...)", "MAINTENANCE_EDIT_TOKEN"],
            ["۴", "رمزنگاری AES-256-GCM", "بدنه درخواست رمزنگاری می‌شود + nonce + timestamp ضد replay", "MAINTENANCE_ENC_KEY"],
        ],
        col_widths=[1, 3.5, 7, 4])

    add_callout(doc,
        "نکته مهم درباره AI-Bind:",
        "وقتی install.sh را با پرچم --ai-bind اجرا می‌کنید، حالت AI-Bind فعال می‌شود. "
        "در این حالت، حتی عملیات خواندن هم نیاز به توکن ویرایش دارند. یعنی هوش "
        "مصنوعی فقط با توکن ویرایش می‌تواند هر کاری بکند. این امن‌ترین حالت است و "
        "برای زمانی که هوش مصنوعی خودش سایت را مدیریت می‌کند، پیشنهاد می‌شود.")

    # ---- ۳. پیدا کردن توکن‌ها ----
    add_heading(doc, "۳. پیدا کردن توکن‌ها و کلید رمزنگاری", level=1)
    add_para(doc,
        "بعد از اجرای install.sh، توکن‌ها در فایل‌های زیر ذخیره می‌شوند (همه با دسترسی "
        "600 — فقط root می‌تواند بخواند):")

    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site\n\n"
        "# توکن خواندن (32+ کاراکتر):\n"
        "cat db/.maintenance-token.txt\n\n"
        "# توکن ویرایش (48+ کاراکتر):\n"
        "cat db/.maintenance-edit-token.txt\n\n"
        "# کلید رمزنگاری (64 هگزادسیمال = 32 بایت):\n"
        "cat db/.maintenance-enc-key.txt\n\n"
        "# رمز admin (اگر فراموش کردید):\n"
        "cat db/.admin-password.txt")

    add_callout(doc,
        "هشدار امنیتی:",
        "این فایل‌ها را هرگز به کسی نفرستید، در گیت‌هاب commit نکنید، یا در پیام‌های "
        "متنی کپی نکنید. اگر لو رفت، install.sh را دوباره اجرا کنید تا توکن‌های جدید "
        "تولید شوند.",
        color='FFE4E1')

    # ---- ۴. پیدا کردن IP ----
    add_heading(doc, "۴. پیدا کردن IP عمومی خودتان", level=1)
    add_para(doc,
        "برای تنظیم لیست مجاز IP، باید IP عمودی خودتان را بدانید. این IP، IP اینترنت "
        "شما است (نه IP محلی لپ‌تاپ).")

    add_code_block(doc,
        "# از لپ‌تاپ خودتان (یا از محیطی که AI از آن وصل می‌شود):\n"
        "curl https://api.ipify.org\n"
        "# خروجی: 91.92.93.94 (مثال)\n\n"
        "# اگر چند شبکه دارید (خانه، دفتر، موبایل):\n"
        "curl https://ifconfig.me\n"
        "curl https://icanhazip.com\n"
        "# هر سه باید یکی باشند — اگر نه، NAT هستید و باید CIDR استفاده کنید")

    add_heading(doc, "۴.۱. تنظیم لیست مجاز IP", level=2)
    add_para(doc, "چهار حالت برای تنظیم لیست IP دارید:")

    add_table(doc,
        ["حالت", "دستور", "توضیح"],
        [
            ["یک IP", "--ip-allowlist \"91.92.93.94\"", "فقط همین IP اجازه دسترسی دارد"],
            ["چند IP", "--ip-allowlist \"91.92.93.94,85.86.87.88\"", "هر دو IP اجازه دارند (با کاما جدا کنید)"],
            ["CIDR", "--ip-allowlist \"91.92.93.0/24\"", "تمام IPهای 91.92.93.0 تا 91.92.93.255 اجازه دارند"],
            ["خالی (همه)", "--no-ip-allowlist", "هیچ محدودیت IP نیست (پیشنهاد نمی‌شود)"],
        ],
        col_widths=[2.5, 7, 5])

    add_para(doc,
        "اگر IP شما هر چند ساعت عوض می‌شود (اینترنت موبایل، ISP‌های ایرانی)، از CIDR "
        "استفاده کنید. مثلاً اگر IP شما همیشه 91.92.x.x است، از 91.92.0.0/16 "
        "استفاده کنید. این امنیت کمتری دارد ولی عملی‌تر است.")

    # ---- ۵. فعال/غیرفعال کردن AI-Bind ----
    add_heading(doc, "۵. فعال یا غیرفعال کردن حالت AI-Bind", level=1)
    add_para(doc,
        "AI-Bind حالتی است که در آن حتی عملیات خواندن هم نیاز به توکن ویرایش دارند. "
        "این حالت امن‌تر است ولی برای کاربر دستی کمی سنگین‌تر (چون همیشه باید توکن "
        "ویرایش را وارد کنید).")

    add_code_block(doc,
        "# فعال کردن AI-Bind (پیشنهادی برای وقتی AI سایت را مدیریت می‌کند):\n"
        "./install.sh --ai-bind --ip-allowlist \"YOUR_IP\"\n\n"
        "# غیرفعال کردن AI-Bind (اگر می‌خواهید با توکن خواندن هم بتوانید ببینید):\n"
        "./install.sh --no-ai-bind --ip-allowlist \"YOUR_IP\"\n\n"
        "# بعد از هر تغییر، سرویس را ری‌استارت کنید:\n"
        "systemctl restart ehsan-site")

    # ---- ۶. کلاینت کانال ----
    add_heading(doc, "۶. کلاینت کانال (maintenance.sh)", level=1)
    add_para(doc,
        "کلاینت کانال، اسکریپت maintenance.sh است که در پوشه scripts/ روی سرور قرار "
        "دارد. این اسکریپت همه کارهای رمزنگاری، امضای توکن، و ارسال درخواست را خودکار "
        "انجام می‌دهد — شما فقط action و داده می‌دهید.")

    add_code_block(doc,
        "# ساختار کلی دستور:\n"
        "bash scripts/maintenance.sh --ai-bind <action> [--data '{json}']\n\n"
        "# مثال ۱ — دیدن وضعیت سایت:\n"
        "bash scripts/maintenance.sh --ai-bind status\n\n"
        "# مثال ۲ — دیدن آمار دیتابیس:\n"
        "bash scripts/maintenance.sh --ai-bind db-stats\n\n"
        "# مثال ۳ — ویرایش یک متن:\n"
        "bash scripts/maintenance.sh --ai-bind texts.set --data '{\n"
        '  "key": "home_title",\n'
        '  "value": "احسان مراد — خواننده و آهنگساز"\n'
        "}'")

    # ---- ۷. لیست کامل actionها ----
    add_heading(doc, "۷. لیست کامل actionها", level=1)

    add_heading(doc, "۷.۱. عملیات خواندن (Read)", level=2)
    add_table(doc,
        ["action", "توضیح", "خروجی نمونه"],
        [
            ["status", "وضعیت کلی سایت", '{"ok":true,"status":"online","version":"1.0 rev5"}'],
            ["db-stats", "آمار دیتابیس (تعداد رکوردها)", '{"users":12,"clips":45,"messages":128}'],
            ["security-logs", "لاگ‌های امنیتی ۲۴ ساعت اخیر", "آرایه‌ای از رویدادها"],
            ["messages", "پیام‌های تماس اخیر", "آرایه‌ای از پیام‌ها"],
            ["chats", "گفتگوهای اخیر", "آرایه‌ای از chats"],
            ["backup", "بک‌آپ کامل دیتابیس", "فایل binary.sqlite"],
            ["texts.get", "گرفتن همه متن‌ها", "آرایه‌ای از texts"],
            ["settings.get", "گرفتن تنظیمات", "object تنظیمات"],
            ["nav.get", "گرفتن منوی سایت", "آرایه‌ای از آیتم‌ها"],
            ["clips.get", "گرفتن ویدیوهای آپارت", "آرایه‌ای از clips"],
            ["equipment.get", "گرفتن تجهیزات", "آرایه‌ای از equipment"],
            ["content.get", "گرفتن محتوای صفحات", "آرایه‌ای از content"],
            ["export-all", "خروجی کامل دیتابیس به JSON", "JSON بزرگ"],
        ],
        col_widths=[3, 5, 6])

    add_heading(doc, "۷.۲. عملیات ویرایش (Edit)", level=2)
    add_table(doc,
        ["action", "توضیح", "نمونه --data"],
        [
            ["texts.set", "ویرایش یک متن", '{"key":"home_title","value":"..."}'],
            ["settings.set", "ویرایش تنظیمات", '{"key":"site_name","value":"..."}'],
            ["nav.add", "افزودن آیتم منو", '{"label":"گالری","href":"/gallery","order":3}'],
            ["nav.update", "ویرایش آیتم منو", '{"id":5,"label":"گالری جدید"}'],
            ["clip.add", "افزودن ویدیو آپارت", '{"aparat_id":"xxx","title":"..."}'],
            ["clip.update", "ویرایش ویدیو", '{"id":12,"title":"عنوان جدید"}'],
            ["clip.set-visible", "نمایش/پنهان ویدیو", '{"id":12,"visible":true}'],
            ["equipment.set", "ویرایش تجهیزات", '{"id":3,"name":"...","count":2}'],
            ["content.set-visible", "نمایش/پنهان محتوا", '{"id":7,"visible":true}'],
        ],
        col_widths=[3.5, 4.5, 6])

    # ---- ۸. پنج گردش‌کار روزانه ----
    add_heading(doc, "۸. پنج گردش‌کار روزانه AI", level=1)
    add_para(doc,
        "این پنج کار، کارهایی هستند که هوش مصنوعی هر روز می‌تواند روی سایت انجام دهد:")

    add_heading(doc, "۸.۱. خواندن پیام‌های تماس", level=2)
    add_code_block(doc,
        "# ۱. گرفتن همه پیام‌های خوانده‌نشده:\n"
        'bash scripts/maintenance.sh --ai-bind messages --data \'{"unread":true}\'\n\n'
        "# ۲. پاسخ به هر پیام (اگر لازم است):\n"
        'bash scripts/maintenance.sh --ai-bind message.reply --data \'{"id":45,"text":"سلام، ممنون از پیامت"}\'\n\n'
        "# ۳. علامت‌گذاری به‌عنوان خوانده‌شده:\n"
        'bash scripts/maintenance.sh --ai-bind message.mark-read --data \'{"id":45}\'')

    add_heading(doc, "۸.۲. اضافه کردن ویدیوی آپارت جدید", level=2)
    add_code_block(doc,
        "# وقتی احسان ویدیوی جدیدی در آپارت می‌گذارد:\n"
        "bash scripts/maintenance.sh --ai-bind clip.add --data '{\n"
        '  "aparat_id": "abc123xyz",\n'
        '  "title": "آهنگ جدید - زمستان",\n'
        '  "description": "اولین تک‌آهنگ از آلبوم زمستان",\n'
        '  "category": "music",\n'
        '  "visible": true\n'
        "}'")

    add_heading(doc, "۸.۳. ویرایش متن‌های سایت", level=2)
    add_code_block(doc,
        "# مثلاً تغییر عنوان صفحه اصلی:\n"
        "bash scripts/maintenance.sh --ai-bind texts.set --data '{\n"
        '  "key": "home_hero_title",\n'
        '  "value": "احسان مراد — موسیقی برای جان"\n'
        "}'\n\n"
        "# یا تغییر توضیحات متا:\n"
        "bash scripts/maintenance.sh --ai-bind texts.set --data '{\n"
        '  "key": "meta_description",\n'
        '  "value": "وب‌سایت رسمی احسان مراد، خواننده و آهنگساز"\n'
        "}'")

    add_heading(doc, "۸.۴. گرفتن بک‌آپ روزانه", level=2)
    add_code_block(doc,
        "# بک‌آپ کامل دیتابیس:\n"
        "bash scripts/maintenance.sh --ai-bind backup > /tmp/backup-$(date +%Y%m%d).bin\n\n"
        "# انتقال به گیت‌هاب (در شاخه server-state):\n"
        "bash AI/sync-server-to-github.sh\n\n"
        "# یا انتقال به نسخه آفلاین:\n"
        "bash AI/sync-from-github-to-offline.sh")

    add_heading(doc, "۸.۵. رفع باگ اضطراری", level=2)
    add_code_block(doc,
        "# وقتی باگی گزارش می‌شود، AI اول وضعیت را چک می‌کند:\n"
        "bash scripts/maintenance.sh --ai-bind status\n\n"
        "# بعد لاگ‌های امنیتی را می‌بیند:\n"
        "bash scripts/maintenance.sh --ai-bind security-logs --data '{\"hours\":24}'\n\n"
        "# اگر نیاز به ویرایش کد بود، از مسیر مستقیم SSH (نه کانال) استفاده می‌کند\n"
        "# و بعد تغییرات را commit و push می‌کند.")

    # ---- ۹. sync با گیت‌هاب ----
    add_heading(doc, "۹. همگام‌سازی با گیت‌هاب (سه لایه)", level=1)
    add_para(doc,
        "طراحی سه‌لایه به این صورت است: نسخه آنلاین (روی سرور) ↔ نسخه گیت‌هاب ↔ "
        "نسخه آفلاین. هر سه باید دقیقاً یکی باشند.")

    add_code_block(doc,
        "# ۱. از سرور به گیت‌هاب (snapshot از دیتابیس و فایل‌ها):\n"
        "bash AI/sync-server-to-github.sh\n"
        "# این دستور یک فایل snapshot.json می‌سازد و در شاخه server-state پوش می‌کند.\n\n"
        "# ۲. از گیت‌هاب به آفلاین:\n"
        "bash AI/sync-from-github-to-offline.sh\n"
        "# این دستور snapshot.json را از گیت‌هاب می‌گیرد و روی نسخه آفلاین اعمال می‌کند.\n\n"
        "# ۳. اعمال snapshot:\n"
        "node AI/apply-snapshot.mjs snapshot.json\n"
        "# این دستور دیتابیس آفلاین را با snapshot همگام می‌کند.")

    add_callout(doc,
        "گردش‌کار پیشنهادی هر روز:",
        "صبح: AI در سرور sync-server-to-github.sh را اجرا می‌کند → snapshot در گیت‌هاب. "
        "بعد sync-from-github-to-offline.sh را اجرا می‌کند → نسخه آفلاین آپدیت می‌شود. "
        "این‌طوری هر سه لایه همیشه یکی هستند.")

    # ---- ۱۰. جدول خطاهای HTTP ----
    add_heading(doc, "۱۰. خطاهای HTTP کانال", level=1)
    add_table(doc,
        ["کد", "نام", "علت", "راه‌حل"],
        [
            ["200", "OK", "درخواست موفق", "هیچ کاری لازم نیست"],
            ["400", "Bad Request", "JSON اشتباه یا فیلد کم", "ساختار --data را چک کنید"],
            ["401", "Unauthorized", "توکن اشتباه یا نبود", "توکن درست را از db/.maintenance-*.txt بگیرید"],
            ["403", "Forbidden", "IP در لیست مجاز نیست", "IP خود را با curl ifconfig.me چک کنید"],
            ["405", "Method Not Allowed", "متد HTTP اشتباه (GET به جای POST)", "همیشه POST استفاده کنید"],
            ["408", "Request Timeout", "timestamp قدیمی (>۵ دقیقه)", "ساعت سیستم را چک کنید: date"],
            ["409", "Conflict", "nonce تکراری (replay attack)", "کلاینت nonce تکراری نفرستد"],
            ["500", "Internal Error", "خطای داخلی سرور", "journalctl -u ehsan-site -n 50"],
            ["503", "Service Unavailable", "سرویس پایین است", "systemctl status ehsan-site"],
        ],
        col_widths=[1.2, 3, 4, 6])

    doc.save(os.path.join(OUT_DIR, "۰۳-راهنمای-وصل-هوش-مصنوعی.docx"))
    print("✅ سند ۰۳ ساخته شد: راهنمای وصل هوش مصنوعی")


# ============================================================================
# سند ۳: راهنمای ایجنت ارزان‌تر
# ============================================================================

def build_doc3_agent_arzan():
    doc = Document()
    setup_doc_styles(doc)

    add_cover(doc,
              "راهنمای ایجنت ارزان‌تر",
              "اگر AI فعلی گران شد، یک ایجنت ارزان‌تر می‌تواند کانال را قبضه کند",
              "۰۴")

    # ---- ۱. مقدمه ----
    add_heading(doc, "۱. مقدمه — چرا این سند؟", level=1)
    add_para(doc,
        "این سند برای زمانی است که هوش مصنوعی فعلی (مثلاً Claude Opus یا GPT-4) دیگر "
        "قابل پرداخت نیست — یا چون قیمتش بالا رفته، یا چون بودجه شما تمام شده، یا "
        "چون دسترسی‌اش قطع شده. در این حالت، باید یک ایجنت ارزان‌تر بتواند کانال "
        "نگهداری سایت را قبضه کند و کارهای روزانه را ادامه دهد.")

    add_para(doc,
        "خبر خوب: کانال نگهداری کاملاً مستقل از AI است. یعنی هر AI که بتواند درخواست "
        "HTTP بفرستد، JSON بخواند، و دستورات bash اجرا کند، می‌تواند از این کانال "
        "استفاده کند. حتی یک مدل محلی روی لپ‌تاپ شما هم می‌تواند این کار را بکند. "
        "این سند به شما نشان می‌دهد چگونه یک ایجنت ارزان‌تر را تنظیم کنید.")

    # ---- ۲. جدول قیمت مدل‌ها ----
    add_heading(doc, "۲. مقایسه قیمت مدل‌های هوش مصنوعی", level=1)
    add_para(doc,
        "این قیمت‌ها تقریبی و بر اساس نرخ‌های رسمی در نوامبر ۲۰۲۵ هستند. ممکن است "
        "عوض شوند — قبل از انتخاب، حتماً چک کنید.")

    add_table(doc,
        ["مدل", "شرکت", "قیمت ورودی (هر ۱M توکن)", "قیمت خروجی", "نکته"],
        [
            ["Claude Opus 4", "Anthropic", "$15", "$75", "گران‌ترین، بهترین کیفیت"],
            ["GPT-4o", "OpenAI", "$2.50", "$10", "متوسط، خوب"],
            ["Claude Sonnet 4", "Anthropic", "$3", "$15", "پیشنهادی فعلی"],
            ["Claude Haiku 3.5", "Anthropic", "$0.80", "$4", "ارزان، خوب"],
            ["GPT-4o-mini", "OpenAI", "$0.15", "$0.60", "خیلی ارزان"],
            ["GLM-4 Flash", "Z.ai", "$0.10", "$0.10", "خیلی ارزان، فارسی خوب"],
            ["Gemini 1.5 Flash", "Google", "$0.075", "$0.30", "ارزان‌ترین ابری"],
            ["Llama 3.3 70B", "Meta (محلی)", "$0 (سخت‌افزار)", "$0", "نیاز به GPU"],
        ],
        col_widths=[3.5, 2.5, 3, 3, 4])

    add_para(doc,
        "اگر بودجه شما ۵۰ دلار در ماه است، با GPT-4o-mini یا GLM-4 Flash می‌توانید "
        "حدود ۱۰۰ میلیون توکن ورودی مصرف کنید — که برای کارهای روزانه یک سایت کوچک "
        "کاملاً کافی است.")

    # ---- ۳. پنج چیز لازم ----
    add_heading(doc, "۳. پنج چیز لازم برای ایجنت جایگزین", level=1)
    add_para(doc, "هر ایجنت ارزان‌تری که می‌خواهید کانال را قبضه کند، باید این پنج چیز را داشته باشد:")

    add_table(doc,
        ["#", "چیز", "توضیح"],
        [
            ["۱", "دسترسی HTTP", "بتواند curl یا fetch بفرستد (هر زبان برنامه‌نویسی)"],
            ["۲", "خواندن JSON", "بتواند خروجی JSON را بخواند و فهمید"],
            ["۳", "اجرای bash", "بتواند scripts/maintenance.sh را اجرا کند"],
            ["۴", "System Prompt", "دستورالعمل کامل این سند (بخش ۵) را در system prompt داشته باشد"],
            ["۵", "توکن کانال", "توکن ویرایش + کلید رمزنگاری از فایل‌های db/.maintenance-*.txt"],
        ],
        col_widths=[1, 3.5, 9])

    # ---- ۴. مراحل تنظیم ----
    add_heading(doc, "۴. مراحل تنظیم ایجنت ارزان‌تر", level=1)

    add_heading(doc, "۴.۱. گرفتن توکن‌ها از سرور", level=2)
    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site\n\n"
        "# سه مقدار زیر را کپی کنید و به ایجنت جدید بدهید:\n"
        "echo \"READ_TOKEN:$(cat db/.maintenance-token.txt)\"\n"
        "echo \"EDIT_TOKEN:$(cat db/.maintenance-edit-token.txt)\"\n"
        "echo \"ENC_KEY:$(cat db/.maintenance-enc-key.txt)\"\n"
        "echo \"VPS_IP:31.70.76.10\"\n"
        "echo \"SITE:https://ehsanmorad.ir\"")

    add_heading(doc, "۴.۲. تنظیم IP ایجنت جدید", level=2)
    add_para(doc,
        "اگر ایجنت جدید از یک IP ثابت وصل می‌شود (مثلاً یک VPS دیگر)، آن IP را به "
        "لیست مجاز اضافه کنید:")

    add_code_block(doc,
        "ssh root@31.70.76.10\n"
        "cd /home/ehsan/personal-site\n\n"
        "# IP ایجنت جدید را اضافه کنید:\n"
        "./install.sh --ai-bind --ip-allowlist \"YOUR_IP,AGENT_IP\"\n\n"
        "# مثال:\n"
        "./install.sh --ai-bind --ip-allowlist \"91.92.93.94,188.166.100.50\"\n\n"
        "# اگر ایجنت از چند IP وصل می‌شود (مثلاً مدل ابری):\n"
        "./install.sh --ai-bind --ip-allowlist \"91.92.93.94,0.0.0.0/0\"\n"
        "# (هشدار: 0.0.0.0/0 یعنی همه IPها — فقط در حالت اضطراری)")

    add_heading(doc, "۴.۳. تست اتصال", level=2)
    add_code_block(doc,
        "# از محیط ایجنت جدید:\n"
        "curl -X POST https://ehsanmorad.ir/api/maintenance \\\n"
        '  -H "Content-Type: application/octet-stream" \\\n'
        '  -H "X-Maintenance-Action: status" \\\n'
        "  --data-binary @<(node -e \"\n"
        "    const crypto = require('crypto');\n"
        "    const encKey = Buffer.from('$ENC_KEY', 'hex');\n"
        "    const nonce = crypto.randomBytes(12);\n"
        "    const ts = Math.floor(Date.now()/1000).toString();\n"
        "    const plaintext = JSON.stringify({ts, nonce: nonce.toString('hex'), body:{}});\n"
        "    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, nonce);\n"
        "    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);\n"
        "    const tag = cipher.getAuthTag();\n"
        "    process.stdout.write(Buffer.concat([nonce, tag, enc]));\n"
        "  \")\n\n"
        "# خروجی باید ok:true باشد")

    # ---- ۵. System Prompt کامل ----
    add_heading(doc, "۵. System Prompt آماده برای ایجنت ارزان‌تر", level=1)
    add_para(doc,
        "این متن را در system prompt ایجنت جدید کپی کنید. این دستورالعمل کامل است — "
        "ایجنت با خواندن این، می‌تواند همه کارهای لازم را انجام دهد.")

    system_prompt = """تو ایجنت نگهداری سایت احسان مراد هستی (ehsanmorad.ir).
وظیفه تو: خواندن پیام‌ها، رفع باگ، اضافه کردن ویدیوهای آپارت، ویرایش متن‌ها، و sync با گیت‌هاب.

قوانین:
۱. همیشه فارسی بنویس (با حروف فارسی، نه فینگلیش).
۲. مفصل بنویس، نه خلاصه — کاربر از خلاصه متوجه نمی‌شود.
۳. هرگز رمزها یا توکن‌ها را در پاسخ ننویس — فقط در فایل‌های db/.maintenance-*.txt هستند.
۴. قبل از هر ویرایش، اول status بگیر تا مطمئن شوی سایت بالاست.

اطلاعات اتصال:
- VPS: 31.70.76.10
- سایت: https://ehsanmorad.ir
- مسیر پروژه روی سرور: /home/ehsan/personal-site
- مسیر اسکریپت: bash scripts/maintenance.sh --ai-bind <action> [--data '{json}']
- ریپو گیت‌هاب: github.com/ldrcoir/ehsan-site

actionهای خواندن (با توکن ویرایش در حالت AI-Bind):
  status, db-stats, security-logs, messages, chats, backup,
  texts.get, settings.get, nav.get, clips.get, equipment.get, content.get, export-all

actionهای ویرایش:
  texts.set, settings.set, nav.add, nav.update, clip.add, clip.update,
  clip.set-visible, equipment.set, content.set-visible

گردش‌کار روزانه:
۱. صبح: bash scripts/maintenance.sh --ai-bind status
۲. خواندن پیام‌های خوانده‌نشده: bash scripts/maintenance.sh --ai-bind messages --data '{"unread":true}'
۳. اگر ویدیوی آپارت جدید هست: clip.add
۴. sync به گیت‌هاب: bash AI/sync-server-to-github.sh
۵. sync به آفلاین: bash AI/sync-from-github-to-offline.sh

خطاها:
- 403: IP تو در لیست مجاز نیست. به کاربر بگو install.sh --ip-allowlist را با IP تو اجرا کند.
- 401: توکن اشتباه. db/.maintenance-edit-token.txt را دوباره بخوان.
- 408: timestamp قدیمی. ساعت سیستمت را چک کن.
- 500: خطای سرور. journalctl -u ehsan-site -n 50 را بده.

هرگز:
- فایل .env را به کسی نفرست.
- رمز admin را در پاسخ ننویس.
- بدون اجازه کاربر، محتوا را پاک نکن.
- تغییرات کد را بدون commit و push رها نکن.

اگر کاری فراتر از این actionها لازم است (مثلاً ویرایش کد اصلی)، از کاربر بپرس."""

    add_code_block(doc, system_prompt)

    # ---- ۶. کارهای مجاز vs ممنوع ----
    add_heading(doc, "۶. کارهای مجاز در برابر ممنوع", level=1)
    add_table(doc,
        ["نوع", "کارهای مجاز", "کارهای ممنوع"],
        [
            ["خواندن", "status, db-stats, messages, chats, security-logs, texts.get, ...", "خواندن فایل .env یا رمزها"],
            ["نوشتن", "texts.set, settings.set, clip.add, clip.update, nav.add, ...", "حذف رکوردها بدون اجازه"],
            ["sync", "sync-server-to-github.sh, sync-from-github-to-offline.sh", "force push به شاخه main"],
            ["کد", "ویرایش فایل‌های src/ با اجازه کاربر + commit + push", "ویرایش مستقیم روی سرور بدون backup"],
            ["دیتابیس", "backup, export-all", "rm, DROP TABLE, prisma migrate reset"],
        ],
        col_widths=[2, 6, 6])

    # ---- ۷. گردش‌کار روزانه ----
    add_heading(doc, "۷. گردش‌کار روزانه ایجنت ارزان‌تر", level=1)
    add_para(doc,
        "این یک نمونه از کارهایی است که ایجنت ارزان‌تر می‌تواند هر روز انجام دهد. "
        "زمان تقریبی هر کار با فرض GPT-4o-mini نوشته شده است.")

    add_table(doc,
        ["زمان", "کار", "دستور", "هزینه تقریبی"],
        [
            ["صبح ۸:۰۰", "چک وضعیت سایت", "maintenance.sh --ai-bind status", "$0.0001"],
            ["صبح ۸:۰۵", "خواندن پیام‌های تماس", "maintenance.sh --ai-bind messages", "$0.0005"],
            ["صبح ۸:۱۰", "پاسخ به پیام‌ها (اگر لازم)", "maintenance.sh --ai-bind message.reply", "$0.002"],
            ["ظهر ۱۲:۰۰", "چک ویدیوهای آپارت جدید", "maintenance.sh --ai-bind clips.get", "$0.0003"],
            ["عصر ۱۸:۰۰", "sync به گیت‌هاب", "AI/sync-server-to-github.sh", "$0.0001"],
            ["شب ۲۲:۰۰", "گزارش روزانه به کاربر", "(پیام متنی)", "$0.001"],
        ],
        col_widths=[2.5, 4, 6, 2.5])

    add_para(doc,
        "مجموع هزینه روزانه: حدود $۰.۰۰۴. یعنی ماهانه حدود $۰.۱۲. این با GPT-4o-mini "
        "هست — با GLM-4 Flash یا Gemini Flash حتی ارزان‌تر هم می‌شود.")

    # ---- ۸. مقایسه هزینه ----
    add_heading(doc, "۸. مقایسه هزینه ماهانه با بودجه ۵۰ دلار", level=1)
    add_table(doc,
        ["مدل", "هزینه روزانه", "هزینه ماهانه", "درصد بودجه", "نتیجه"],
        [
            ["Claude Opus 4", "$0.50", "$15", "30%", "نگران‌کننده"],
            ["Claude Sonnet 4", "$0.10", "$3", "6%", "خوب"],
            ["GPT-4o", "$0.05", "$1.50", "3%", "خیلی خوب"],
            ["Claude Haiku 3.5", "$0.02", "$0.60", "1.2%", "عالی"],
            ["GPT-4o-mini", "$0.004", "$0.12", "0.24%", "عالی"],
            ["GLM-4 Flash", "$0.002", "$0.06", "0.12%", "عالی"],
            ["Llama 3.3 محلی", "$0", "$0", "0%", "بهترین (اگر GPU داری)"],
        ],
        col_widths=[3.5, 2.5, 2.5, 2.5, 3])

    add_callout(doc,
        "نکته:",
        "اگر میل ایجنت ارزان‌تر را انتخاب کردید، فراموش نکنید که کیفیت کار هم کم "
        "می‌شود. مثلاً GPT-4o-mini درک فرعی پیام‌های کاربر را کمتر دارد و ممکن است "
        "بعضی باگ‌های ظریف را نگیرد. ولی برای کارهای روزانه (خواندن پیام، اضافه "
        "ویدیو، sync) کاملاً کافی است.")

    # ---- ۹. مسیر برگشت ----
    add_heading(doc, "۹. مسیر برگشت به ایجنت اصلی", level=1)
    add_para(doc,
        "اگر بعداً خواستید به ایجنت اصلی (مثلاً Claude Sonnet) برگردید، فقط کافی است:")

    add_numbered(doc, "system prompt ایجنت اصلی را با دستورالعمل این سند جایگزین کنید (یا از نسخه کامل در گیت‌هاب استفاده کنید).")
    add_numbered(doc, "توکن‌ها همان‌طور که هستند باقی می‌مانند — نیازی به تولید مجدد نیست.")
    add_numbered(doc, "اگر IP ایجنت اصلی فرق دارد، install.sh --ip-allowlist را دوباره اجرا کنید.")
    add_numbered(doc, "تست: bash scripts/maintenance.sh --ai-bind status — باید ok:true بدهد.")
    add_numbered(doc, "اولین کار ایجنت اصلی: sync-from-github-to-offline.sh تا با snapshot جدید sync شود.")

    # ---- ۱۰. جمع‌بندی ----
    add_heading(doc, "۱۰. جمع‌بندی", level=1)
    add_para(doc,
        "کانال نگهداری سایت احسان مراد به‌گونه‌ای طراحی شده که وابسته به هیچ AI "
        "خاصی نباشد. توکن‌ها، IPها، و رمزنگاری همگی استاندارد هستند (HTTP, JSON, "
        "AES-256-GCM, bash). این یعنی هر AI که بتواند curl بفرستد و JSON بخواند، "
        "می‌تواند کانال را قبضه کند.")

    add_para(doc,
        "اگر روزی هوش مصنوعی فعلی از دسترس خارج شد یا گران شد، فقط سه کار لازم است: "
        "(۱) انتخاب یک ایجنت ارزان‌تر، (۲) کپی system prompt بخش ۵، (۳) تنظیم IP در "
        "لیست مجاز. بقیه کارها خودکار است.")

    add_para(doc,
        "این معماری یعنی سایت شما هرگز در دست هیچ AI واحدی گیر نمی‌افتد — و این "
        "امنیت واقعی است، نه فقط امنیت کانال.")

    doc.save(os.path.join(OUT_DIR, "۰۴-راهنمای-ایجنت-ارزان‌تر.docx"))
    print("✅ سند ۰۴ ساخته شد: راهنمای ایجنت ارزان‌تر")


# ============================================================================
# اجرای هر سه سند
# ============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("تولید سه سند Word با حروف فارسی")
    print("=" * 60)
    build_doc1_nasb()
    build_doc2_ai_vasl()
    build_doc3_agent_arzan()
    print("=" * 60)
    print("✅ هر سه سند ساخته شد در:")
    print(f"   {OUT_DIR}")
    print("=" * 60)
