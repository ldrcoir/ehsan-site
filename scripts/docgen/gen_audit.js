// ============================================================================
// gen_audit.js — ساخت AUDIT-REPORT-FA_v1.docx — گزارش ممیزی فارسی — v1.0
// ============================================================================
// معماری سه‌سکشنی مثل آموزش: جلد → فهرست (رومی) → بدنه (عربی از ۱).
// محتوا: نتیجه‌ی این دور ممیزی — RBAC، کانال امن، تست دودی ۲۸/۲۸، ریسک‌ها.
// ============================================================================

const {
  Document, Packer, Paragraph, TextRun, Header, Footer, PageBreak,
  AlignmentType, PageNumber, NumberFormat, SectionType, TableOfContents,
  BorderStyle,
} = require("docx");
const fs = require("fs");
const { PALETTE, rtlRun, fa, h1, h2, codeLine, faTable, tableTitle, note, faList } = require("./rtl");
const { buildCoverR1RTL } = require("./cover");

const FA = { ascii: "Tahoma", hAnsi: "Tahoma", eastAsia: "Tahoma", cs: "Tahoma" };
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1417, right: 1701 };

function faFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FA, color: "666666" })],
    })],
  });
}

function faHeader() {
  return new Header({
    children: [new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START,
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PALETTE.accent, space: 4 } },
      spacing: { after: 60 },
      children: [rtlRun("گزارش ممیزی نسخه‌ی یک — سایت شخصی ehsanmorad.ir", { size: 16, color: "888888" })],
    })],
  });
}

const B = [];

// --- خلاصه اجرایی ---
B.push(h1("۱ — خلاصه‌ی اجرایی"));
B.push(fa("این گزارش نتیجه‌ی دور جدید ممیزی امنیتی و کارکردی سایت شخصی احسان مرادی در مسیر انتشار «نسخه‌ی یک (v1.0)» است. محور اصلی این دور، بازبینی عمیق سیستم تعریف کاربران و دسترسی‌های ادمین (RBAC) بود — همان حوزه‌ای که در ممیزی‌های قبلی به‌صورت کامل پاک‌سازی نشده بود — به‌همراه تکمیل کانال ارتباطی امن بین نگهدارنده و سایت و اجرای مجموعه‌ی تست دودی روی نسخه‌ی بیلد واقعی."));
B.push(fa("جمع‌بندی در یک نگاه: تمام مسیرهای API ادمین و صفحات پنل مجدداً ردیف شد؛ نقش مالک (owner) به‌عنوان سطح بالاتر از ادمین معرفی و در همه‌ی لایه‌ها اعمال شد؛ تعریف‌های تکراری نقش‌ها/تب‌ها در یک ماژول واحد تجمیع شد؛ کانال نگهداری با دو توکن (خواندن/ویرایش) تکمیل و با تست واقعی تأیید شد؛ و ۲۸ تست دودی همه سبز شدند. هیچ یافته‌ی بحرانی جدیدی خارج از حوزه‌ی RBAC پیدا نشد."));
B.push(fa("به‌دنبال درخواست مجدد مالک سایت، دور سومی از ممیزی (rev3) با ۴ worker موازی (امنیت، کامل‌بودن پنل، باگ‌های runtime، استقرار/بسته‌بندی) روی کل سورس انجام شد. نتیجه‌ی این دور در بخش‌های ۸ تا ۱۰ همین گزارش آمده است؛ مهم‌ترین خروجی آن، رمزنگاری واقعی کانال نگهداری با AES-256-GCM و رفع یک ایراد بحرانی بسته‌بندی بود (zip قبلی فقط-سورس بود و روی سرور تازه نصب نمی‌شد)."));

