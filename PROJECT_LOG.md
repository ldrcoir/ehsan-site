# PROJECT LOG — Personal Site (سایت شخصی)

> این فایل تاریخچه‌ی کامل پروژه است.
> هر بار که تغییری دادیم، اینجا ثبت می‌شه.
> اگر چت جدیدی باز شد یا خواستی پروژه رو ادامه بدی، این فایل رو بخون.

---

## 📌 نسخه فعلی: V18.8
## 📅 تاریخ: 2026-10-01

---

## 📦 فایل‌های مهم

| فایل | مسیر | توضیح |
|---|---|---|
| **VERSION.txt** | `/VERSION.txt` | تاریخچه نسخه‌ها + راهنمای Docker |
| **TUTORIAL_FA_V18.8.docx** | `/download/TUTORIAL_FA_V18.8.docx` | آموزش کامل سایت (فارسی) |
| **install-v18.8.zip** | `/public/install-v18.8.zip` | پکیج نصب خودکار (۲۴MB) |

---

## 🗂 ساختار فایل‌های پروژه

```
personal-site/
├── VERSION.txt                    ← تاریخچه نسخه‌ها
├── Dockerfile                     ← تنظیمات Docker
├── docker-compose.yml             ← اجرای خودکار
├── docker-entrypoint.sh            ← اسکریپت راه‌انداز
├── .dockerignore
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── components.json
├── prisma/
│   └── schema.prisma              ← ۲۹ مدل دیتابیس
├── src/
│   ├── app/
│   │   ├── page.tsx               ← صفحه اصلی
│   │   ├── layout.tsx             ← HTML shell + PWA + RSS + Sitemap
│   │   ├── globals.css            ← Tailwind import
│   │   ├── personal.css           ← تمام استایل‌ها (تم ترمینال/RF)
│   │   └── api/                   ← API routes
│   │       ├── content/route.ts          ← محتوای عمومی
│   │       ├── contact/route.ts          ← فرم تماس + کپچا + ضد اسپم
│   │       ├── chat/route.ts             ← چت AI + تشخیص پیام مشکوک
│   │       ├── chat/messages/route.ts    ← تحویل زنده پیام به بازدیدکننده
│   │       ├── track/route.ts            ← ردیابی بازدید
│   │       ├── rss.xml/route.ts          ← RSS Feed
│   │       ├── sitemap.xml/route.ts     ← نقشه سایت SEO
│   │       └── admin/                    ← پنل ادمین (CRUD + settings)
│   ├── components/                 ← کامپوننت‌ها
│   │   ├── RealOscilloscope.tsx
│   │   ├── RealSignalGenerator.tsx
│   │   ├── SignalLab.tsx
│   │   ├── LabEquipmentRack.tsx
│   │   ├── LabDeviceVisualizer.tsx
│   │   ├── InteractiveTerminal.tsx
│   │   ├── MatrixRain.tsx
│   │   ├── ChatSection.tsx
│   │   ├── ContentManager.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── AccessUserManager.tsx
│   │   ├── AparatClipManager.tsx
│   │   ├── FontSelector.tsx
│   │   └── ... (+ other components)
│   └── lib/                        ← ماژول‌ها
│       ├── db.ts                        ← Prisma client
│       ├── settings.ts                  ← تنظیمات سایت (key-value)
│       ├── providers.ts                 ← ارائه‌دهنده‌های AI با fallback
│       ├── bale.ts                      ← یکپارچه‌سازی Bale
│       ├── telegram.ts                  ← یکپارچه‌سازی Telegram
│       ├── security.ts                  ← مسدودسازی IP + کپچا + لاگ
│       ├── admin-auth.ts                ← احراز هویت ادمین
│       ├── access-auth.ts               ← احراز هویت کاربران دسترسی
│       ├── ip.ts                        ← استخراج امن IP کلاینت
│       ├── ssrf.ts                      ← حفاظت SSRF
│       └── useContent.ts                ← hook دریافت محتوا + متن‌ها
├── scripts/
│   ├── apply_schema.py                  ← ساخت دیتابیس (۲۹ جدول)
│   ├── seed_content.py                  ← داده‌های اولیه محتوا
│   ├── seed_equipment.py                ← داده‌های تجهیزات آزمایشگاه
│   ├── seed_texts.py                    ← متن‌های قابل ویرایش
│   ├── seed_access_users.py             ← ساخت کاربر admin (رمز تصادفی)
│   ├── reset-admin-password.sh          ← ریست رمز ادمین (رمز تصادفی)
│   ├── auto-backup.sh                   ← بک‌آپ خودکار هر شب
│   └── list_messages.py                 ← مشاهده پیام‌ها
├── public/
│   ├── manifest.json                    ← PWA manifest
│   ├── icon-192.png                     ← آیکون PWA
│   ├── icon-512.png
│   ├── logo.svg
│   └── robots.txt
├── db/
│   └── custom.db                        ← دیتابیس SQLite (در git نیست)
└── download/
    └── TUTORIAL_FA_V18.8.docx            ← آموزش فارسی
```

