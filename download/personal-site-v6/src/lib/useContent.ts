"use client";

import { useEffect, useState } from "react";

interface SiteContent {
  books: any[];
  articles: any[];
  tutorials: any[];
  skills: any[];
  aiInstructions: any[];
  equipment: any[];
}

const fallback: SiteContent = {
  books: [],
  articles: [],
  tutorials: [],
  skills: [],
  aiInstructions: [],
  equipment: [],
};

/**
 * useContent — loads all site content from /api/content on the client.
 * Caches in localStorage for 5 minutes to avoid refetching.
 */
export function useContent() {
  const [content, setContent] = useState<SiteContent>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem("site_content_cache");
    const cachedTime = localStorage.getItem("site_content_cache_time");
    if (cached && cachedTime) {
      const age = Date.now() - parseInt(cachedTime, 10);
      if (age < 5 * 60 * 1000) {
        // Less than 5 min old
        try {
          setContent(JSON.parse(cached));
          setLoading(false);
          return;
        } catch {}
      }
    }

    // Fetch fresh
    fetch("/api/content")
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setContent(data);
          localStorage.setItem("site_content_cache", JSON.stringify(data));
          localStorage.setItem("site_content_cache_time", String(Date.now()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { content, loading };
}

/** Get localized field value */
export function localized(item: any, field: string, lang: string): string {
  const langField = `${field}${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
  return item[langField] || item[`${field}En`] || "";
}