// --- حوزه ممیزی ---
B.push(h1("۲ — دامنه‌ی ممیزی و روش کار"));
B.push(fa("دامنه‌ی بازبینی: کل ۳۱ مسیر API، صفحه‌ی پنل ادمین، middleware، کتابخانه‌های احراز هویت و دسترسی، اسکیمای دیتابیس (۲۹ مدل)، اسکریپت‌های نصب/نگهداری، و جریان‌های همگام‌سازی. روش کار: بازخوانی خط‌به‌خط مسیرهای حساس، ردیابی ماتریس دسترسی از رابط کاربری تا کوئری دیتابیس، و سپس اجرای بیلد production و مجموعه‌ی تست دودی روی سرور واقعی محلی."));
B.push(tableTitle("جدول ۲-۱ — چک‌لیست مسیرهای ادمین و وضعیت گارد"));
B.push(faTable(
  ["مسیر", "گارد", "وضعیت"],
  [
    ["/api/admin/* (۱۶ مسیر)", "checkAdminAuth + middleware HMAC", "سالم"],
    ["/api/messages", "تب messages (واگذارشدنی)", "سالم"],
    ["/api/admin/users (+[id])", "گارد کامل + سلسله‌مراتب نقش جدید", "تقویت شد"],
    ["/api/admin/clear", "target-by-target (ادمین-only برای چت/آمار)", "سالم"],
    ["/api/admin/security", "isElevated — شامل owner شد", "رفع شد"],
    ["/api/user/login | verify | logout", "pwTag + revocation + schedule", "سالم"],
    ["/api/maintenance", "دو توکن timing-safe + whitelist", "تقویت شد"],
    ["webhookها (Bale/Telegram)", "HMAC secret + timingSafeEqual", "سالم"],
    ["مسیرهای عمومی (content/clips/contact/chat/track)", "فیلتر فیلدها + reCAPTCHA + rate limit", "سالم"],
  ],
  [34, 40, 26]
));

// --- RBAC ---
B.push(h1("۳ — یافته‌های RBAC و اصلاحات"));
B.push(fa("در بازبینی، وضعیت قبلی سیستم نقش‌ها این‌ها بود: تعریف نقش فقط دو سطحی بود (admin/user) و «مالک سایت» از نظر دسترسی هم‌تراز ادمین‌های دیگر بود؛ هر ادمین می‌توانست ادمین دیگری بسازد، ویرایش یا حذف کند؛ شمارش «آخرین ادمین فعال» فقط نقش admin را می‌دید؛ تغییر رمز در /api/admin/security فقط برای نقش admin جواب می‌داد و حساب مالکِ فرضی با خطای 404 مواجه می‌شد؛ و لیست تب‌های واگذارشدنی در چهار فایل تکرار شده بود که ریسک ناهماهنگی بین UI و سرور داشت."));
B.push(tableTitle("جدول ۳-۱ — اصلاحات RBAC این دور"));
B.push(faTable(
  ["یافته", "شدت", "اصلاح"],
  [
    ["نداشتن نقش مالک؛ مالک هم‌تراز ادمین بود", "بالا", "نقش owner معرفی شد؛ seed و install.sh حساب admin را owner می‌کنند؛ مهاجرت idempotent دیتابیس‌های قدیمی"],
    ["ادمین می‌توانست ادمین دیگر را بسازد/ویرایش/حذف کند", "بالا", "canManageTarget: ادمین فقط حساب‌های user را مدیریت می‌کند؛ ساخت ادمین فقط با مالک"],
    ["حساب مالک از پنل قابل حذف/غیرفعال‌سازی بود", "بالا", "owner_account_immutable / owner_cannot_be_deleted / cannot_deactivate_owner در سرور"],
    ["تغییر رمز برای نقش مالک خطای 404 می‌داد", "متوسط", "چک نقش با isElevated — owner هم می‌تواند رمزش را عوض کند"],
    ["شمارش آخرین ادمین، owner را نمی‌دید", "متوسط", "شمارش elevated شامل owner و admin؛ قفل شدن پنل ناممکن است"],
    ["تعریف تکراری GRANTABLE/TAB_PERMISSIONS در ۴ فایل", "پایین", "تجمیع در src/lib/rbac.ts (تک منبع حقیقت) و re-export برای سازگاری"],
    ["UI نقش بیننده را نمی‌دانست", "پایین", "AccessUserManager نقش را از verify می‌خواند؛ دکمه‌های حساس فقط برای مالک رندر می‌شوند"],
    ["کلیدهای ai.* و aiInstruction فقط admin بودند", "پایین", "هم‌سو با isElevated — مالک هم مجاز"],
  ],
  [40, 12, 48]
));
B.push(note("قواعد طلایی نهایی در src/lib/rbac.ts مستند شده‌اند: نقش owner هرگز از API ساخته/تغییر/حذف نمی‌شود؛ ادمین فقط در محدوده‌ی کاربران عادی اختیار دارد؛ تب‌های حساس (کاربران، تنظیمات، آمار، امنیت، ارائه‌دهنده‌ها، ایمیل، چت) هرگز واگذار نمی‌شوند."));

