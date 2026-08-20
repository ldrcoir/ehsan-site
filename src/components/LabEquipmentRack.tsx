"use client";

import { useEffect, useState } from "react";
import LabDeviceVisualizer from "./LabDeviceVisualizer";

interface EquipmentItem {
  id: string;
  name: string;
  model: string;
  category: string;
  status: string;
  description: string | null;
  specs: any;
  order: number;
}

/**
 * LabEquipmentRack — Real lab equipment with live status indicators.
 * Each device is interactive — click to expand, then "show live visualization"
 * renders an animated display specific to that device type.
 */
export default function LabEquipmentRack({ equipment }: { equipment: EquipmentItem[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!equipment || equipment.length === 0) {
    return (
      <div className="equipment-rack">
        <div className="equipment-rack-title">// lab equipment rack</div>
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>
          No equipment configured. Add some from admin panel.
        </p>
      </div>
    );
  }

  const categoryIcons: Record<string, string> = {
    vna: "📡", sa: "📊", sg: "📻", osc: "📈", pm: "⚡",
    fc: "⏱️", ac: "🏠", sim: "💻", ts: "🌡️", ps: "🔋", general: "⚙️",
  };

  return (
    <div className="equipment-rack">
      <div className="equipment-rack-title">
        // lab equipment rack · {equipment.length} devices · click to expand
      </div>
      <div className="equipment-grid">
        {equipment.map(eq => {
          const isExpanded = expanded === eq.id;
          return (
            <div
              key={eq.id}
              className={`equipment-item equipment-item-expanded ${isExpanded ? "expanded" : ""}`}
              onClick={() => setExpanded(isExpanded ? null : eq.id)}
              style={{ cursor: "pointer", flexDirection: "column", alignItems: "stretch" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <div className="equipment-info">
                  <span className="equipment-name">
                    {categoryIcons[eq.category] || "⚙️"} {eq.name}
                  </span>
                  <span className="equipment-model">{eq.model}</span>
                </div>
                <span className={`equipment-led ${eq.status}`} title={eq.status}></span>
              </div>
              {isExpanded && (
                <div className="equipment-detail" onClick={(e) => e.stopPropagation()}>
                  {eq.description && (
                    <p className="equipment-desc">{eq.description}</p>
                  )}
                  {eq.specs && (
                    <div className="equipment-specs">
                      {Object.entries(eq.specs).slice(0, 6).map(([k, v]: [string, any]) => (
                        <div key={k} className="equipment-spec-row">
                          <span className="equipment-spec-key">{k}:</span>
                          <span className="equipment-spec-val">
                            {Array.isArray(v) ? v.join(", ") : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Interactive visualization */}
                  <LabDeviceVisualizer category={eq.category} specs={eq.specs} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
