import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";
import "./personal.css"; // V17.4: import globally so admin pages also get styles
import { Inter, Lora, Fira_Code } from "next/font/google";
import { db } from "@/lib/db"; // V1.1: SEO metadata from DB (server component)

// ============================================================================
// فونت‌ها — هر فونت یه CSS variable می‌سازه که تو استایل‌ها استفاده می‌شه
// ============================================================================
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});
// فونت‌های اضافی برای انتخاب از پنل ادمین
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const firaCode = Fira_Code({ variable: "--font-fira-code", subsets: ["latin"] });

// ============================================================================
// Metadata — مهم برای SEO
// این اطلاعات تو سرچ Google و اشتراک‌گذاری تو شبکه‌های اجتماعی نشون داده می‌شه
// V1.1: عنوان/توضیحات از دیتابیس خونده می‌شه (SiteSetting: name_en/name_fa،
// tagline_en) و در نبود DB به مقادیر ثابت قبلی برمی‌گرده.
// ============================================================================
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ehsanmorad.ir";

const FALLBACK_SITE_NAME = "Personal Site";
const FALLBACK_DESCRIPTION =
  "Personal portfolio website — built with Next.js, TypeScript, Prisma, and SQLite.";

export async function generateMetadata(): Promise<Metadata> {
  let siteName = FALLBACK_SITE_NAME;
  let description = FALLBACK_DESCRIPTION;
  let ogImage = "/icon-512.png";
  try {
    // v1.1 (admin-editable SEO): meta_description و og_image از پنل ادمین
    const rows = await db.siteSetting.findMany({
      where: { key: { in: ["name_en", "name_fa", "tagline_en", "meta_description", "og_image"] } },
    });
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    // name_en is primary; name_fa is the secondary fallback
    siteName = settings.name_en || settings.name_fa || FALLBACK_SITE_NAME;
    // meta_description اختصاصی → وگرنه tagline_en
    description = settings.meta_description || settings.tagline_en || FALLBACK_DESCRIPTION;
    if (settings.og_image) ogImage = settings.og_image;
  } catch (err) {
    // DB unreachable (e.g. first build before migrate/seed) — static fallbacks
    console.error("[layout generateMetadata] falling back to static metadata:", err);
  }

  const ogIsRemote = ogImage.startsWith("http");

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: ["portfolio", "developer", "personal site", "برنامه‌نویس", "نمونه‌کار"],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    // Open Graph — برای اشتراک‌گذاری تو فیسبوک، تلگرام، واتساپ
    openGraph: {
      type: "website",
      locale: "fa_IR",
      alternateLocale: ["en_US", "de_DE"],
      url: siteUrl,
      siteName,
      title: siteName,
      description,
      images: [
        ogIsRemote
          ? { url: ogImage, alt: siteName }
          : { url: ogImage, width: 512, height: 512, alt: siteName },
      ],
    },
    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      images: [ogImage],
    },
    // PWA manifest
    manifest: "/manifest.json",
    // آیکون‌ها
    icons: {
      icon: [
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icon-192.png", sizes: "192x192" }],
    },
    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Canonical URL
    alternates: {
      canonical: siteUrl,
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
  };
}

// Viewport — برای موبایل
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#00ff41",
};

// ============================================================================
// RootLayout — قالب اصلی همه‌ی صفحات
// ============================================================================
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // v1.1: JSON-LD name از دیتابیس (همان منبع <title>) — قبلاً "Personal Site" هاردکد بود
  let siteNameJson = FALLBACK_SITE_NAME;
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: ["name_en", "name_fa"] } },
    });
    const s: Record<string, string> = {};
    for (const row of rows) s[row.key] = row.value;
    siteNameJson = s.name_en || s.name_fa || FALLBACK_SITE_NAME;
  } catch {
    // build بدون DB — fallback
  }

  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        {/* اسکریپت انتخاب فونت — قبل از hydration اجرا می‌شه تا FOUC نشه */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var font = localStorage.getItem('site_font') || 'vazirmatn';
                  document.documentElement.setAttribute('data-font', font);
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* JSON-LD structured data برای SEO بهتر — v1.1: name از siteName (نه هاردکد) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: siteNameJson,
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} ${inter.variable} ${lora.variable} ${firaCode.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {/* V18.3: <main> landmark for WCAG 2.4.1 (Bypass Blocks) */}
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