---

## 🛠 تکنولوژی‌ها

| تکنولوژی | نسخه | کاربرد |
|---|---|---|
| Next.js | 16.1.x | فریم‌ورک اصلی (standalone build) |
| TypeScript | 5.x | زبان برنامه‌نویسی |
| React | 19 | UI |
| Prisma | 6.x | ORM دیتابیس |
| SQLite | - | دیتابیس |
| Tailwind CSS | 4 | استایل پایه |
| bcryptjs | 3.x | هش رمز عبور |
| Docker | - | container |

---

## 🤖 ارائه‌دهنده‌های AI (۵ تا با fallback)

| Provider | Model | سرعت | نیاز |
|---|---|---|---|
| OpenAI | gpt-4o-mini | متوسط | API Key |
| Anthropic | claude-3.5-sonnet | متوسط | API Key |
| Groq | llama-3.3-70b-versatile | **خیلی سریع** | API Key از console.groq.com |
| OpenRouter | qwen-2.5-72b-instruct | متوسط | API Key از openrouter.ai |
| Ollama | llama3.2 | محلی | بدون API Key |

---

## 📊 آمار پروژه

- ۲۹ API route
- ۲۵+ کامپوننت
- ۲۹ جدول دیتابیس
- ۱۰ تب پنل ادمین
- ۳ زبان (FA, EN, DE)
- ۵ ارائه‌دهنده AI با fallback chain
- reCAPTCHA اجباری + honeypot + time-trap
- CSRF + rate limit + CSP + HSTS
- ۰ خطای TypeScript
- ۰ warning در build

---

## 🔄 تاریخچه تغییرات

### V18.8 (2026-10-01) — پاکسازی نهایی + حذف ردپای ابزار توسعه

- **حذف admin123** از تمام اسکریپت‌ها:
  - `scripts/seed_access_users.py`: رمز تصادفی ۱۶ کاراکتری تولید می‌شه
  - `scripts/reset-admin-password.sh`: رمز تصادفی ۱۶ کاراکتری (openssl rand)
- **حذف skills/ directory** از git tracking (۱۰۵۲ فایل اضافی که مربوط به ابزار توسعه بود)
- **حذف tests/python-runtime-container.sh** (اشاره به docker runner داخلی داشت)
- **حذف examples/** (فایل‌های websocket نمونه استفاده نشده)
- **پاکسازی PROJECT_LOG.md** (حذف URL preview داخلی + ذکر نام SDK های داخلی)
- **پاکسازی VERSION.txt** (حذف ذکر AI های داخلی)
- **پاکسازی prisma/schema.prisma** (حذف کامنت "zai" از لیست provider ها)
- **حذف فایل‌های آموزش قدیمی** (V17.2 تا V18.2 — فقط V18.8 نگه داشته شد)
- **حذف source-v17.2.zip + tutorial-v16.zip** (آرتیفکت‌های قدیمی)
- **TypeScript**: 0 errors
- **Build**: 0 warnings, 0 errors

### V18.3 (2026-09-25) — ۲۰ ممیزی parallel + رفع بحران‌ها
### V17.1 (2026-09-25) — بازنویسی کامل پنل ادمین
### V16.0 (2026-09-24) — ممیزی امنیتی اولیه
### V15.0 (2026-09-19) — حذف fallback قدیمی
### V14.0 (2026-09-18) — امنیت + دسترسی بخش‌بندی
### V13.0 (2026-09-17) — کلیپ آپارات + ریست رمز + SEO
### V12.0 (2026-09-16) — دسترسی بخش‌بندی + دکمه رمز
### V11.0 (2026-09-16) — پیام‌ها + HelpBox
### V10.0 (2026-09-15) — نصب مستقیم

---

## 🔒 امنیت (V18.8)

- bcrypt password hashing
- HMAC-SHA256 session tokens
- timing-safe comparisons
- rate limiting (login 5/15min, contact/chat 8/15min)
- honeypot + time-trap on contact form
- reCAPTCHA mandatory + fail-closed
- CSRF protection (Origin check in middleware)
- Body size limit 1MB
- HSTS on HTTPS
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- SSRF protection on baseUrl (blocks private IPs, decimal/hex/octal, cloud metadata)
- XFF spoofing fix (prefer x-real-ip)
- Chat session ownership (visitorId mandatory + fail-closed)
- Bot token/API key masking in all API responses
- Random admin password (not hardcoded)
- SESSION_SECRET entropy check + lazy-load
- Cookie secure:true (production) + sameSite:strict + httpOnly
- systemd با user غیر root (ehsansite)
- .env با chmod 600
- db با chmod 600
