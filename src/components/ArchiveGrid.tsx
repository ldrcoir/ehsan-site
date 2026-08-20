"use client";

import { useState, useMemo } from "react";

interface ArchiveItem {
  id: string;
  [key: string]: any;
}

/**
 * ArchiveGrid — Paginated, filterable, sortable grid for large lists.
 * Used for books, articles, tutorials.
 */
export default function ArchiveGrid({
  items,
  type,
  lang,
  onItemClick,
}: {
  items: ArchiveItem[];
  type: "book" | "article" | "tutorial";
  lang: string;
  onItemClick?: (item: ArchiveItem) => void;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<"order" | "year" | "date" | "title">("order");

  const filtered = useMemo(() => {
    let result = [...items];

    // Filter by search
    if (filter) {
      const f = filter.toLowerCase();
      result = result.filter(item =>
        (item.titleEn || "").toLowerCase().includes(f) ||
        (item.titleFa || "").toLowerCase().includes(f) ||
        (item.descEn || "").toLowerCase().includes(f) ||
        (item.descFa || "").toLowerCase().includes(f) ||
        (item.venueEn || "").toLowerCase().includes(f) ||
        (item.publisherEn || "").toLowerCase().includes(f)
      );
    }

    // Sort
    if (sortBy === "year" && type === "book") {
      result.sort((a, b) => (b.year || "").localeCompare(a.year || ""));
    } else if (sortBy === "date" && type === "article") {
      result.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    } else if (sortBy === "title") {
      result.sort((a, b) => (a.titleEn || "").localeCompare(b.titleEn || ""));
    } else {
      result.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return result;
  }, [items, filter, sortBy, type]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const currentItems = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset to page 1 when filter changes
  if (filter && page !== 1 && currentItems.length === 0 && filtered.length > 0) {
    setPage(1);
  }

  const labels = {
    search: lang === "fa" ? "جستجو..." : lang === "de" ? "Suchen..." : "Search...",
    sort: lang === "fa" ? "مرتب‌سازی" : "Sort",
    page: lang === "fa" ? "صفحه" : "Page",
    of: lang === "fa" ? "از" : "of",
    total: lang === "fa" ? "مجموع" : "total",
    perPage: lang === "fa" ? "در هر صفحه" : "per page",
    noResults: lang === "fa" ? "نتیجه‌ای یافت نشد" : "No results found",
    sortDefault: lang === "fa" ? "پیش‌فرض" : "Default",
    sortTitle: lang === "fa" ? "عنوان" : "Title",
    sortYear: lang === "fa" ? "سال" : "Year",
    sortDate: lang === "fa" ? "تاریخ" : "Date",
  };

  return (
    <div>
      {/* Controls */}
      <div className="archive-controls">
        <input
          type="text"
          className="admin-search"
          placeholder={labels.search}
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 150 }}
        />
        <select
          className="admin-search"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{ width: "auto", minWidth: 100 }}
        >
          <option value="order">{labels.sortDefault}</option>
          <option value="title">{labels.sortTitle}</option>
          {type === "book" && <option value="year">{labels.sortYear}</option>}
          {type === "article" && <option value="date">{labels.sortDate}</option>}
        </select>
        <select
          className="admin-search"
          value={perPage}
          onChange={(e) => { setPerPage(parseInt(e.target.value)); setPage(1); }}
          style={{ width: "auto", minWidth: 80 }}
        >
          <option value={6}>6 {labels.perPage}</option>
          <option value={12}>12 {labels.perPage}</option>
          <option value={24}>24 {labels.perPage}</option>
          <option value={48}>48 {labels.perPage}</option>
        </select>
      </div>

      {/* Stats */}
      <div className="archive-stats">
        {filtered.length} {labels.total} · {labels.page} {page} {labels.of} {totalPages || 1}
      </div>

      {/* Grid */}
      {currentItems.length === 0 ? (
        <p className="archive-empty">{labels.noResults}</p>
      ) : (
        <div className={type === "tutorial" ? "tutorials-grid" : type === "book" ? "books-grid" : "articles-list"}>
          {currentItems.map((item, i) => (
            type === "article" ? (
              <article
                key={item.id}
                className="article-row"
                style={{ cursor: onItemClick ? "pointer" : "default" }}
                onClick={() => onItemClick?.(item)}
              >
                <span className="article-date">{item.date}</span>
                <div className="article-main">
                  <p className="article-type">{item.typeEn}</p>
                  <h3>{item.titleEn || item.titleFa}</h3>
                  <p className="article-venue">{item.venueEn}</p>
                  <p className="article-summary">{(item.summaryEn || "").slice(0, 120)}...</p>
                </div>
                {item.link && item.link !== "#" && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="article-link" onClick={(e) => e.stopPropagation()}>
                    {lang === "fa" ? "خواندن" : "read"} →
                  </a>
                )}
              </article>
            ) : type === "book" ? (
              <article
                key={item.id}
                className="book-card"
                style={{ cursor: onItemClick ? "pointer" : "default" }}
                onClick={() => onItemClick?.(item)}
              >
                <div className="book-cover" style={{ background: item.cover || "linear-gradient(135deg,#003b00,#00ff41)" }}>
                  <div className="book-cover-title">{item.titleEn || item.titleFa}</div>
                </div>
                <div className="book-body">
                  <div className="book-meta">
                    <span>{item.year}</span>
                    <span>{item.publisherEn}</span>
                  </div>
                  <h3>{item.titleEn || item.titleFa}</h3>
                  <p>{(item.descEn || "").slice(0, 100)}...</p>
                  {item.link && item.link !== "#" && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="book-link" onClick={(e) => e.stopPropagation()}>
                      {lang === "fa" ? "باز کردن" : "open"} →
                    </a>
                  )}
                </div>
              </article>
            ) : (
              <article
                key={item.id}
                className="tutorial-card"
                style={{ cursor: onItemClick ? "pointer" : "default" }}
                onClick={() => onItemClick?.(item)}
              >
                <div className="tutorial-thumb">
                  <div className="tutorial-play"></div>
                  <span className="tutorial-duration">{item.duration}</span>
                </div>
                <div className="tutorial-body">
                  <p className="tutorial-level">{item.levelEn}</p>
                  <h3>{item.titleEn || item.titleFa}</h3>
                  <p>{(item.descEn || "").slice(0, 80)}...</p>
                </div>
              </article>
            )
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="archive-pagination">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            «
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            ‹
          </button>
          {/* Page numbers */}
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) {
              p = i + 1;
            } else if (page <= 4) {
              p = i + 1;
            } else if (page >= totalPages - 3) {
              p = totalPages - 6 + i;
            } else {
              p = page - 3 + i;
            }
            return (
              <button
                key={p}
                className={`btn btn-sm ${page === p ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            );
          })}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
          >
            ›
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
