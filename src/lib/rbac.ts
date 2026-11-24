// ============================================================================
// rbac.ts — ماژول واحد نقش‌ها و دسترسی‌ها (RBAC) — v1.0
// ============================================================================
// «تک منبع حقیقت» برای کل سیستم دسترسی سایت. قبلاً تعریف نقش‌ها و لیست تب‌های
// واگذارشدنی در چند فایل پراکنده تکرار شده بود (admin-auth.ts، users/route.ts،
// users/[id]/route.ts، AccessUserManager.tsx، user-dashboard/page.tsx) و همین
// پراکندگی باعث می‌شد قواعد بین سرور و UI ناهماهنگ بمانند. حالا همه‌جا از همین
// فایل import می‌شود.
//
// سلسله‌مراتب نقش‌ها (بالا به پایین):
//   owner  — مالک سایت (حساب شخصی ehsan). بالاتر از همه؛ فقط از خود سرور
//            (install.sh / seed / reset-admin-password.sh) ساخته و ریست می‌شود و
//            از طریق پنل قابل حذف/تنزل/غیرفعال‌سازی نیست.
//   admin  — مدیر منصوبِ مالک. هر کاری می‌تواند بکند به‌جز مدیریت حساب‌های
//            admin و owner (ساخت ادمین جدید فقط با owner).
//   user   — کاربر محدود با permissions مشخص (تب‌های واگذارشدنی GRANTABLE_TABS).
//
// قواعد طلایی:
//   1. نقش owner هرگز از طریق API ساخته/تغییر/حذف نمی‌شود.
//   2. admin فقط روی حساب‌های نقش user اختیار دارد.
//   3. تب‌های حساس (users, settings, stats, security, providers, email, chat)
//      هرگز به user واگذار نمی‌شوند — لیست GRANTABLE_TABS بسته است.
// ============================================================================

// نقش‌های مجاز — رشته‌ی خام در DB نگه داشته می‌شود (سازگار با دیتابیس‌های قدیمی)
export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// نقش‌های «ارشد» — همه‌ی دسترسی‌های پنل را دارند
export function isElevated(role: string | undefined | null): boolean {
  return role === ROLES.OWNER || role === ROLES.ADMIN;
}

// نقش‌های معتبر برای ورودی API — هر چیز دیگری → user
export function normalizeRole(input: unknown): Role {
  return input === ROLES.ADMIN || input === ROLES.OWNER ? input : ROLES.USER;
}

// تب‌هایی که با permissions کاربر limited قابل واگذاری‌اند.
// این لیست باید با PERMISSION_SECTIONS در AccessUserManager.tsx همخوان بماند.
export const GRANTABLE_TABS = new Set([
  "messages",
  "clips",
  "content",
  "text",
  "nav",
  "themes",
]);

// نقشه‌ی API → تب — هر مسیر admin که قابل واگذاری است به تب خودش اشاره می‌کند
export const TAB_PERMISSIONS: Record<string, string> = {
  "/api/messages": "messages",
  "/api/admin/reply": "messages",
  "/api/admin/clear": "messages",
  "/api/admin/clips": "clips",
  "/api/admin/content": "content",
  "/api/admin/equipment": "content",
  "/api/admin/text": "text",
  "/api/admin/nav": "nav",
  "/api/admin/themes": "themes",
};

// ---------------------------------------------------------------------------
// canManageTarget — آیا requester می‌تواند حسابِ با نقش targetRole را مدیریت کند؟
// ---------------------------------------------------------------------------
// owner  → همه به‌جز خودش (مدیریت خودش فقط محدود به displayName/password است و
//          در route ها جداگانه چک می‌شود)
// admin  → فقط حساب‌های نقش user
// user   → هیچ (هرگز به این تابع نمی‌رسد چون مسیرهای users فقط elevated هستند)
export function canManageTarget(requesterRole: string, targetRole: string): boolean {
  if (requesterRole === ROLES.OWNER) return true;
  if (requesterRole === ROLES.ADMIN) return targetRole === ROLES.USER;
  return false;
}

// حداقل طول رمز بر اساس نقش هدف — ادمین/مالک ۱۲، کاربر عادی ۸
export function minPasswordLength(role: string): number {
  return isElevated(role) ? 12 : 8;
}

// ---------------------------------------------------------------------------
// policyOf — توضیح متنی قواعد (برای پاسخ‌های 403 و مستندسازی)
// ---------------------------------------------------------------------------
export const RBAC_RULES = {
  owner_immutable_via_api: "نقش owner فقط از خود سرور ساخته/تغییر می‌کند",
  admin_scope: "ادمین فقط حساب‌های نقش user را مدیریت می‌کند",
  sensitive_tabs_admin_only:
    "users/settings/stats/security/providers/email/chat فقط برای owner/admin",
};
