"use client";

// ============================================================================
// useContent.ts — v1.0
// useContent — هوک React برای خواندن محتوا از /api/content با cache سبک و رفرش.
// همه‌ی بخش‌های عمومی سایت از همین هوک تغذیه می‌شوند.
// ============================================================================

import { useEffect, useState } from "react";

interface SiteContent {
  books: any[];
  articles: any[];
  tutorials: any[];
  skills: any[];
  aiInstructions: any[];
  equipment: any[];
  customThemes: any[];
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
  customThemes: [],
  texts: {},
  navItems: [],
  settings: {},
};

// v1.0 rev3 (audit BUG-c LOW): کش per-lang — تعویض زبان بدون فلشِ متن زبان قبلی
const langCache = new Map<string, SiteContent>();

export function useContent(lang: string = "en") {
  const [content, setContent] = useState<SiteContent>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // پاک‌کردن cache قدیمی — وگرنه تغییرات پنل نشون داده نمی‌شه
    // (cache فقط ۵ دقیقه بود، ولی برای اطمینان از نمایش تغییرات، پاکش می‌کنیم)
    try {
      localStorage.removeItem("site_content_cache");
      localStorage.removeItem("site_content_cache_time");
    } catch {
      // storage بلاک‌شده (private mode/quota) — cache فقط skip می‌شود
    }

    // v1.0 rev3 (audit BUG-c LOW): کش per-lang در حافظه — هنگام تعویض زبان
    // به‌جای «متن زبان قبلی در قالب زبان جدید» بلافاصله محتوای کش‌شده‌ی
    // همان زبان رندر می‌شود و fetch در پس‌زمینه تازه‌اش می‌کند
    const cached = langCache.get(lang);
    if (cached) {
      setContent(cached);
      setLoading(false);
    }

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
          customThemes: data.ok ? data.customThemes || [] : [],
          texts: texts,
          navItems: data.ok ? data.navItems || [] : [],
          settings: data.ok ? data.settings || {} : {},
        };
        langCache.set(lang, result);
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