// --- کانال امن ---
B.push(h1("۴ — کانال ارتباطی امن نگهدارنده ↔ سایت"));
B.push(fa("پاسخ به پرسش «کانال ارتباطی امن خودت و سایت ساخته شد؟»: بله — کانال نگهداری اختصاصی در مسیر /api/maintenance موجود بود و در این دور به سطح «ویرایش از دور» تکمیل شد. معماری امنیتی نهایی:"));
B.push(...faList([
  "دو توکن جدا: توکن خواندن (X-Maintenance-Token، حداقل ۳۲ کاراکتر) و توکن ویرایش (X-Maintenance-Edit-Token، حداقل ۴۸ کاراکتر) — هر دو با timingSafeEqual و fail-closed (نبودن/کوتاهی توکن یعنی کانال خاموش).",
  "بدون کوکی و session — حملات CSRF ذاتاً بی‌اثر است؛ محدودیت نرخ ۶۰ درخواست در ۵ دقیقه در middleware.",
  "actionهای خواندن سفید-لیست: status، db-stats، security-logs، messages، chats، backup.",
  "actionهای ویرایش سفید-لیست: texts.set، settings.set، nav.add/set-visible/delete، clip.add/set-visible/delete، equipment.set، content.set-visible، export-all — هر یک با اعتبارسنجی طول، whitelist کلید، sanitize امبد و رد کلیدهای محرمانه.",
  "خروجی همیشه بدون راز: توکن‌های ربات ماسک می‌شوند و export-all هرگز کلید محرمانه نمی‌دهد.",
  "ردپای کامل: هر فراخوانی موفق/ناموفق (احراز، action ناشناخته، ویرایش) در SecurityLog با IP و جزئیات target ثبت می‌شود.",
  "کلاینت آماده: scripts/maintenance.sh (خواندن + ویرایش با --data) و گردش همگام‌سازی scripts/sync-from-online.sh + scripts/apply-online-export.mjs برای اینکه نسخه‌ی آفلاین دقیقاً مثل آنلاین شود و در گیت برود.",
]));
B.push(fa("هم‌چنین برای اولین ورود و رفع قفل‌شدگی، مسیرهای از خود سرور حفظ شدند: install.sh رمز مالک و هر دو توکن را یک بار چاپ و در فایل‌های 600 ذخیره می‌کند و reset-admin-password.sh ریست امن رمز را فقط روی سرور ممکن می‌کند."));

// --- تست دودی ---
B.push(h1("۵ — نتایج تست دودی (۲۸/۲۸)"));
B.push(fa("بعد از بیلد production، سرور روی پورت محلی بالا آمد و مجموعه تست دودی scripts/smoke-rbac.sh اجرا شد. نتیجه: ۲۸ پاس، ۰ شکست. مهم‌ترین سناریوهای تأییدشده:"));
B.push(tableTitle("جدول ۵-۱ — سناریوهای کلیدی تست شده"));
B.push(faTable(
  ["سناریو", "نتیجه مورد انتظار", "نتیجه"],
  [
    ["ورود owner/admin/user", "کوکی session معتبر", "۲۰۰ ✓"],
    ["لیست کاربران توسط کاربر محدود", "401", "401 ✓"],
    ["ویرایش حساب مالک توسط ادمین", "403 owner_account_immutable", "403 ✓"],
    ["حذف حساب مالک توسط ادمین", "403 owner_cannot_be_deleted", "403 ✓"],
    ["ساخت ادمین توسط ادمین", "403 only_owner_creates_admin", "403 ✓"],
    ["تغییر نقش خودِ مالک", "403 owner_role_immutable", "403 ✓"],
    ["ساخت و حذف ادمین توسط مالک", "200", "200 ✓"],
    ["مدیریت کاربر محدود توسط ادمین", "200", "200 ✓"],
    ["تغییر رمز مالک (قبلاً 404)", "200", "200 ✓"],
    ["texts.set بدون توکن ویرایش", "403 edit_token_required", "403 ✓"],
    ["texts.set با توکن ویرایش", "200 + ذخیره واقعی در DB", "200 ✓"],
    ["settings.set با کلید محرمانه", "رد key_not_allowed", "رد ✓"],
    ["export-all", "dump کامل جدول‌های قابل ویرایش", "200 ✓"],
    ["توکن اشتباه کانال نگهداری", "401 + لاگ امنیتی", "401 ✓"],
  ],
  [44, 32, 24]
));
B.push(note("نکته‌ی مشاهده‌شده در تست: rate limit ورود (۵ تلاش در ۱۵ دقیقه به‌ازای هر IP) در اجراهای متوالی تست فعال می‌شود — این رفتار درست و مطلوب است و در تست‌ها با ری‌استارت سرویس جا افتاد."));

