# PROJECT LOG — Personal Site (سایت شخصی)

> این فایل تاریخچه‌ی پروژه است. برای راهنمای نصب به `VERSION.txt` و `TUTORIAL_FA_1.0.docx` مراجعه کن.

---

## 📌 نسخه فعلی: v1.0 — نسخه‌ی یک (خروجی نهایی)

### v1.0 (2026-11-15 / 1405-08-24) — ممیزی ۶۰ کارگر + تحویل رسمی
- ۶۰ کارگر موازی (۱۲ گروه): ۱۰۶ یافته — همه‌ی قابل‌رفع‌ها اصلاح شد
- فوری‌ها: bypass مسیرِ encode‌شده در middleware، فرار API با پسوند فایل،
  مرده‌بودن کانال فرمان وب‌هوک (secret_token)، DUMMY_HASH cost mismatch،
  نامرئی‌بودن کارت‌های skill از DB
- پنل: permissions سمت سرور واقعی، یادداشت/تگ پیام‌ها، دیدن/تولید رمز با
  نمایش یک‌بار، فونت پیش‌فرض سایت از تب font
- کانال نگهداری اختصاصی: /api/maintenance + scripts/maintenance.sh + توکن در install.sh
- install.sh: چک آیتم‌به‌آیتم وابستگی‌ها + نصب موارد غایب + توقف سرویس قبل از WAL + ...
- جزئیات کامل: AUDIT-REPORT-v1.0.md

## 📌 نسخه فعلی: (سابقه‌ی توسعه)
## 📅 تاریخ: ۲۰۲۶-۱۰-۳۱

> ممیزی دقیق با ۶۰ worker — امنیت، کامل بودن پنل ادمین، باگ‌های کد، و اصلاحات دیپلوی.

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

---

## v1.1 rev 1.1.1 (2026-11-14) — ممیزی دوم با ۲۰ worker

۲۰ worker ممیزی: ۱۰ امنیتی + ۶ کامل بودن پنل + ۴ کیفیت کد.
همه‌ی یافته‌های HIGH/MEDIUM رفع شد — جزئیات کامل در VERSION.txt (بخش rev 1.1.1).

خلاصه:
- امنیت: XSS JSON-LD، CSS injection create تم، ip.ts fail-closed + IPv6 /64،
  logout revocation (sessionsValidAfter)، سیاست رمز ۱۲/۸، سقف سراسری چت AI،
  webhook fail-closed + replay dedup، middleware TE/path/secret + COOP/CORP،
  SSRF ranges + response cap، formsubmit encode/timeout، .dockerignore کامل،
  Docker USER node + build در image، install.sh (loopback/umask/certbot --redirect/
  systemd hardening)، nginx صریح، حذف IP از Caddyfile، robots.txt بدون مسیر خصوصی
- دیتابیس: WAL + busy_timeout + DATABASE_URL در db.ts؛ apply_schema.py ستون‌heal
  (مهاجرت بدون قفل) + ۳ ایندکس؛ visitorCount اتمیک؛ retention لاگ ۳۰ روزه
- پنل: حذف چت‌سشن/همه چت‌ها، status پیام، حذف همه پیام‌ها، بلاک دستی IP،
  فیلدهای FA/DE محتوا، تم سفارشی به‌عنوان پیش‌فرض، سیستم‌پرامپت از پنل،
  whoami ترمینال DB-driven، فیکس specs/پیام تکراری/feedbackها، حذف نشت aiInstructions،
  RSS/sitemap DB-driven، شماره‌گذاری بخش‌ها
- کیفیت: whitelist فیلدها، bulk_import گزارش خطا، clips patch-semantics،
  cleanup imports/exports، .env.example در ریپو، docs اصلاح (پورت 80/lsof/webhook)

تست: tsc ۰ خطا، build تمیز، smoke-test (login/logout-revocation/themes/status) سبز،
zip 19MB بدون secret/db.
