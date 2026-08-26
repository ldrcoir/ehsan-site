"use client";

import { useEffect, useState } from "react";

export default function StatsDashboard({ password, lang }: { password: string; lang: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fa = lang === "fa";

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?password=${password}`);
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch {}
    setLoading(false);
  };

  if (loading) return <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>;
  if (!stats) return <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>No data.</p>;

  const cards = [
    { label: fa ? "بازدید کل" : "Total Views", value: stats.totalViews, color: "var(--green-bright)" },
    { label: fa ? "امروز" : "Today", value: stats.viewsToday, color: "var(--accent)" },
    { label: fa ? "این هفته" : "This Week", value: stats.viewsWeek, color: "var(--cyan)" },
    { label: fa ? "پیام‌ها" : "Messages", value: stats.contactCount, color: "var(--green)" },
    { label: fa ? "چت‌ها" : "Chats", value: stats.chatCount, color: "var(--accent)" },
    { label: fa ? "پیام چت" : "Chat Msgs", value: stats.chatMsgCount, color: "var(--cyan)" },
    { label: fa ? "آموزش‌ها" : "Tutorials", value: stats.tutorialCount, color: "var(--green-bright)" },
    { label: fa ? "کتاب‌ها" : "Books", value: stats.bookCount, color: "var(--green)" },
    { label: fa ? "مقالات" : "Articles", value: stats.articleCount, color: "var(--accent)" },
  ];

  return (
    <div>
      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            border: "1px solid var(--border)", padding: 12, background: "var(--bg-panel)", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: c.color, fontFamily: "var(--font-mono)" }}>
              {c.value}
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: 4 }}>
              {c.label}
            </div>
          </div>
        ))}
      </div>

      {/* Top pages */}
      <h4 style={{ color: "var(--green-bright)", fontSize: "0.85rem", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
        {fa ? "صفحه‌های پربازدید" : "Top Pages"}
      </h4>
      <div style={{ marginBottom: 20 }}>
        {stats.topPages.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>{fa ? "هنوز بازدیدی ثبت نشده" : "No views yet"}</p>
        ) : (
          stats.topPages.map((p: any, i: number) => {
            const max = stats.topPages[0]._count || 1;
            const pct = (p._count / max) * 100;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", width: 120, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.path}
                </span>
                <div style={{ flex: 1, height: 8, background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div style={{ width: pct + "%", height: "100%", background: "var(--green)" }} />
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--green-bright)", width: 30, textAlign: "right" }}>
                  {p._count}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Recent activity */}
      <h4 style={{ color: "var(--green-bright)", fontSize: "0.85rem", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
        {fa ? "فعالیت اخیر" : "Recent Activity"}
      </h4>
      <div>
        {stats.recentViews.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>{fa ? "فعالیتی ثبت نشده" : "No activity"}</p>
        ) : (
          stats.recentViews.map((v: any, i: number) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "4px 0",
              borderBottom: "1px solid var(--border)", fontSize: "0.72rem",
            }}>
              <span style={{ color: "var(--green)" }}>{v.path}</span>
              <span style={{ color: "var(--text-dim)" }}>
                {v.lang || "—"} · {new Date(v.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={load}>
        {fa ? "به‌روزرسانی" : "refresh"}
      </button>
    </div>
  );
}
