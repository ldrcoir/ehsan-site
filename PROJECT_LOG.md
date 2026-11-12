# PROJECT LOG — Personal Site (سایت شخصی)

> این فایل تاریخچه‌ی پروژه است. برای راهنمای نصب به `VERSION.txt` و `TUTORIAL_FA_1.1.docx` مراجعه کن.

---

## 📌 نسخه فعلی: v1.1
## 📅 تاریخ: ۲۰۲۶-۱۰-۳۱

---

## 📦 فایل‌های مهم

| فایل | توضیح |
|---|---|
| **VERSION.txt** | تاریخچه نسخه‌ها + راهنمای نصب و انتقال |
| **public/install-v1.1.zip** | پکیج نصب خودکار (۱۹ مگابایت) |
| **public/TUTORIAL_FA_1.1.docx** | آموزش کامل (فارسی — ۱۴ فصل) |
| **scripts/export-site.sh / import-site.sh** | انتقال سایت بین سرورها |

---

## 🛠 تکنولوژی‌ها

| تکنولوژی | نسخه | کاربرد |
|---|---|---|
| Next.js | 16.x | فریم‌ورک اصلی (standalone build) |
| TypeScript | 5.x | زبان برنامه‌نویسی |
| React | 19 | UI |
| Prisma | 6.x | ORM دیتابیس |
| SQLite | - | دیتابیس |
| Tailwind CSS | 4 | استایل پایه |
| bcryptjs | 3.x | هش رمز عبور |

---

## 🤖 ارائه‌دهنده‌های AI (با fallback)

| Provider | Model پیش‌فرض | نیاز |
|---|---|---|
| OpenAI | gpt-4o-mini | API Key |
| Anthropic | claude-3.5-sonnet | API Key |
| Groq | llama-3.3-70b-versatile | API Key |
| OpenRouter | - | API Key |
| Ollama | llama3.2 | محلی — بدون API Key |

قوانین AI (تب «قوانین AI» در پنل) مستقیم وارد system prompt چت می‌شن.

---

## 📊 آمار پروژه (v1.1)

- ۳۰ API route
- ۲۱ کامپوننت
- ۲۴ جدول دیتابیس
- ۱۲ تب پنل ادمین
- ۳ زبان (FA, EN, DE)
- reCAPTCHA اجباری + honeypot + time-trap
- CSRF + rate limit + CSP + HSTS
- ۰ خطای TypeScript — ۰ warning در build
- بک‌آپ خودکار هر شب + اسکریپت انتقال بین سرور

---

## 🔄 تاریخچه تغییرات

### v1.1 (2026-10-31) — نسخه یکپارچه

جایگزین کل خط V17.x–V18.x. تغییرات اصلی نسبت به V18.3:

**امنیت:**
- رفع XSS در iframe آپارات (بلاک `javascript:` URL)
- رفع SSRF: IPv6-mapped + trailing-dot + ULA/link-local + `redirect: "manual"`
- middleware: تأیید واقعی HMAC سشن (نه فقط ساختاری)
- Cache-Control: no-store روی پاسخ‌های ادمین
- بلاک body های chunked (413)
- رفع username enumeration با dummy bcrypt
- اعمال IP block واقعی در login + لاگ failed_login
- visitorId با crypto.randomUUID
- خطاهای عمومی به جای error.message خام

**پنل ادمین (۱۲ تب):**
- تب جدید «چت‌ها» — مشاهده و پاسخ به چت بازدیدکنندگان
- تب جدید «آمار» — آمار بازدید + داشبورد امنیت + Unblock IP
- رفع باگ permission system (hasTabAccess به‌جای && isAdmin)
- گارد self-demotion + last-admin
- تم‌های سفارشی حالا واقعاً روی سایت اعمال می‌شن
- قوانین AI حالا وارد system prompt چت می‌شن
- شبکه‌های اجتماعی + تم/فونت پیش‌فرض + نمایش/پنهان‌سازی ۱۰ بخش سایت
- دکمه تست Bale/Telegram
- ویرایشگر متن: افزودن/حذف کلید + ۴۴ کلید seed شده
- متادیتای SEO از دیتابیس

**پاکسازی:**
- حذف ۳۰ فایل مرده (کامپوننت‌ها، مدل‌ها، اسکریپت‌ها، آرتیفکت‌های قدیمی)
- حذف ۳۹ کلاس CSS مرده
- حذف admin123 از همه اسکریپت‌ها (رمز تصادفی)
- حذف ۵ مدل unused دیتابیس (۲۹ → ۲۴ جدول)

**نصب و انتقال:**
- install.sh: dnsutils + چاپ کامل رمز ادمین + cron بک‌آپ + حفظ کلیدهای .env
- NEW: export-site.sh / import-site.sh — انتقال کامل بین سرور (DB + .env + بک‌آپ‌ها)
- docker-compose: پورت فقط localhost + NODE_ENV=production

### V18.3 و قبل‌تر — تاریخچه کامل در git log
