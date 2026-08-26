"use client";

import { useState, useMemo } from "react";

interface SearchItem {
  id: string;
  type: "book" | "article" | "tutorial" | "page";
  titleEn: string;
  titleFa?: string;
  descEn?: string;
  descFa?: string;
  href: string;
}

/**
 * GlobalSearch — search across all site content (books, articles, tutorials, sections).
 * Shows a modal with results as you type.
 */
export default function GlobalSearch({
  books, articles, tutorials, lang, onNavigate, externalOpen,
}: {
  books: any[]; articles: any[]; tutorials: any[];
  lang: string; onNavigate: (href: string) => void; externalOpen?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? (externalOpen || internalOpen) : internalOpen;

  const allItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [];
    books.forEach(b => items.push({
      id: b.id, type: "book",
      titleEn: b.titleEn || "", titleFa: b.titleFa || "",
      descEn: b.descEn || "", descFa: b.descFa || "",
      href: "#books",
    }));
    articles.forEach(a => items.push({
      id: a.id, type: "article",
      titleEn: a.titleEn || "", titleFa: a.titleFa || "",
      descEn: a.summaryEn || "", descFa: a.summaryFa || "",
      href: "#articles",
    }));
    tutorials.forEach(t => items.push({
      id: t.id, type: "tutorial",
      titleEn: t.titleEn || "", titleFa: t.titleFa || "",
      descEn: t.descEn || "", descFa: t.descFa || "",
      href: "#tutorials",
    }));
    // Add page sections
    items.push(
      { id: "hero", type: "page", titleEn: "Home", href: "#hero" },
      { id: "about", type: "page", titleEn: "About", titleFa: "درباره", href: "#about" },
      { id: "skills", type: "page", titleEn: "Skills", titleFa: "مهارت‌ها", href: "#skills" },
      { id: "chat", type: "page", titleEn: "Chat", titleFa: "گفت‌وگو", href: "#chat" },
      { id: "contact", type: "page", titleEn: "Contact", titleFa: "تماس", href: "#contact" },
    );
    return items;
  }, [books, articles, tutorials]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allItems
      .filter(item =>
        item.titleEn.toLowerCase().includes(q) ||
        (item.titleFa || "").includes(query) ||
        (item.descEn || "").toLowerCase().includes(q) ||
        (item.descFa || "").includes(query)
      )
      .slice(0, 10);
  }, [query, allItems]);

  const typeIcons: Record<string, string> = {
    book: "📚", article: "📄", tutorial: "🎬", page: "📍",
  };

  const close = () => {
    setInternalOpen(false);
    if (externalOpen === undefined) return;
    // External open is controlled by parent — dispatch event to close
    window.dispatchEvent(new CustomEvent("close-global-search"));
  };

  if (!open) return null;

  return (
    <div className="global-search-overlay" onClick={close}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        <input
          type="text"
          className="global-search-input"
          placeholder={lang === "fa" ? "جستجو در کل سایت..." : "Search entire site..."}
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div className="global-search-results">
          {results.length === 0 && query.trim() && (
            <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20, fontSize: "0.85rem" }}>
              {lang === "fa" ? "نتیجه‌ای یافت نشد" : "No results found"}
            </p>
          )}
          {results.map(item => (
            <div
              key={item.id}
              className="global-search-result"
              onClick={() => { onNavigate(item.href); close(); setQuery(""); }}
            >
              <span className="global-search-icon">{typeIcons[item.type]}</span>
              <div>
                <div className="global-search-title">
                  {lang === "fa" ? (item.titleFa || item.titleEn) : item.titleEn}
                </div>
                {item.descEn && (
                  <div className="global-search-desc">
                    {(lang === "fa" ? (item.descFa || item.descEn) : item.descEn)?.slice(0, 80)}
                  </div>
                )}
              </div>
              <span className="global-search-type">{item.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