// --- تغییرات ---
B.push(h1("۶ — تغییرات این نسخه (خلاصه فنی)"));
B.push(...faList([
  "فایل جدید src/lib/rbac.ts — تک منبع حقیقت نقش‌ها، تب‌های واگذارشدنی، ماتریس مدیریت هدف و قواعد.",
  "src/lib/admin-auth.ts — پذیرش نقش owner با isElevated و برگرداندن نقش واقعی.",
  "src/app/api/admin/users/route.ts و [id]/route.ts — اعمال کامل سلسله‌مراتب در ساخت/ویرایش/حذف + پیام‌های خطای دقیق.",
  "src/app/api/admin/security/route.ts — تغییر رمز برای owner؛ src/app/api/admin/text و content — isElevated برای کلیدهای AI.",
  "src/app/user-dashboard/page.tsx و src/components/AccessUserManager.tsx — آگاهی UI از نقش: برچسب مالک، دراپ‌داون نقش مبتنی بر بیننده، مخفی‌کردن دکمه‌های خارج از اختیار.",
  "src/app/api/maintenance/route.ts — کانال ویرایش با ۱۹ action، توکن سطح دوم، اعتبارسنجی و لاگ کامل.",
  "src/middleware.ts — نرخ کانال نگهداری ۶۰/۵دقیقه.",
  "scripts/maintenance.sh — پشتیبانی --data و هدر توکن ویرایش؛ scripts/sync-from-online.sh و scripts/apply-online-export.mjs جدید.",
  "install.sh — تولید MAINTENANCE_EDIT_TOKEN، ذخیره‌ی فایل 600، چاپ یک‌بار، و تضمین نقش مالک با UPDATE idempotent.",
  "scripts/seed_access_users.py — ساخت حساب اولیه با نقش owner.",
  "کامنت‌گذاری فارسی سرصفحه برای ۳۱ فایل فاقد کامنت فارسی — پوشش کامل سورس.",
]));

// --- ریسک‌های باقی‌مانده ---
B.push(h1("۷ — ریسک‌های باقی‌مانده و توصیه‌ها"));
B.push(tableTitle("جدول ۷-۱ — ریسک‌های شناخته‌شده و تخفیف‌دهنده‌ها"));
B.push(faTable(
  ["ریسک", "تخفیف‌دهنده‌ی موجود", "توصیه"],
  [
    ["ذخیره‌ی کلید ارائه‌دهنده‌های AI به‌صورت متن ساده در SQLite", "دسترسی 600 روی دیتابیس و بک‌آپ‌ها؛ اپ فقط روی loopback", "در نسخه‌ی بعد رمزنگاری در-at-rest (مثلاً AES با کلید env)"],
    ["rate limit در حافظه‌ی پروسه", "استقرار تک‌نمونه‌ای + nginx", "در صورت چندنمونه‌شدن، مهاجرت به Redis"],
    ["افشای توکن نگهداری/ویرایش در دستگاه نگهدارنده", "توکن فقط در .env سرور و فایل‌های 600", "پس از هر نشست، env را پاک کن؛ در صورت لو رفتن، توکن را در .env عوض و سرویس را ری‌استارت کن"],
    ["reCAPTCHA پیکربندی‌نشده = خاموشی فرم تماس", "fail-closed (شکست امن، نه باز)", "بلافاصله بعد از نصب کلید بگیر و ست کن"],
    ["بک‌آپ فقط روی همان سرور", "cron شبانه + نگه‌داری ۷ نسخه", "به‌صورت دوره‌ای بک‌آپ را off-server ببر (scp/rsync)"],
  ],
  [34, 30, 36]
));
B.push(fa("جمع‌بندی: با اعمال اصلاحات این دور، سیستم دسترسی سایت از حالت دو سطحیِ پراکنده به مدل سه‌سطحی مالک/ادمین/کاربر با اعمال سرور اجباری رسید؛ کانال امن نگهدارنده هم خواندن و هم ویرایش امن از دور را با ردپای کامل حسابرسی پوشش می‌دهد؛ و تست دودی واقعی سلامت کل جریان را تأیید کرد. نسخه‌ی یک برای استقرار روی VPS آماده است.", { after: 200 }));

