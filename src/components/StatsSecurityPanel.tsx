// ============================================================================
// StatsSecurityPanel — تب آمار و امنیت (پنل ادمین، V18.3)
// ============================================================================
// - کارت‌های آمار سایت (بازدید، پیام‌ها، چت‌ها، محتوا) از /api/admin/stats
// - لیست صفحات پربازدید
// - بخش امنیت: IP های بلاک‌شده (+Unblock)، لاگ‌های اخیر (+Clear)
//   از /api/admin/security-dashboard
// - رفرش دستی + رفرش خودکار هر ۶۰ ثانیه
// - سه‌زبانه fa/en/de — هم‌سبک با بقیه داشبورد
// ============================================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Lang = "fa" | "en" | "de";

type TopPage = { path: string; _count: number };

type TopReferrer = { referrer: string; count: number };

type RecentView = { path: string; referrer: string | null; lang: string | null; createdAt: string };

type SiteStats = {
  totalViews: number;
  viewsToday: number;
  viewsWeek: number;
  topPages: TopPage[];
  topReferrers: TopReferrer[];
  recentViews: RecentView[];
  contactCount: number;
  chatCount: number;
  chatMsgCount: number;
  tutorialCount: number;
  bookCount: number;
  articleCount: number;
};

type BlockedIp = {
  id: string;
  ip: string;
  reason: string;
  attempts: number;
  createdAt: string;
};

type SecurityLog = {
  id: string;
  type: string;
  ip: string | null;
  detail: string;
  createdAt: string;
};

type SecurityData = {
  blockedIps: BlockedIp[];
  recentLogs: SecurityLog[];
  stats: {
    suspiciousCount: number;
    failedLoginCount: number;
    blockedCount: number;
    todayEvents: number;
  };
};

