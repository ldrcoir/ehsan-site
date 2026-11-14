"use client";

import { useEffect } from "react";

/**
 * ThemeApplier — v1.1.2
 * صفحاتی که خودشان useContent را صدا نمی‌زنند (مثل /clips و /user-login)
 * تم و فونت پیش‌فرض ادمین را از دست می‌دادند. این کامپوننت /api/content را
 * می‌خواند (data.settings — کلیدهای public فقط: defaultTheme/defaultFont و…)
 * و data-theme / data-font را روی <html> ست می‌کند.
 *
 * نکته: اگر بازدیدکننده خودش قبلاً تم/فونت انتخاب کرده (localStorage)،
 * انتخابش محترم شمرده می‌شود — همان رفتار صفحه‌ی اصلی (page.tsx) و
 * اسکریپت فونت layout.tsx.
 * خطاها بی‌صدا نادیده گرفته می‌شوند و کامپوننت چیزی رندر نمی‌کند (null).
 */
export default function ThemeApplier() {
  useEffect(() => {
    let cancelled = false;
    fetch("/api/content", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.ok || !data.settings) return;
        const settings = data.settings as Record<string, string>;

        // defaultTheme — فقط اگر بازدیدکننده خودش تمی انتخاب نکرده باشد
        const defaultTheme = (settings.defaultTheme || "").trim();
        if (defaultTheme) {
          let savedTheme: string | null = null;
          try {
            savedTheme = localStorage.getItem("portfolio_theme");
          } catch {}
          if (!savedTheme) {
            document.documentElement.dataset.theme = defaultTheme;
          }
        }

        // defaultFont — فقط اگر بازدیدکننده خودش فونتی انتخاب نکرده باشد
        const defaultFont = (settings.defaultFont || "").trim();
        if (defaultFont) {
          let savedFont: string | null = null;
          try {
            savedFont = localStorage.getItem("site_font");
          } catch {}
          if (!savedFont) {
            document.documentElement.dataset.font = defaultFont;
          }
        }
      })
      .catch(() => {
        // خطاهای شبکه/JSON بی‌صدا — این کامپوننت هرگز نباید صفحه را بشکند
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
