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
  // فایل‌های ضروری برای standalone build
  outputFileTracingIncludes: {
    "/": ["./prisma/schema.prisma", "./db/custom.db"],
  },
};

export default nextConfig;