// --- Trilingual labels ---
const T = {
  fa: {
    help: "💡 آمار بازدید و محتوای سایت + وضعیت امنیت (IP های بلاک‌شده و رویدادهای اخیر). هر ۶۰ ثانیه خودکار رفرش می‌شه.",
    refresh: "🔄 رفرش",
    loading: "در حال بارگذاری آمار...",
    error: "❌ خطا",
    networkError: "خطای شبکه",
    // stat cards
    totalViews: "کل بازدیدها",
    viewsToday: "بازدید امروز",
    viewsWeek: "بازدید این هفته",
    contactCount: "پیام‌های تماس",
    chatCount: "جلسات چت",
    chatMsgCount: "پیام‌های چت",
    bookCount: "کتاب‌ها",
    articleCount: "مقالات",
    tutorialCount: "آموزش‌ها",
    // top pages
    topPages: "📄 صفحات پربازدید",
    // security
    securityTitle: "🛡️ امنیت",
    suspiciousCount: "رویدادهای مشکوک",
    failedLoginCount: "ورودهای ناموفق",
    blockedIps: "IP های بلاک‌شده",
    noBlockedIps: "هیچ IP بلاک‌شده‌ای نیست.",
    unblock: "🔓 رفع بلاک",
    unblocking: "⏳",
    recentLogs: "📜 رویدادهای اخیر",
    noLogs: "رویدادی ثبت نشده.",
    clearLogs: "🗑️ پاک کردن لاگ‌ها",
    clearLogsConfirm: "همه لاگ‌های امنیتی پاک بشن؟",
    attempts: "تلاش",
    reason: "دلیل",
    unknownReason: "—",
    blockIp: "بلاک دستی IP",
    blockPlaceholder: "مثلاً 203.0.113.7 یا 2001:db8::/64",
    blockBtn: "🚫 بلاک",
    invalidIp: "IP نامعتبر است",
    blockDone: "IP بلاک شد",
    unblockDone: "بلاک IP برداشته شد",
    clearLogsDone: "لاگ‌ها پاک شدند",
    topReferrers: "🔗 منابع ارجاع‌کننده",
    exportCsv: "⬇️ خروجی CSV",
    clearStats: "🗑️ پاک کردن آمار",
    clearStatsConfirm: "همه آمار بازدید (PageView) پاک بشن؟",
    statsCleared: "آمار پاک شد",
  },
  en: {
    help: "💡 Site view & content stats plus security overview (blocked IPs, recent events). Auto-refreshes every 60 seconds.",
    refresh: "🔄 Refresh",
    loading: "Loading stats...",
    error: "❌ Error",
    networkError: "Network error",
    totalViews: "Total Views",
    viewsToday: "Views Today",
    viewsWeek: "Views This Week",
    contactCount: "Contact Messages",
    chatCount: "Chat Sessions",
    chatMsgCount: "Chat Messages",
    bookCount: "Books",
    articleCount: "Articles",
    tutorialCount: "Tutorials",
    topPages: "📄 Top Pages",
    securityTitle: "🛡️ Security",
    suspiciousCount: "Suspicious Events",
    failedLoginCount: "Failed Logins",
    blockedIps: "Blocked IPs",
    noBlockedIps: "No blocked IPs.",
    unblock: "🔓 Unblock",
    unblocking: "⏳",
    recentLogs: "📜 Recent Events",
    noLogs: "No events logged.",
    clearLogs: "🗑️ Clear Logs",
    clearLogsConfirm: "Delete ALL security logs?",
    attempts: "attempts",
    reason: "Reason",
    unknownReason: "—",
    blockIp: "Manually block IP",
    blockPlaceholder: "e.g. 203.0.113.7 or 2001:db8::/64",
    blockBtn: "🚫 Block",
    invalidIp: "Invalid IP address",
    blockDone: "IP blocked",
    unblockDone: "IP unblocked",
    clearLogsDone: "Logs cleared",
    topReferrers: "🔗 Top Referrers",
    exportCsv: "⬇️ Export CSV",
    clearStats: "🗑️ Clear Stats",
    clearStatsConfirm: "Delete ALL visitor stats?",
    statsCleared: "Stats cleared",
  },
  de: {
    help: "💡 Seiten- und Inhaltsstatistiken sowie Sicherheitsübersicht (gesperrte IPs, letzte Ereignisse). Aktualisiert sich alle 60 Sekunden automatisch.",
    refresh: "🔄 Aktualisieren",
    loading: "Statistiken laden...",
    error: "❌ Fehler",
    networkError: "Netzwerkfehler",
    totalViews: "Gesamte Aufrufe",
    viewsToday: "Aufrufe heute",
    viewsWeek: "Aufrufe diese Woche",
    contactCount: "Kontaktnachrichten",
    chatCount: "Chat-Sitzungen",
    chatMsgCount: "Chat-Nachrichten",
    bookCount: "Bücher",
    articleCount: "Artikel",
    tutorialCount: "Tutorials",
    topPages: "📄 Top-Seiten",
    securityTitle: "🛡️ Sicherheit",
    suspiciousCount: "Verdächtige Ereignisse",
    failedLoginCount: "Fehlgeschlagene Anmeldungen",
    blockedIps: "Gesperrte IPs",
    noBlockedIps: "Keine gesperrten IPs.",
    unblock: "🔓 Entsperren",
    unblocking: "⏳",
    recentLogs: "📜 Letzte Ereignisse",
    noLogs: "Keine Ereignisse.",
    clearLogs: "🗑️ Logs löschen",
    clearLogsConfirm: "ALLE Sicherheitslogs löschen?",
    attempts: "Versuche",
    reason: "Grund",
    unknownReason: "—",
    blockIp: "IP manuell sperren",
    blockPlaceholder: "z.B. 203.0.113.7 oder 2001:db8::/64",
    blockBtn: "🚫 Sperren",
    invalidIp: "Ungültige IP-Adresse",
    blockDone: "IP gesperrt",
    unblockDone: "IP entsperrt",
    clearLogsDone: "Logs gelöscht",
    topReferrers: "🔗 Top-Referrer",
    exportCsv: "⬇️ CSV exportieren",
    clearStats: "🗑️ Statistiken löschen",
    clearStatsConfirm: "ALLE Besucherstatistiken löschen?",
    statsCleared: "Statistiken gelöscht",
  },
} as const;

function localeOf(lang: Lang): string {
  return lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US";
}

