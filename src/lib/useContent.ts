"use client";

import { useEffect, useState } from "react";

interface SiteContent {
  books: any[];
  articles: any[];
  tutorials: any[];
  skills: any[];
  aiInstructions: any[];
  equipment: any[];
  texts: Record<string, string>;
  navItems: any[];
  settings: Record<string, string>;
}

const fallback: SiteContent = {
  books: [],
  articles: [],
  tutorials: [],
  skills: [],
  aiInstructions: [],
  equipment: [],
  texts: {},
  navItems: [],
  settings: {},
};

export function useContent(lang: string = "en") {
  const [content, setContent] = useState<SiteContent>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // پاک‌کردن cache قدیمی — وگرنه تغییرات پنل نشون داده نمی‌شه
    // (cache فقط ۵ دقیقه بود، ولی برای اطمینان از نمایش تغییرات، پاکش می‌کنیم)
    localStorage.removeItem("site_content_cache");
    localStorage.removeItem("site_content_cache_time");

    // fetch از /api/content که شامل متن‌ها هم هست
    fetch("/api/content", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;

        // متن‌ها بر اساس زبان فعلی
        const texts = (data.ok && data.texts && data.texts[lang]) ? data.texts[lang] : {};

        const result: SiteContent = {
          books: data.ok ? data.books || [] : [],
          articles: data.ok ? data.articles || [] : [],
          tutorials: data.ok ? data.tutorials || [] : [],
          skills: data.ok ? data.skills || [] : [],
          aiInstructions: data.ok ? data.aiInstructions || [] : [],
          equipment: data.ok ? data.equipment || [] : [],
          texts: texts,
          navItems: data.ok ? data.navItems || [] : [],
          settings: data.ok ? data.settings || {} : {},
        };
        setContent(result);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lang]);

  return { content, loading };
}

/** Get localized text from DB, with fallback */
export function getText(texts: Record<string, string>, key: string, fallback: string): string {
  return texts[key] || fallback;
}