// ============================================================
// دور rev3 — رمزنگاری کانال، ممیزی مجدد با ۴ worker، رفع ایراد بحرانی بسته‌بندی
// ============================================================
B.push(h1("۸ — دور سوم ممیزی (rev3): رمزنگاری کانال نگهداری"));
B.push(fa("در این دور کانال نگهداری از حالت «توکن-محض» به رمزنگاری کامل درخواست و پاسخ ارتقا یافت تا هیچ ناظری در مسیر (پروکسی، لاگ شبکه) حتی محتوای دستورها را هم نبیند:", { after: 120 }));
B.push(...faList([
  "کلید رمز: MAINTENANCE_ENC_KEY (۶۴ کاراکتر hex = ۳۲ بایت) — install.sh تولید و یک بار چاپ می‌کند؛ کپی امن در db/.maintenance-enc-key.txt با دسترسی 600.",
  "قالب پاکت: AES-256-GCM — base64(iv[12B] | ciphertext | tag[16B]) داخل {\"enc\":\"v1\"} — احراز صحت داخلی GCM هر دستکاری را رد می‌کند.",
  "ضد replay: داخل پیام زمان (پنجره‌ی ±۵ دقیقه) و nonce یک‌بارمصرف (کش ۱۰ دقیقه‌ای با سقف ۱۰ هزار) — پخش دوباره‌ی همان پاکت با enc_replay_detected رد می‌شود.",
  "fail-closed: وقتی کلید تنظیم شده، درخواست متنیِ خام با 426 رد می‌شود؛ پاسخ هم با همان کلید رمز برمی‌گردد.",
  "کلاینت: scripts/maintenance-enc.mjs — maintenance.sh و sync-from-online.sh و smoke-rbac.sh خودکار رمز می‌کنند؛ مقایسه‌ی توکن‌ها هم روی digest SHA-256 شد تا حتی طول توکن از زمان اجرا لو نرود.",
]));
B.push(fa("نتیجه‌ی تست واقعی روی بیلد production: status رمزشده → ۲۰۰ با decrypt خودکار؛ درخواست متنی → 426؛ پخش دوباره‌ی همان پاکت → 400 enc_replay_detected؛ پاکت با زمان کهنه → 400 enc_stale_timestamp؛ export-all رمزشده → ۲۰۰ سالم.", { after: 160 }));