export default function StatsSecurityPanel({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // (a) success feedback — قبلاً عملیات موفق با setError (قرمز ❌) نشون داده می‌شد
  const [success, setSuccess] = useState("");
  const [busyIp, setBusyIp] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearingStats, setClearingStats] = useState(false);
  // v1.1.1: بلاک دستی IP
  const [blockInput, setBlockInput] = useState("");
  const [blocking, setBlocking] = useState(false);
  const loadedRef = useRef(false);

  // --- (a) Success/error feedback helpers (mutually exclusive) ---
  function showError(msg: string) {
    setError(msg);
    setSuccess("");
  }
  function showSuccess(msg: string) {
    setSuccess(msg);
    setError("");
  }

  // --- Load stats + security data ---
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const statsRes = await fetch("/api/admin/stats", { credentials: "include" });
      const statsData = await statsRes.json().catch(() => null);
      if (statsData && statsData.ok) {
        setStats(statsData.stats || null);
      } else if (!silent) {
        setError((statsData && statsData.error) || "stats_failed");
      }
    } catch {
      if (!silent) setError(t.networkError);
    }
    try {
      const secRes = await fetch("/api/admin/security-dashboard", { credentials: "include" });
      const secData = await secRes.json().catch(() => null);
      if (secData && secData.ok) {
        setSecurity(secData.data || null);
      } else if (!silent) {
        setError((secData && secData.error) || "security_failed");
      }
    } catch {
      if (!silent) setError(t.networkError);
    }
    loadedRef.current = true;
    if (!silent) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load(true);
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  // --- Unblock an IP (POST security-dashboard {action:"unblock", ip}) ---
  async function unblockIp(ip: string) {
    if (busyIp) return;
    setBusyIp(ip);
    try {
      const res = await fetch("/api/admin/security-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "unblock", ip }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        showSuccess(t.unblockDone);
        await load(true);
      } else {
        showError((data && data.error) || "unblock_failed");
      }
    } catch {
      showError(t.networkError);
    } finally {
      setBusyIp(null);
    }
  }

  // --- Clear all security logs (POST security-dashboard {action:"clear_logs"}) ---
  async function clearLogs() {
    if (!confirm(t.clearLogsConfirm) || clearing) return;
    setClearing(true);
    try {
      const res = await fetch("/api/admin/security-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "clear_logs" }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        showSuccess(t.clearLogsDone);
        await load(true);
      } else {
        showError((data && data.error) || "clear_failed");
      }
    } catch {
      showError(t.networkError);
    } finally {
      setClearing(false);
    }
  }

  // --- v1.1.1 (audit P1-G8): بلاک دستی IP — API اکشن block از قبل بود، UI نداشت
  const IP_RE = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:]{2,45}|[0-9a-fA-F:]{2,45}\:\/\d{1,3})$/;
  async function blockIp() {
    const ip = blockInput.trim();
    if (!ip || blocking) return;
    if (!IP_RE.test(ip)) {
      showError(t.invalidIp);
      return;
    }
    setBlocking(true);
    try {
      const res = await fetch("/api/admin/security-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "block", ip, reason: "Manual block (admin panel)" }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setBlockInput("");
        // (a) قبلاً: setError(t.blockDone) — قرمز ❌ برای عملیات موفق!
        showSuccess(t.blockDone);
        await load(true);
      } else {
        showError((data && data.error) || "block_failed");
      }
    } catch {
      showError(t.networkError);
    } finally {
      setBlocking(false);
    }
  }

  // --- (d) Export CSV از recentViews — سمت کلاینت، بدون درخواست اضافه ---
  function exportCsv() {
    const rows = stats?.recentViews || [];
    const esc = (v: unknown): string => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = ["path,referrer,createdAt"];
    for (const r of rows) {
      lines.push([esc(r.path), esc(r.referrer), esc(r.createdAt)].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visitor-stats.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // --- (e) Clear stats — POST /api/admin/clear { target: "stats" } ---
  async function clearStats() {
    if (clearingStats) return;
    if (!confirm(t.clearStatsConfirm)) return;
    setClearingStats(true);
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: "stats" }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        showSuccess(t.statsCleared);
        await load(true);
      } else {
        showError((data && data.error) || "clear_stats_failed");
      }
    } catch {
      showError(t.networkError);
    } finally {
      setClearingStats(false);
    }
  }

  const statCards: { label: string; value: number | undefined }[] = [
    { label: t.totalViews, value: stats?.totalViews },
    { label: t.viewsToday, value: stats?.viewsToday },
    { label: t.viewsWeek, value: stats?.viewsWeek },
    { label: t.contactCount, value: stats?.contactCount },
    { label: t.chatCount, value: stats?.chatCount },
    { label: t.chatMsgCount, value: stats?.chatMsgCount },
    { label: t.bookCount, value: stats?.bookCount },
    { label: t.articleCount, value: stats?.articleCount },
    { label: t.tutorialCount, value: stats?.tutorialCount },
  ];

  return (
    <div>
      {error && (
        <div
          className="dashboard-access-warning"
          role="alert"
          style={{ background: "rgba(255,0,64,0.1)", borderColor: "var(--red, #ff0040)", color: "var(--red, #ff0040)" }}
        >
          {t.error}: {error}
        </div>
      )}

      {/* (a) success feedback — green alert for successful actions */}
      {success && (
        <div
          className="dashboard-access-warning"
          role="status"
          style={{ background: "rgba(0,255,65,0.08)", borderColor: "var(--green, #00ff41)", color: "var(--green, #00ff41)" }}
        >
          ✅ {success}
        </div>
      )}

      <div className="dashboard-help-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 300px" }}>{t.help}</span>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap" }}>
          {/* (d) Export CSV */}
          <button onClick={exportCsv} className="dashboard-btn" style={{ fontSize: "11px", padding: "4px 12px" }}>
            {t.exportCsv}
          </button>
          {/* (e) Clear stats */}
          <button
            onClick={clearStats}
            className="dashboard-btn danger"
            disabled={clearingStats}
            style={{ fontSize: "11px", padding: "4px 12px", opacity: clearingStats ? 0.6 : 1 }}
          >
            {clearingStats ? "⏳" : t.clearStats}
          </button>
          <button onClick={() => load()} className="dashboard-btn" style={{ fontSize: "11px", padding: "4px 12px" }}>
            {t.refresh}
          </button>
        </div>
      </div>

      {loading && !loadedRef.current ? (
        <div className="dashboard-empty-state">{t.loading}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* --- Stat cards --- */}
          <div className="dashboard-info-grid">
            {statCards.map(card => (
              <div key={card.label} className="dashboard-info-card">
                <div className="dashboard-info-label">{card.label}</div>
                <div className="dashboard-info-value">
                  {card.value === undefined ? "—" : card.value.toLocaleString(localeOf(lang))}
                </div>
              </div>
            ))}
          </div>

          {/* --- Top pages --- */}
          <div className="dashboard-message-card">
            <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)", display: "block", marginBottom: "10px" }}>
              {t.topPages}
            </strong>
            {stats && stats.topPages && stats.topPages.length > 0 ? (
              <div className="dashboard-messages-list" style={{ gap: "6px" }}>
                {stats.topPages.map((p, i) => (
                  <div
                    key={`${p.path}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      fontSize: "12px",
                      padding: "6px 10px",
                      border: "1px solid var(--border, #1a3a1a)",
                      borderRadius: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "var(--text, #c8facc)", wordBreak: "break-all" }}>
                      {i + 1}. {p.path}
                    </span>
                    <span style={{ color: "var(--green-bright, #39ff14)", whiteSpace: "nowrap" }}>
                      {p._count.toLocaleString(localeOf(lang))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty-state" style={{ margin: "0" }}>—</p>
            )}
          </div>

          {/* --- (c) Top referrers — stats.topReferrers: [{referrer, count}] --- */}
          <div className="dashboard-message-card">
            <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)", display: "block", marginBottom: "10px" }}>
              {t.topReferrers}
            </strong>
            {stats && stats.topReferrers && stats.topReferrers.length > 0 ? (
              <div className="dashboard-messages-list" style={{ gap: "6px" }}>
                {stats.topReferrers.map((r, i) => (
                  <div
                    key={`${r.referrer}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                      fontSize: "12px",
                      padding: "6px 10px",
                      border: "1px solid var(--border, #1a3a1a)",
                      borderRadius: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ color: "var(--text, #c8facc)", wordBreak: "break-all" }} dir="ltr">
                      {i + 1}. {r.referrer || "—"}
                    </span>
                    <span style={{ color: "var(--green-bright, #39ff14)", whiteSpace: "nowrap" }}>
                      {r.count.toLocaleString(localeOf(lang))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dashboard-empty-state" style={{ margin: "0" }}>—</p>
            )}
          </div>

          {/* --- Security side --- */}
          <div className="dashboard-message-card">
            <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)", display: "block", marginBottom: "10px" }}>
              {t.securityTitle}
            </strong>

            <div className="dashboard-info-grid" style={{ marginTop: 0 }}>
              <div className="dashboard-info-card">
                <div className="dashboard-info-label">{t.suspiciousCount}</div>
                <div className="dashboard-info-value">
                  {security?.stats.suspiciousCount === undefined ? "—" : security.stats.suspiciousCount.toLocaleString(localeOf(lang))}
                </div>
              </div>
              <div className="dashboard-info-card">
                <div className="dashboard-info-label">{t.failedLoginCount}</div>
                <div className="dashboard-info-value">
                  {security?.stats.failedLoginCount === undefined ? "—" : security.stats.failedLoginCount.toLocaleString(localeOf(lang))}
                </div>
              </div>
            </div>

            {/* Blocked IPs */}
            <div style={{ marginTop: "14px" }}>
              <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)", display: "block", marginBottom: "8px" }}>
                🚫 {t.blockedIps}
              </strong>
              {/* v1.1.1: بلاک دستی */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                <input
                  value={blockInput}
                  onChange={e => setBlockInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") blockIp(); }}
                  placeholder={t.blockPlaceholder}
                  dir="ltr"
                  style={{
                    flex: "1 1 200px",
                    fontSize: "12px",
                    padding: "6px 10px",
                    background: "var(--bg-panel, #050505)",
                    border: "1px solid var(--border, #1a3a1a)",
                    borderRadius: "6px",
                    color: "var(--text, #c8facc)",
                    fontFamily: "var(--font-mono, monospace)",
                    minWidth: "0",
                  }}
                />
                <button
                  onClick={blockIp}
                  className="dashboard-btn danger"
                  disabled={blocking || !blockInput.trim()}
                  style={{ fontSize: "11px", padding: "6px 12px", opacity: blocking || !blockInput.trim() ? 0.6 : 1 }}
                >
                  {blocking ? t.unblocking : t.blockBtn}
                </button>
              </div>
              {security && security.blockedIps && security.blockedIps.length > 0 ? (
                <div className="dashboard-messages-list" style={{ gap: "6px" }}>
                  {security.blockedIps.map(b => (
                    <div
                      key={b.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "12px",
                        padding: "6px 10px",
                        border: "1px solid var(--red, #ff0040)",
                        borderRadius: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "0" }}>
                        <code style={{ color: "var(--red, #ff0040)" }} dir="ltr">{b.ip}</code>
                        <span style={{ fontSize: "10px", color: "var(--text-dim, #4a7a4a)" }}>
                          {t.reason}: {b.reason || t.unknownReason} — {b.attempts} {t.attempts}
                        </span>
                      </div>
                      <button
                        onClick={() => unblockIp(b.ip)}
                        className="dashboard-btn"
                        disabled={busyIp === b.ip}
                        style={{ fontSize: "11px", padding: "4px 10px", opacity: busyIp === b.ip ? 0.6 : 1, flexShrink: 0 }}
                      >
                        {busyIp === b.ip ? t.unblocking : t.unblock}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dashboard-empty-state" style={{ margin: "0" }}>{t.noBlockedIps}</p>
              )}
            </div>

            {/* Recent logs */}
            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)" }}>
                  {t.recentLogs}
                </strong>
                <button
                  onClick={clearLogs}
                  className="dashboard-btn danger"
                  disabled={clearing}
                  style={{ fontSize: "11px", padding: "4px 10px", opacity: clearing ? 0.6 : 1 }}
                >
                  {t.clearLogs}
                </button>
              </div>
              {security && security.recentLogs && security.recentLogs.length > 0 ? (
                <div className="dashboard-messages-list" style={{ gap: "6px", maxHeight: "320px", overflowY: "auto", paddingRight: "4px" }}>
                  {security.recentLogs.map(l => (
                    <div
                      key={l.id}
                      style={{
                        fontSize: "11px",
                        padding: "6px 10px",
                        border: "1px solid var(--border, #1a3a1a)",
                        borderRadius: "6px",
                        lineHeight: 1.7,
                      }}
                    >
                      <span style={{ color: "var(--green-bright, #39ff14)" }}>{l.type}</span>
                      {l.ip && <code style={{ color: "var(--text-dim, #4a7a4a)" }} dir="ltr"> · {l.ip}</code>}
                      {l.detail && <span style={{ color: "var(--text-dim, #4a7a4a)" }}> · {l.detail}</span>}
                      <span style={{ color: "var(--text-dim, #4a7a4a)", whiteSpace: "nowrap" }}>
                        {" "}· {new Date(l.createdAt).toLocaleString(localeOf(lang))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="dashboard-empty-state" style={{ margin: "0" }}>{t.noLogs}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
