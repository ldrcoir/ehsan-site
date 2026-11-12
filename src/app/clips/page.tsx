// ============================================================================
// /clips — صفحه نمایش کلیپ‌های آپارات
// ============================================================================
"use client";
import { sanitizeEmbed } from "@/lib/sanitize-embed";

import { useEffect, useState } from "react";

type Clip = {
  id: string;
  title: string;
  embedCode: string;
  description: string;
  category: string;
};

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clips")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setClips(data.clips || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#00ff41", fontFamily: "monospace" }}>
        ...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#c8ffc8", fontFamily: "monospace", padding: 20 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ color: "#00ff41", textTransform: "uppercase", letterSpacing: 2, marginBottom: 30 }}>
          🎬 کلیپ‌ها
        </h1>

        {clips.length === 0 ? (
          <p style={{ color: "#4a7a4a", textAlign: "center", padding: 40 }}>
            هنوز کلیپی اضافه نشده.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 30 }}>
            {clips.map((clip) => (
              <div key={clip.id} style={{ background: "#050505", border: "1px solid #1a3a1a", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1a3a1a" }}>
                  <h2 style={{ color: "#39ff14", margin: 0, fontSize: 16 }}>{clip.title}</h2>
                  {clip.description && <p style={{ color: "#4a7a4a", fontSize: 11, marginTop: 4 }}>{clip.description}</p>}
                </div>
                <div style={{ aspectRatio: "16/9", background: "#000" }} dangerouslySetInnerHTML={{ __html: sanitizeEmbed(clip.embedCode) }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
