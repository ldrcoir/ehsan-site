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
};

export function useContent() {
  const [content, setContent] = useState<SiteContent>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cached = localStorage.getItem("site_content_cache");
    const cachedTime = localStorage.getItem("site_content_cache_time");
    if (cached && cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10);
      if (age < 5 * 60 * 1000) {
        try {
          // defer setState to next microtask to avoid synchronous setState in effect
          Promise.resolve().then(() => {
            if (!cancelled) {
              setContent(JSON.parse(cached));
              setLoading(false);
            }
          });
          return;
        } catch {}
      }
    }

    Promise.all([
      fetch("/api/content").then(r => r.json()).catch(() => ({ ok: false })),
      fetch("/api/admin/text").then(r => r.json()).catch(() => ({ ok: false, texts: {} })),
    ]).then(([contentData, textData]) => {
      if (cancelled) return;
      const result = {
        books: contentData.ok ? contentData.books || [] : [],
        articles: contentData.ok ? contentData.articles || [] : [],
        tutorials: contentData.ok ? contentData.tutorials || [] : [],
        skills: contentData.ok ? contentData.skills || [] : [],
        aiInstructions: contentData.ok ? contentData.aiInstructions || [] : [],
        equipment: contentData.ok ? contentData.equipment || [] : [],
        texts: textData.ok ? textData.texts || {} : {},
        navItems: contentData.ok ? contentData.navItems || [] : [],
      };
      setContent(result);
      localStorage.setItem("site_content_cache", JSON.stringify(result));
      localStorage.setItem("site_content_cache_time", String(Date.now()));
    }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  return { content, loading };
}

/** Get localized text from DB, with fallback */
export function getText(texts: Record<string, string>, key: string, fallback: string): string {
  return texts[key] || fallback;
}
