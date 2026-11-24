# گزارش ممیزی ۶۰ کارگر — نسخه ۱ (v1.0)

**دامنه‌ی ممیزی:** کل پروژه — امنیت، کامل بودن پنل ادمین، خطاهای کد، استقرار، بهداشت مخزن
**روش:** ۱۲ گروه تخصصی × ۵ کارگر = **۶۰ کارگر موازی** + بازبینی خودِ دستیار روی همه‌ی یافته‌ها
**نتیجه:** ۱۰۶ یافته → **همه‌ی موارد قابل‌رفع اصلاح شد** (TypeScript صفر خطا، Build بدون خطا، تست دودِ واقعی پاس شد)

---

## ۱) امنیت (mavared-e amniati)

### فوری/بالا
| # | مشکل | اصلاح |
|---|------|-------|
| 1 | دور زدن چک‌های middleware با مسیر کدگذاری‌شده (`/%61pi/...`، `//api/...`) — rate limit و gate های session فرار می‌کردند | نرمال‌سازی مسیر (decode + حذف `//` + حذف `/` انتهایی) قبل از **همه‌ی** چک‌ها |
| 2 | مسیرهای API با پسوند فایل (`/api/admin/x.png`) از middleware کاملاً فرار می‌کردند | matcher جدید: `/api/:path*` همیشه داخل middleware |
| 3 | secret وب‌هوک هرگز توسط Telegram/Bale ارسال نمی‌شد (کلیه deliveryها 403 می‌گرفتند و کانال فرمان ادمین مرده بود) | پذیرش هدر بومی `X-Telegram-Bot-Api-Secret-Token` + مستند `secret_token` در setWebhook |
| 4 | hash ضد-enumeration با cost 10 بود ولی رمزهای واقعی cost 12 — شکاف زمانی ۴ برابری | تولید DUMMY_HASH جدید با cost 12 |
| 5 | کارت‌های skill با محتوای DB برای بازدیدکننده نامرئی بودند (observer فقط یک بار روی mount) | وابستگی observer به طول محتوا + observe دوباره |

### متوسط
- rate limit وب‌هوک‌ها (۶۰/دقیقه) + لاگ `webhook_bad_secret` در SecurityLog
- replay protection: mark **بعد از** پردازش موفق (قبلاً پیام ادمین بعد از خطا برای همیشه گم می‌شد)، TTL ۲۴h، سقف ۱۰k
- `/api/content` دیگر کلیدهای داخلی (مثل `ai.system_prompt`) را افشا نمی‌کند
- `no-store` روی `/api/user/verify`، `/api/chat`، `/api/chat/messages`
- bounded read 5MB در همه‌ی provider ها (پاسخ chunked قبلاً حافظه را می‌بلعید)
- `Bearer undefined` حذف شد؛ استثنای loopback فقط برای provider نوع ollama
- SSRF: محدوده‌های 6to4/Teredo/مستندات بلاک شدند؛ `metadata.goog` اضافه شد؛ باگ استثنای localhost-Ollama در مسیر async رفع شد (پیش‌فرض seed شده کلاً کار نمی‌کرد)
- Content-Length غیرعددی → 413؛ CSRF قبل از rate-limit؛ `formsubmit.co` از CSP حذف شد
- throttle لاگ انکارهای verify (۵ دقیقه) — SQLite دیگر از polling پر نمی‌شود
- لاگین موفق سهمیه per-username را نمی‌سوزاند؛ هشدار TRUST_PROXY در production
- IP مسدودشده از `/api/contact` و `/api/track` هم رد می‌شود
- پاکسازی مقایسه‌های pwTag با timingSafeEqual

## ۲) کامل بودن پنل ادمین (kam boodan-e emkanat)

