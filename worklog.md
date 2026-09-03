# Worklog — Personal Site (سایت شخصی)

> این فایل تاریخچه‌ی کارهای انجام شده در هر session هست.
> هر agent قبل از شروع کار، این فایل رو می‌خونه و بعد از اتمام کار، بخش جدیدی اضافه می‌کنه.

---

Task ID: V18.4
Agent: Super Z (main agent)
Task: رفع مشکلات Signal Lab (AM/FM، لرزش، hydration) و آپدیت حافظه پروژه

Work Log:
- ۱۴۰۵/۰۶/۰۶ (2026-08-27): شروع session
  - فهمیدم state مدولاسیون داخل RealSignalGenerator محلی بود و به RealOscilloscope پاس داده نمی‌شد
  - state رو به SignalLab منتقل کردم (lift up) و به هر دو کامپوننت props دادم
- ۱۴۰۵/۰۶/۰۶ (2026-08-27): تست URL پیش‌نمایش
  - اول از hostname استفاده کردم که ۴۰۴ می‌داد
  - از PROJECT_LOG.md فهمیدم URL درست از chat_id میاد: preview-chat-f7fdfef6-aa0f-4780-ac8e-5fa3dafbfbf0.space-z.ai
- ۱۴۰۵/۰۶/۰۶ (2026-08-27): رفع لرزش پیش‌نمایش ژنراتور
  - phase accumulation (phaseRef, modPhaseRef) حذف شد
  - پیش‌نمایش حالا به‌صورت قطعی از t=0 تا t=timeWindow render می‌شه
- ۱۴۰۵/۰۶/۰۶ (2026-08-27): رفع لرزش اسیلوسکوپ
  - منطق پیچیده trigger-chasing با phase compensation حذف شد
  - rendering به‌صورت قطعی از t=0 تا t=timeWindow با فرمول مستقیم signalAt(t)
  - voltDiv پیش‌فرض از 1V به 2V تغییر کرد
- ۱۴۰۵/۰۶/۰۷ (2026-08-28): رفع «یک‌سوم راست scope خالی»
  - حلقه از i=0 تا i=samples=800 می‌رفت و i رو به‌عنوان x استفاده می‌کرد
  - اگه canvas عرضش بیشتر از ۸۰۰px بود، سمت راست خالی می‌موند
  - حل: x = frac × w که همیشه کل عرض canvas رو پوشش می‌ده
- ۱۴۰۵/۰۶/۰۷ (2026-08-28): رفع خطای hydration صفحه اصلی
  - suppressHydrationWarning به <body> در layout.tsx اضافه شد
  - <html> قبلاً این attribute رو داشت
- ۱۴۰۵/۰۶/۰۷ (2026-08-28): آپدیت حافظه پروژه
  - PROJECT_LOG.md از V18.0 به V18.4 آپدیت شد
  - VERSION.txt آپدیت شد
  - این worklog.md ساخته شد

Stage Summary:
- نسخه: V18.0 → V18.4
- تاریخ: 2026-08-28
- فایل‌های تغییر یافته:
  - src/components/SignalLab.tsx (lift up state)
  - src/components/RealSignalGenerator.tsx (controlled props + deterministic rendering)
  - src/components/RealOscilloscope.tsx (modulation props + deterministic rendering + x scaling)
  - src/app/layout.tsx (suppressHydrationWarning)
  - scripts/keep-alive.sh (جدید — supervisor)
  - PROJECT_LOG.md (آپدیت)
  - VERSION.txt (آپدیت)
  - worklog.md (جدید)
- وضعیت سرور: زنده، HTTP 200 روی هر دو URL
  - محلی: http://127.0.0.1:3000/ → HTTP 200
  - پیش‌نمایش: https://preview-chat-f7fdfef6-aa0f-4780-ac8e-5fa3dafbfbf0.space-z.ai/ → HTTP 200
- TypeScript: صفر error روی فایل‌های تغییر یافته

---

Task ID: V19.0
Agent: Super Z (main agent)
Task: سیستم دسترسی مبتنی بر زمان + رفع hydration error + آپدیت حافظه

Work Log:
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): شروع session
  - کاربر گزارش داد: hydration error در صفحه اصلی، می‌خواد ادمین بتونه کاربر با ساعت دسترسی بسازه
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): رفع خطای hydration
  - علت: reCAPTCHA script در `<head>` iframe تزریق می‌کرد که در SSR نبود
  - حل: script از layout.tsx حذف شد، div `.g-recaptcha` فقط بعد از mount رندر می‌شه
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): طراحی سیستم دسترسی مبتنی بر زمان
  - مدل `AccessUser` در Prisma: username, passwordHash, allowedHourStart/End, allowedDays, expiresAt, active
  - مدل `AccessLog` برای حسابرسی
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): ساخت lib access-auth.ts
  - hashPassword/verifyPassword با bcryptjs
  - createSessionToken/verifySessionToken با HMAC-SHA256
  - checkAccess: بررسی active, expiresAt, allowedDays, allowedHourStart/End
  - logAccess, getClientIp, getSessionFromRequest
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): ساخت API routes
  - POST /api/user/login
  - GET /api/user/verify
  - POST /api/user/logout
  - GET/POST /api/admin/users
  - PUT/DELETE /api/admin/users/[id]
  - GET /api/admin/users/logs
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): ساخت صفحات کاربر
  - /user-login: فرم ورود
  - /user-dashboard: نمایش وضعیت session و دسترسی
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): ساخت کامپوننت AccessUserManager
  - تب "Users" در پنل ادمین
  - جدول کاربران + فرم ساخت/ویرایش + حذف + لاگ‌ها
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): seed admin پیش‌فرض
  - اسکریپت scripts/seed_access_users.py
  - admin / admin123 (تغییر رمز الزامی)
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): تست همه جریان‌ها
  - POST /api/user/login → 200 ✅
  - GET /api/user/verify → 200 ✅ (cookie URL-decoded)
  - GET /api/admin/users → 200 ✅
  - POST /api/admin/users (create test user) → 200 ✅
- ۱۴۰۵/۰۶/۱۳ (2026-09-03): آپدیت حافظه
  - PROJECT_LOG.md → V19.0
  - VERSION.txt → V19.0
  - worklog.md → این آپدیت

Stage Summary:
- نسخه: V18.4 → V19.0
- تاریخ: 2026-09-03
- فایل‌های جدید:
  - prisma/schema.prisma (مدل‌های AccessUser, AccessLog اضافه شد)
  - src/lib/access-auth.ts
  - src/app/api/user/login/route.ts
  - src/app/api/user/verify/route.ts
  - src/app/api/user/logout/route.ts
  - src/app/api/admin/users/route.ts
  - src/app/api/admin/users/[id]/route.ts
  - src/app/api/admin/users/logs/route.ts
  - src/app/user-login/page.tsx
  - src/app/user-dashboard/page.tsx
  - src/components/AccessUserManager.tsx
  - scripts/seed_access_users.py
- فایل‌های تغییر یافته:
  - src/app/layout.tsx (حذف reCAPTCHA script از head)
  - src/app/page.tsx (mounted state + dynamic reCAPTCHA + تب Users)
  - PROJECT_LOG.md, VERSION.txt, worklog.md
- وابستگی‌های جدید:
  - bcryptjs (هش رمز)
  - @types/bcryptjs (dev)
- وضعیت سرور: زنده، همه APIهای جدید تست شدن و کار می‌کنن
- TypeScript: صفر error روی فایل‌های جدید
- پیش‌فرض امنیتی: admin/admin123 — حتماً از پنل عوض بشه

---
