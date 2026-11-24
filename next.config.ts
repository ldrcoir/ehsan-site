import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // مخفی کردن X-Powered-By: Next.js
  poweredByHeader: false,
  // امنیت — همه خطاهای build باید دیده بشن
  typescript: {
    ignoreBuildErrors: false,
  },
  // React strict mode — پیدا کردن side effects
  reactStrictMode: true,
  // Security headers — در middleware هم ست میشن ولی اینجا هم برای safety
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "X-XSS-Protection", value: "0" },
        ],
      },
    ];
  },
  // v1.0 rev4 (باگ‌گیری بحرانی): block قبلی outputFileTracingIncludes با کلید
  // "/**" در Next 16 باعث می‌شد کل ریشه‌ی پروژه (releases/، skills/، db/، src/،
  // dockerها، حتی خودِ zip انتشار = ۱۸۱MB) داخل standalone کپی شود — و zip
  // انتشار خودش را داخل خودش ببرد! نیازهای واقعی (schema.prisma + bcryptjs)
  // توسط scripts/package-v1.1.sh به‌صورت صریح به پکیج اضافه می‌شوند؛ پس این
  // block به‌کلی حذف شد تا standalone فقط خروجی trace شده باشد.
};

export default nextConfig;