- **سیستم permissions واقعی شد** — قبلاً چک‌باکس‌های دسترسیِ کاربر محدود فقط ذخیره می‌شدند و هیچ API آن‌ها را چک نمی‌کرد (دروغ گمراه‌کننده). حالا `checkAdminAuth(request, tab)` سمت سرور برای تب‌های پیام/کلیپ/محتوا/متن/منو/تم‌ها permission را می‌سنجد و داشبورد هم همان تب‌ها را نشان می‌دهد
- **یادداشت و تگ پیام** — مدل‌های `MessageNote`/`MessageTag` از قبل در DB بودند ولی هیچ UI و هیچ API نوشتنی نداشتند. حالا از تب پیام‌ها: دکمه «📝 یادداشت» و «🏷️ تگ» + نمایش چیپ‌های تگ
- **دیدن رمز هنگام تغییر** — دکمه 👁 دیدن/پنهان + دکمه 🎲 تولید رمز قوی (۱۶ کاراکتر) + نمایش یک‌باره‌ی رمز بعد از ذخیره با دکمه کپی
- Font tab: دکمه «ثبت به‌عنوان فونت پیش‌فرض سایت» (قبلاً فقط مرورگرِ خود ادمین را عوض می‌کرد)
- حسابرسی اقدامات ادمین روی کاربران (create/update/delete) در SecurityLog

## ۳) خطاهای کد (khata dar code ha)

- درفت اسکیما: ۳ ایندکس ترکیبی فقط در `apply_schema.py` بودند و مسیر `prisma db push` آن‌ها را نمی‌ساخت → به schema.prisma اضافه شدند (+ حذف ایندکس تکراری username)
- `db.ts`: DATABASE_URL بدون `file:` قبلاً بی‌صدا db خالی می‌ساخت → حالا fail-fast؛ مسیر encode می‌شود
- نام کاربری: POST فقط طول را چک می‌کرد و PUT حروف بزرگ را قبول می‌کرد → اکانتِ غیرقابل‌لاگین؛ حالا هر دو مسیر lowercase + همان regex
- DELETE کاربر فقط ۵۰۰ لاگ آخر را آرشیو می‌کرد (بقیه با Cascade نابود می‌شدند) و شکست آرشیو پوشانده می‌شد → آرشیو کامل صفحه‌بندی‌شده + توقف حذف در صورت شکست
- `Boolean("false")` = true بود → strict boolean؛ تاریخ نامعتبر در POST → 400؛ P2002 در PUT → 409
- context چت قدیمی‌ترین ۲۰ پیام را می‌فرستاد → آخرین ۲۰ (ترتیب زمانی درست)
- GET ادمین چت بدون take بود → take: 200
- کانال نگهداری جدید: بک‌آپ با `sqlite3 .backup` (snapshot سازگار)، clamp ها، mktemp + trap
- localStorage بلاک‌شده dashboard را کرش می‌داد → try/catch همه‌جا
- `safeHref` آدرس‌های `//evil.com` را رد می‌کند؛ iframe آموزش فقط https؛ time-trap از اولین تعامل (نه mount) — پیام انسان‌های سریع دیگر دور ریخته نمی‌شود
- visitorCount فقط عدد؛ embedCode در create الزامی؛ P2025 → 404 در themes/nav/equipment/providers (update+delete)

## ۴) استقرار (VPS)

- **install.sh:** توقف سرویس قبل از دست‌زدن به WAL (data loss در re-run)؛ مسیر مطلق nginx conf در شاخه‌ی standalone؛ تشخیص پورت SSH کامل‌تر (socket-activated)؛ استانداردسازی استخراج .env (`cut -d= -f2- | tr -d '"'`) — مقدار unquoted دیگر secret را خالی/بازتولید نمی‌کند؛ حفظ TRUST_PROXY/PORT/HOSTNAME؛ certbot فقط با www موجود در DNS؛ retry تست سلامت ۱۵ ثانیه‌ای؛ `DEBIAN_FRONTEND`؛ مدیریت خطای NodeSource؛ پوشش swap پارتیشنی
- **چک آیتم‌به‌آیتم وابستگی‌ها:** هر ابزار که نبود فقط همان نصب می‌شود (node/nginx/sqlite3/python3/ufw/certbot/openssl/dnsutils/unzip/jq/logrotate)
- **MAINTENANCE_TOKEN** تولید + فایل 600 + چاپ یک‌باره
- systemd: ReadWritePaths شامل backups؛ دایرکتوری backups با owner سرویس
- nginx: `server_tokens off`، catch-all `return 444`، limit_req روی login و maintenance
- docker: chown دایرکتوری‌های prisma؛ compose سینتکس ساده + `cap_drop: ALL` + `no-new-privileges`؛ entrypoint: شکست db push = توقف (نه ادامه‌ی کور)، WAL بعد از push، شمارش admin غیرعددی → seed
- اسکریپت‌ها: `resolve_db` در export-site (قبلاً از db کهنه export می‌کرد!)؛ checkpoint قبل از کپی rollback در restore؛ strip query params؛ reset-admin-password: root-gate + cost 12 + ابطال sessionها + لاگ syslog/SecurityLog + بدون فعال‌سازی بی‌صدا