B.push(h1("۹ — یافته‌های دور rev3 و اصلاحات"));
B.push(fa("چهار worker موازی (امنیت، کامل‌بودن پنل، باگ runtime، استقرار) کل سورس، اسکریپت‌ها و بسته‌ی انتشار را مجدد بررسی کردند. مهم‌ترین یافته‌ها و اصلاحات:", { after: 120 }));
B.push(tableTitle("جدول ۹-۱ — یافته‌های کلیدی دور rev3"));
B.push(faTable(
  ["یافته", "شدت", "اصلاح"],
  [
    ["zip انتشار فقط-سورس بود ولی install.sh بیلد pre-built می‌خواست → نصب تازه crash-loop می‌کرد", "بحرانی", "zip رسمی حالا standalone است (server.js + node_modules + .next/static)؛ install.sh هم fail-fast با پیام شفاف شد"],
    ["bcryptjs در بیلد standalone نبود → seed ادمین روی نصب تمیز fatal می‌شد", "بحرانی", "افزودن به outputFileTracingIncludes در next.config.ts"],
    ["clear_logs کل تاریخچه‌ی امنیتی را بی‌ردپا پاک می‌کرد", "متوسط", "فقط owner + ثبت security_logs_cleared با شمارنده و IP actor"],
    ["بدنه و پاسخ کانال نگهداری رمز نبود", "متوسط", "پاکت AES-256-GCM + ضد replay (بخش ۸)"],
    ["ساعتِ poll چت از کلاینت — با ساعتِ جلو، پاسخ‌ها برای همیشه گم می‌شدند", "متوسط", "serverTime بی‌قیدوشرط از سرور پذیرفته می‌شود"],
    ["grecaptcha.getResponse گارد نداشت → دکمه‌ی submit قفل ابدی", "متوسط", "try/catch + عدم قفل‌ماندن submitting"],
    ["owner در تب کاربران دکمه‌ی ویرایش ردیف خودش را نداشت", "متوسط", "UI با دسترسی واقعی سرور هم‌سو شد"],
    ["خواندن ai.* برای کاربر limited باز بود (نوشتنش بسته بود)", "پایین", "فیلتر خواندن هم‌تراز نوشتن"],
    ["install.sh re-run کانفیگ TLS certbot را بازنویسی می‌کرد", "متوسط", "تشخیص ssl_certificate و پرش از بازنویسی"],
    ["shebang دو اسکریپت بعد از کامنت بود → خطای اجرا", "متوسط", "انتقال به خط اول (sync-from-online.sh، smoke-rbac.sh)"],
    ["کامنت‌گذاری فارسی روی ۳۱ فایل + مستندات rev3", "پایین", "همه‌ی فایل‌های سورس سرصفحه‌ی فارسی دارند"],
  ],
  [46, 12, 42]
));

B.push(h1("۱۰ — تست دور rev3"));
B.push(fa("بعد از اعمال اصلاحات، بیلد production از نو گرفته شد و scripts/test-harness.sh اجرا شد: ابتدا ۲۸ تست دودی RBAC (این بار خودِ تست هم روی کانال رمز اجرا شد) و سپس ۵ تست اختصاصی کانال رمزنگاری — هر ۳۳ چک سبز. چرخه‌ی کامل «ویرایش از دور → همگام‌سازی آفلاین → git push» با export-all رمزشده تأیید شد.", { after: 160 }));

const cover = buildCoverR1RTL({
  palette: PALETTE.cover,
  englishLabel: "SECURITY & FUNCTIONALITY AUDIT  //  v1.0 rev3",
  titleLines: ["گزارش ممیزی امنیت و", "کارکرد — نسخه‌ی یک"],
  titlePt: 32,
  subtitle: "RBAC، کانال نگهداری رمزنگاری‌شده (AES-256-GCM)، ممیزی مجدد با ۴ worker، تست ۳۳/۳۳",
  metaLines: [
    "نسخه: ۱ rev3 (v1.0) — دورهای ممیزی: RBAC + رمزنگاری کانال + ممیزی مجدد",
    "دامنه‌ی ممیزی: ۳۱ مسیر API + پنل + middleware + نصب + بسته‌بندی",
    "نتیجه تست: ۲۸ تست دودی + ۵ تست کانال رمز — همه پاس",
    "خروجی: اصلاحات اجرا شده و تاییدشده روی بیلد واقعی",
  ],
  footerRight: "سند حسابرسی رسمی — فارسی",
  footerLeft: "personal-site v1.0 rev3",
  topSpacing: 3400,
  bottomSpacing: 2600,
});

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: FA, size: 24, color: PALETTE.body },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  features: { updateFields: true },
  sections: [
    {
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: cover,
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: faFooter() },
      children: [
        new Paragraph({
          bidirectional: true,
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360, line: 380, lineRule: "atLeast" },
          children: [rtlRun("فهرست مطالب", { bold: true, size: 32, color: PALETTE.primary })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          bidirectional: true,
          spacing: { before: 200 },
          children: [rtlRun("یادآوری: این فهرست با کد فیلد ساخته شده است؛ بعد از هر تغییر روی فهرست راست‌کلیک و Update Field بزن.", { italics: true, size: 18, color: "888888" })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: faHeader() },
      footers: { default: faFooter() },
      children: B,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/AUDIT-REPORT-FA_v1.docx", buf);
  console.log("OK AUDIT-REPORT-FA_v1.docx", buf.length, "bytes");
});
