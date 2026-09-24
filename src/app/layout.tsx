import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Inter, Lora, Fira_Code } from "next/font/google";

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
// ============================================================================
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ehsanmorad.ir";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Personal Site",
    template: "%s | Personal Site",
  },
  description: "Personal portfolio website — built with Next.js, TypeScript, Prisma, and SQLite.",
  keywords: ["portfolio", "developer", "personal site", "برنامه‌نویس", "نمونه‌کار"],
  authors: [{ name: "Site Owner" }],
  creator: "Site Owner",
  publisher: "Site Owner",
  // Open Graph — برای اشتراک‌گذاری تو فیسبوک، تلگرام، واتساپ
  openGraph: {
    type: "website",
    locale: "fa_IR",
    alternateLocale: ["en_US", "de_DE"],
    url: siteUrl,
    siteName: "Personal Site",
    title: "Personal Site",
    description: "Personal portfolio website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Personal Site",
      },
    ],
  },
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Personal Site",
    description: "Personal portfolio website",
    images: ["/icon-512.png"],
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
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        {/* JSON-LD structured data برای SEO بهتر */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Personal Site",
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
        {children}
      </body>
    </html>
  );
}
