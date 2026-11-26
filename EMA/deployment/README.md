# پوشه استقرار — EMA/deployment/

این پوشه شامل تمام فایل‌های لازم برای استقرار سایت احسان مراد (ehsanmorad.ir)
روی سرور مجازی است. همه متن با حروف فارسی نوشته شده است.

## ترتیب خواندن

| # | فایل | محتوا |
|---|------|-------|
| ۰۱ | `01-UPLOAD-ZIP/ehsan-site-v1.0-rev5-1405-09-05.zip` | پکیج نصب (۱۳.۸ MB) — شامل کد، node_modules سبک، اسکریپت‌ها |
| ۰۲ | `۰۲-راهنمای-نصب-سایت.docx` | راهنمای مفصل نصب روی VPS (۱۲ بخش) |
| ۰۳ | `۰۳-راهنمای-وصل-هوش-مصنوعی.docx` | راهنمای تنظیم کانال امن چهارلایه |
| ۰۴ | `۰۴-راهنمای-ایجنت-ارزان‌تر.docx` | راهنمای استفاده از ایجنت ارزان‌تر + System Prompt آماده |
| ۰۵ | `05-CHEAT-SHEET.txt` | برگه تقلب — همه فرمان‌ها در یک فایل |

## حقایق کلیدی

- **دامنه:** ehsanmorad.ir
- **سرور:** 31.70.76.10 (VPS)
- **گیت‌هاب:** github.com/ldrcoir/ehsan-site
- **نسخه:** 1.0 rev5 (1405/09/05)
- **حجم zip:** ۱۳.۸ مگابایت — حدود ۶ MB موتور Prisma (الزامی)، بقیه Next.js و react-dom

## چرا zip ۱۳.۸ مگابایت است؟

```
موتور کوئری Prisma (libquery_engine-debian-openssl-3.0.x.so.node)   ~۶ MB فشرده
موتور Next.js (next/dist/)                                          ~۳ MB
react-dom (SSR)                                                     ~۱ MB
سایر وابستگی‌ها                                                      ~۲ MB
فایل‌های استاتیک build شده                                          ~۱.۵ MB
```

این حجم برای stack Next.js + Prisma + SQLite طبیعی است. موتور Prisma را نمی‌توان
حذف کرد چون بدون آن دیتابیس کار نمی‌کند.

## امنیت — چهار لایه

1. **لیست مجاز IP** (`MAINTENANCE_IP_ALLOWLIST`) — فقط IPهای مجاز دسترسی دارند
2. **توکن خواندن** (`MAINTENANCE_TOKEN`) — ۳۲+ کاراکتر برای عملیات خواندن
3. **توکن ویرایش** (`MAINTENANCE_EDIT_TOKEN`) — ۴۸+ کاراکتر برای عملیات ویرایش
4. **رمزنگاری AES-256-GCM** (`MAINTENANCE_ENC_KEY`) — بدنه + nonce + timestamp ضد replay

حالت **AI-Bind** (`--ai-bind`) حتی خواندن را هم به توکن ویرایش گره می‌زند —
امن‌ترین حالت برای وقتی AI سایت را مدیریت می‌کند.

## گردش‌کار نصب

```
۱. scp zip به سرور
۲. unzip در /home/ehsan/personal-site
۳. curl ifconfig.me (IP خود را پیدا کن)
۴. ./install.sh --ai-bind --ip-allowlist "YOUR_IP"
۵. توکن‌ها را ذخیره کن (db/.maintenance-*.txt)
۶. https://ehsanmorad.ir/admin/login → با رمز admin وارد شو
۷. reCAPTCHA و بات‌ها را تنظیم کن
۸. bash scripts/maintenance.sh --ai-bind status (تست کانال)
```

## هشدارهای امنیتی

- **هرگز** فایل `.env` یا `db/.maintenance-*-token.txt` را به کسی نفرستید
- **هرگز** این فایل‌ها را در گیت‌هاب commit نکنید
- اگر توکن لو رفت، `install.sh` را دوباره اجرا کنید تا توکن‌های جدید تولید شوند
- رمز admin را هر ۳ ماه یک‌بار عوض کنید

## همگام‌سازی سه‌لایه

```
سرور (آنلاین)  ↔  گیت‌هاب (snapshot)  ↔  آفلاین (نسخه محلی)
```

- سرور → گیت‌هاب: `bash AI/sync-server-to-github.sh`
- گیت‌هاب → آفلاین: `bash AI/sync-from-github-to-offline.sh`
- اعمال snapshot: `node AI/apply-snapshot.mjs snapshot.json`

## پشتیبانی ایجنت ارزان‌تر

اگر AI فعلی گران شد، به سند ۰۴ رجوع کنید. کانال نگهداری کاملاً مستقل از AI است
و هر ایجنت ارزان‌تری (GPT-4o-mini، GLM-4 Flash، Gemini Flash، حتی Llama محلی)
می‌تواند با کپی System Prompt بخش ۵ سند ۰۴ کار را ادامه دهد.
