#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add-persian-comments.py — افزودن کامنت فارسی سرصفحه به فایل‌های فاقد کامنت فارسی (v1.0)
========================================================================================
برای هر فایل یک بلوک کامنت فارسی «هدف فایل» در بالای فایل می‌نویسد (اگر هنوز ندارد).
برای فایل‌های 'use client' بلوک بعد از دایرکتیو درج می‌شود (دایرکتیو باید اولین
statement باشد؛ کامنت قبل از آن در بعضی باندلرها مشکل‌ساز است).

ایده‌آل: فقط یک بار اجرا شود — اجرای دوباره کاری نمی‌کند (idempotent).
"""

import os

# توضیح فارسی هر فایل — کلید: مسیر نسبی، مقدار: خط اول کامنت (چند خطی با \n)
HEADERS = {
    "src/app/api/admin/clear/route.ts":
        "POST /api/admin/clear — حذف هدفمند پیام‌ها/چت‌ها/آمار\n"
        "target: message|message_all (تب پیام‌ها — قابل واگذاری) یا\n"
        "chat_session|chat_all|chat_message|stats (فقط ادمین) — overgrant بسته شد.",
    "src/app/api/admin/content/route.ts":
        "GET/POST /api/admin/content — مدیریت محتوا (book/article/tutorial/skill/aiInstruction).\n"
        "field-whitelist برای جلوگیری از mass-assignment؛ قواعد AI فقط برای ادمین/مالک.",
    "src/app/api/admin/email/route.ts":
        "POST /api/admin/email — فوروارد ایمیل پیام‌های تماس (تنظیم/تست) — فقط ادمین/مالک.",
    "src/app/api/admin/equipment/route.ts":
        "GET/POST /api/admin/equipment — مدیریت دستگاه‌های آزمایشگاه (وضعیت، specs، visible)\n"
        "با tab محتوا قابل واگذاری است.",
    "src/app/api/admin/providers/route.ts":
        "GET/POST /api/admin/providers — مدیریت ارائه‌دهنده‌های AI (کلید، baseUrl، مدل، اولویت)\n"
        "— فقط ادمین/مالک؛ کلیدها هرگز در خروجی عمومی نمی‌آیند.",
    "src/app/api/admin/security-dashboard/route.ts":
        "GET /api/admin/security-dashboard — داده‌های تب امنیت (لاگ‌ها، IPهای مسدود، آمار).\n"
        "POST: بلاک/آزادسازی دستی IP — فقط ادمین/مالک.",
    "src/app/api/admin/settings/route.ts":
        "GET/POST /api/admin/settings — تنظیمات سایت (whitelist کلیدها؛ توکن‌های ربات ماسک\n"
        "می‌شوند؛ visitorCount فقط عدد؛ URLهای شبکه‌های اجتماعی اعتبارسنجی می‌شوند).",
    "src/app/loading.tsx":
        "صفحه‌ی loading سراسری — اسپینر ترمینال‌مانند سبز (هویت بصری سایت).",
    "src/app/not-found.tsx":
        "صفحه‌ی ۴۰۴ سفارشی — پیام خطا با استایل ترمینال + لینک بازگشت به خانه.",
    "src/app/page.tsx":
        "صفحه‌ی اصلی تک‌صفحه‌ای (hero، درباره، مهارت‌ها، کتاب‌ها، مقالات، آموزش‌ها،\n"
        "آزمایشگاه، چت، کلیپ‌ها، تماس) — محتوا از دیتابیس با /api/content می‌آید.",
    "src/components/ArchiveGrid.tsx":
        "ArchiveGrid — شبکه‌ی نمایش آرشیو کتاب‌ها/مقالات با فیلتر و انیمیشن ورود.",
    "src/components/ContentManager.tsx":
        "ContentManager — تب مدیریت محتوای پنل ادمین (CRUD کتاب/مقاله/آموزش/مهارت/قواعد AI)\n"
        "با فیلدهای سه‌زبانه و به‌روزرسانی زنده.",
    "src/components/InteractiveTerminal.tsx":
        "InteractiveTerminal — ترمینال تعاملی هدر سایت؛ دستورات whoami/help/... و پاسخ‌های\n"
        "مبتنی بر داده‌ی واقعی دیتابیس (نام، تیتر، آمار).",
    "src/components/LabDeviceVisualizer.tsx":
        "LabDeviceVisualizer — تصویرسازی SVG هر دستگاه آزمایشگاه بر اساس category.",
    "src/components/LabEquipmentRack.tsx":
        "LabEquipmentRack — رک دستگاه‌های آزمایشگاه؛ وضعیت زنده از /api/content.\n"
        "دستگاه‌ها با زدن، پنل دستگاه باز می‌شود (دوربین سه‌بعدی ساده).",
    "src/components/MatrixRain.tsx":
        "MatrixRain — پس‌زمینه‌ی بارش کاراکترها (canvas)؛ با کاهش خودکار FPS روی موبایل\n"
        "و توقف در reduce-motion برای صرفه‌جویی CPU.",
    "src/components/Oscilloscope.tsx":
        "Oscilloscope — نمایشگر موج دکوراتیو سبک (canvas) — نسخه‌ی واقعی ببین RealOscilloscope.",
    "src/components/RealOscilloscope.tsx":
        "RealOscilloscope — اسیلوسکوپ واقعی با WebAudio: ورودی میکروفون/فایل، تنظیم\n"
        "زمان/دامنه/تریگر و فریز موج.",
    "src/components/RealSignalGenerator.tsx":
        "RealSignalGenerator — سیگنال‌جنرتور واقعی با WebAudio (سینوس/مربع/دندان‌اره/نویز)\n"
        "با کنترل فرکانس/دامنه و پخش از خروجی صدا.",
    "src/components/SignalBars.tsx":
        "SignalBars — نوارهای موجی کوچک برای نشانگرهای وضعیت دستگاه‌ها.",
    "src/components/SignalLab.tsx":
        "SignalLab — آزمایشگاه سیگنال: ترکیب اسیلوسکوپ واقعی + جنرتور واقعی + رک دستگاه‌ها.",
    "src/components/ThemeBuilder.tsx":
        "ThemeBuilder — سازنده‌ی تم سفارشی در پنل ادمین (انتخاب رنگ‌ها با پیش‌نمایش زنده)\n"
        "— ذخیره در CustomTheme و امکان پیش‌فرض‌کردن برای بازدیدکننده‌ها.",
    "src/lib/bale.ts":
        "bale.ts — ارسال پیام به ربات Bale (notify ادمین درباره‌ی پیام تازه) با timeout\n"
        "و خاموش‌بودن امن وقتی توکن/تنظیمات ست نیست.",
    "src/lib/content.ts":
        "content.ts — لایه‌ی خواندن محتوای عمومی سایت برای /api/content: شکل‌دهی داده‌ها،\n"
        "فیلتر public keys و حذف فیلدهای حساس (مثل متن دستورالعمل AI) از خروجی.",
    "src/lib/ip.ts":
        "ip.ts — استخراج امن IP کلاینت از هدرها؛ فقط با TRUST_PROXY=true به X-Forwarded-For\n"
        "اعتماد می‌شود (پیش‌فرض fail-closed) + نرمال‌سازی IPv6 به /64 برای rate limit.",
    "src/lib/providers.ts":
        "providers.ts — مدیریت ارائه‌دهنده‌های LLM (OpenAI/Anthropic/Groq/OpenRouter/Ollama)\n"
        "با SSRF-guard روی baseUrl سفارشی، سقف حجم پاسخ و زنجیره‌ی fallback.",
    "src/lib/ssrf.ts":
        "ssrf.ts — سپر SSRF: فقط https، فقط پورت ۴۴۳، resolve DNS قبل از هر درخواست و\n"
        "رد همه‌ی IPهای رزرو/لوکال (شامل ۱۳ الگوی IPv6-mapped IPv4) — ضد DNS rebinding.",
    "src/lib/useContent.ts":
        "useContent — هوک React برای خواندن محتوا از /api/content با cache سبک و رفرش.\n"
        "همه‌ی بخش‌های عمومی سایت از همین هوک تغذیه می‌شوند.",
    "scripts/smoke-rbac.sh":
        "تست دودی RBAC و کانال نگهداری — ۲۸ چک: سلسله‌مراتب نقش‌ها، immutability مالک،\n"
        "ادمین‌سازی فقط توسط مالک، تغییر رمز مالک، توکن ویرایش، export-all.",
    "scripts/sync-from-online.sh":
        "همگام‌سازی نسخه‌ی آفلاین با آنلاین: export-all از کانال نگهداری → فایل JSON در db/.",
    "scripts/apply-online-export.mjs":
        "اعمال خروجی export-all روی دیتابیس آفلاین با Prisma upsert — بدون لمس کاربران/لاگ‌ها.\n"
        "توکن‌های ماسک‌شده skip می‌شوند تا مقدار جعلی ذخیره نشود.",
}

MARK = "PERSIAN-HEADER-V1"

def insert_header(path, text):
    with open(path, encoding="utf-8") as f:
        src = f.read()
    if MARK in src:
        return False  # قبلاً اضافه شده
    lines = text.strip().split("\n")
    block = "// ============================================================================\n"
    block += "// %s — v1.0\n" % os.path.basename(path)
    block += "// " + "\n// ".join(lines) + "\n"
    block += "// ============================================================================\n\n"
    out = src
    # اگر فایل با 'use client' شروع می‌شود، کامنت بعد از آن درج شود
    stripped = src.lstrip("\n")
    if stripped.startswith('"use client"') or stripped.startswith("'use client'"):
        # پیدا کردن پایان خط دایرکتیو
        idx = src.find("use client")
        line_end = src.find("\n", idx)
        if line_end == -1:
            line_end = len(src)
        out = src[:line_end + 1] + "\n" + block + src[line_end + 1:].lstrip("\n")
    else:
        out = block + src
    with open(path, "w", encoding="utf-8") as f:
        f.write(out)
    return True

def main():
    added = 0
    for rel, text in HEADERS.items():
        if os.path.exists(rel):
            if insert_header(rel, text):
                print("+", rel)
                added += 1
        else:
            print("MISSING FILE:", rel)
    print("added headers:", added)

if __name__ == "__main__":
    main()