## ۵) بهداشت مخزن

- `bun.lock` منسق حذف شد (package-lock مرجع است)
- `.env.example` ساخته شد (بدون مقدار واقعی)
- قوانین negation ی zip/docx در .gitignore حذف شدند (توزیع با Release، نه repo)
- schema comment گمراه‌کننده‌ی "Encrypted API key" اصلاح شد — مستند: کلیدها plaintext در SQLite با حفاظت فایل 600

## موارد پذیرفته‌شده/مستندشده (رفع نشد — با دلیل)

1. **رمزنگاری apiKey در DB** — نیازمند کلید master و مهاجرت داده؛ فعلاً حفاظت با chmod 600 دیتابیس/بک‌آپ‌ها + مستند
2. **nonce-based CSP** — نیاز به تست کامل inline scripts و reCAPTCHA؛ در نسخه بعد
3. **DNS pinning با undici dispatcher** — mitigations موجود (admin-only، https+443، redirect manual) ریسک rebinding را عملی نمی‌کنند
4. **credential اختصاصی برای session چت بازدیدکننده** — visitorId می‌ماند (تصادفی UUID، حدس‌ناپذیر)؛ نسخه بعد
5. رمزهای رد شده‌ی verify در AccessLog (با throttle) به‌جای SecurityLog — صرفه‌جویی تغییر

**وضعیت نهایی:** TypeScript 0 خطا · Build موفق · تست دود واقعی: صفحه 200، `/api/maintenance` با توکن درست 200 + بک‌آپ ساخته شد، توکن غلط/بدون توکن 401، مسیرهای encode‌شده fail-closed.

---
# v1.0 — دور ممیزی عمیق RBAC + کانال ویرایش از دور (rev2)

## یافته‌های RBAC (اصلاح شد)
- نقش مالک (owner) بالاتر از admin معرفی شد — seed/install.sh/migration idempotent.
- ادمین فقط کاربران عادی را مدیریت می‌کند (canManageTarget)؛ ساخت ادمین فقط با مالک.
- حساب مالک از پنل قابل حذف/تنزل/غیرفعال‌سازی نیست (owner_* error codes).
- تغییر رمز مالک در /api/admin/security (قبلاً 404) → isElevated.
- شمارش «آخرین ادمین فعال» شامل owner → قفل پنل ناممکن.
- تعریف‌های تکراری GRANTABLE/TAB_PERMISSIONS تجمیع شد در src/lib/rbac.ts.
- UI آگاه از نقش بیننده (AccessUserManager از /api/user/verify).

## کانال ارتباطی امن (تکمیل شد)
- کانال خواندن قبلی (MAINTENANCE_TOKEN) تایید شد؛ کانال ویرایش جدید
  (MAINTENANCE_EDIT_TOKEN ≥48 کاراکتر، هدر X-Maintenance-Edit-Token) اضافه شد.
- ۱۹ action سفید-لیست با اعتبارسنجی کامل؛ SecurityLog برای همه؛ secrets هرگز.
- sync-from-online.sh + apply-online-export.mjs — همگام‌سازی آفلاین↔آنلاین + گیت.

## تست دودی (production build)
- scripts/smoke-rbac.sh — 28/28 PASS: logins، users CRUD با سلسله‌مراتب،
  owner immutability، تغییر رمز مالک، دو توکن نگهداری، export-all، rate limit.

## کامنت‌گذاری فارسی
- ۳۱ فایل فاقد کامنت فارسی → سرصفحه فارسی؛ پوشش کامل src/**, scripts/*.

## نسخه و بسته
- همه‌چیز «نسخه‌ی یک (v1.0)»؛ zip رسمی: ehsan-site-v1.0-<تاریخ شمسی>.zip
  (سورس + docs Word فارسی + install.sh + scripts) — در download/ و releases/.
