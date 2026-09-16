"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LabDeviceVisualizer — renders a live, animated visualization
 * based on the device category. Each device type has its own visualization:
 *
 * vna  → Smith chart with animated marker
 * sa   → Spectrum analyzer with animated peaks
 * pm   → Power meter gauge (analog needle)
 * fc   → 7-segment frequency counter
 * ac   → Antenna radiation pattern (polar plot)
 * sim  → Field distribution heatmap
 * ts   → Temperature graph over time
 * ps   → Voltage/current digital readout
 */

interface Props {
  category: string;
  specs: any;
}

export default function LabDeviceVisualizer({ category, specs }: Props) {
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  // Toggle active state on click
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let lastTime = 0;
    let t = 0;
    let data: number[] = [];

    // Initialize data based on category
    if (category === "sa" || category === "sim" || category === "ts") {
      data = new Array(80).fill(0).map(() => Math.random() * 0.3 + 0.1);
    }

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const dt = lastTime === 0 ? 0.016 : (now - lastTime) / 1000;
      lastTime = now;
      t += dt;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const styles = getComputedStyle(document.documentElement);
      const bg = styles.getPropertyValue("--bg").trim() || "#000";
      const green = styles.getPropertyValue("--green").trim() || "#00ff41";
      const greenBright = styles.getPropertyValue("--green-bright").trim() || "#39ff14";
      const greenDim = styles.getPropertyValue("--green-dim").trim() || "#008f11";
      const amber = styles.getPropertyValue("--amber").trim() || "#ffb000";
      const red = styles.getPropertyValue("--red").trim() || "#ff0040";
      const textDim = styles.getPropertyValue("--text-dim").trim() || "#4a7a4a";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      switch (category) {
        // ==================== VNA: SMITH CHART ====================
        case "vna": {
          // Grid
          ctx.strokeStyle = `rgba(${hexRgb(green)}, 0.1)`;
          ctx.lineWidth = 1;
          // Outer circle
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - 10, 0, Math.PI * 2);
          ctx.stroke();
          // Horizontal line
          ctx.beginPath();
          ctx.moveTo(10, h / 2);
          ctx.lineTo(w - 10, h / 2);
          ctx.stroke();
          // Constant resistance circles
          for (const r of [0.2, 0.5, 1, 2]) {
            const cx = w / 2 + (1 - r) / (1 + r) * (Math.min(w, h) / 2 - 10);
            const rad = r / (1 + r) * (Math.min(w, h) / 2 - 10);
            ctx.beginPath();
            ctx.arc(cx, h / 2, rad, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Animated marker
          const markerAngle = t * 0.5;
          const markerR = 0.3 + 0.2 * Math.sin(t);
          const mx = w / 2 + (Math.min(w, h) / 2 - 10) * markerR * Math.cos(markerAngle);
          const my = h / 2 - (Math.min(w, h) / 2 - 10) * markerR * Math.sin(markerAngle);

          ctx.shadowColor = `rgba(${hexRgb(green)}, 0.6)`;
          ctx.shadowBlur = 10;
          ctx.fillStyle = greenBright;
          ctx.beginPath();
          ctx.arc(mx, my, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Trace (last 100 points)
          ctx.strokeStyle = `rgba(${hexRgb(greenBright)}, 0.4)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i <= 60; i++) {
            const angle = markerAngle - (i / 60) * Math.PI * 0.5;
            const r = 0.3 + 0.2 * Math.sin(t - i * 0.05);
            const x = w / 2 + (Math.min(w, h) / 2 - 10) * r * Math.cos(angle);
            const y = h / 2 - (Math.min(w, h) / 2 - 10) * r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Label
          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("SMITH CHART · S11", 8, 14);
          ctx.fillText(`Γ = ${markerR.toFixed(3)} ∠ ${(markerAngle * 180 / Math.PI % 360).toFixed(0)}°`, 8, h - 8);
          break;
        }

        // ==================== SPECTRUM ANALYZER ====================
        case "sa": {
          // Update data
          for (let i = 0; i < data.length; i++) {
            data[i] = Math.max(0.1, data[i] - 0.02 + Math.random() * 0.03);
          }
          // Add peaks
          const peaks = [
            { idx: 10, amp: 0.7 },
            { idx: 25, amp: 0.5 },
            { idx: 45, amp: 0.85 },
            { idx: 60, amp: 0.6 },
          ];
          for (const p of peaks) {
            const mod = 1 + 0.1 * Math.sin(t + p.idx);
            data[p.idx] = p.amp * mod;
            data[p.idx - 1] = p.amp * mod * 0.7;
            data[p.idx + 1] = p.amp * mod * 0.7;
          }

          // Grid
          ctx.strokeStyle = `rgba(${hexRgb(green)}, 0.08)`;
          for (let i = 0; i <= 8; i++) {
            const x = (i / 8) * w;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
          }
          for (let i = 0; i <= 5; i++) {
            const y = (i / 5) * h;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }

          // Bars
          const barW = w / data.length;
          for (let i = 0; i < data.length; i++) {
            const barH = data[i] * (h - 20);
            const y = h - 10 - barH;
            const grad = ctx.createLinearGradient(0, h, 0, y);
            grad.addColorStop(0, `rgba(${hexRgb(greenDim)}, 0.6)`);
            grad.addColorStop(1, `rgba(${hexRgb(greenBright)}, 0.9)`);
            ctx.fillStyle = grad;
            ctx.fillRect(i * barW + 1, y, barW - 1, barH);
          }

          // Labels
          ctx.fillStyle = textDim;
          ctx.font = "8px monospace";
          ctx.fillText("SPECTRUM · SPAN 2-6GHz · RBW 1MHz", w / 2 - 60, 12);
          ctx.fillText("0 dBm", 4, 12);
          ctx.fillText("-80", 4, h - 4);
          break;
        }

        // ==================== POWER METER: ANALOG GAUGE ====================
        case "pm": {
          const cx = w / 2;
          const cy = h * 0.8;
          const radius = Math.min(w, h) * 0.35;
          // Gauge arc
          ctx.strokeStyle = `rgba(${hexRgb(green)}, 0.3)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, Math.PI, Math.PI * 2);
          ctx.stroke();
          // Tick marks
          for (let i = 0; i <= 10; i++) {
            const angle = Math.PI + (i / 10) * Math.PI;
            const x1 = cx + Math.cos(angle) * (radius - 5);
            const y1 = cy + Math.sin(angle) * (radius - 5);
            const x2 = cx + Math.cos(angle) * (radius + 5);
            const y2 = cy + Math.sin(angle) * (radius + 5);
            ctx.strokeStyle = i % 5 === 0 ? greenBright : `rgba(${hexRgb(green)}, 0.4)`;
            ctx.lineWidth = i % 5 === 0 ? 2 : 1;
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
          // Needle
          const power = 0.3 + 0.4 * Math.sin(t * 0.5) + 0.2 * Math.sin(t * 2);
          const needleAngle = Math.PI + power * Math.PI;
          ctx.strokeStyle = red;
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(${hexRgb(red)}, 0.5)`;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 8), cy + Math.sin(needleAngle) * (radius - 8));
          ctx.stroke();
          ctx.shadowBlur = 0;
          // Center dot
          ctx.fillStyle = greenBright;
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();

          // Labels
          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("POWER", 8, 14);
          const powerVal = (power * 30 - 20).toFixed(1);
          ctx.fillStyle = greenBright;
          ctx.font = "14px monospace";
          ctx.fillText(`${powerVal} dBm`, 8, 30);
          break;
        }

        // ==================== FREQUENCY COUNTER: 7-SEGMENT ====================
        case "fc": {
          const freq = 350.000000 + Math.sin(t * 10) * 0.001 + Math.random() * 0.0005;
          const freqStr = freq.toFixed(6);
          // Draw 7-segment style display
          ctx.fillStyle = `rgba(${hexRgb(greenDim)}, 0.1)`;
          ctx.font = "bold 32px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillText(freqStr, w / 2, h / 2 + 10);
          ctx.fillStyle = greenBright;
          ctx.shadowColor = `rgba(${hexRgb(green)}, 0.6)`;
          ctx.shadowBlur = 8;
          ctx.fillText(freqStr, w / 2, h / 2 + 10);
          ctx.shadowBlur = 0;
          ctx.textAlign = "left";
          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("FREQUENCY (MHz)", 8, 14);
          ctx.fillText("REF: OCXO · GATING: 1s", 8, h - 8);
          break;
        }

        // ==================== ANTENNA RADIATION PATTERN ====================
        case "ac": {
          const cx = w / 2;
          const cy = h / 2;
          const maxR = Math.min(w, h) / 2 - 15;
          // Polar grid circles
          ctx.strokeStyle = `rgba(${hexRgb(green)}, 0.1)`;
          for (let i = 1; i <= 4; i++) {
            ctx.beginPath();
            ctx.arc(cx, cy, (maxR / 4) * i, 0, Math.PI * 2);
            ctx.stroke();
          }
          // Cross hairs
          ctx.beginPath();
          ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
          ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
          ctx.stroke();

          // Radiation pattern (dipole-like)
          ctx.strokeStyle = greenBright;
          ctx.lineWidth = 2;
          ctx.shadowColor = `rgba(${hexRgb(green)}, 0.5)`;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          const segments = 180;
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2 + t * 0.1;
            const gain = Math.abs(Math.sin(angle + t * 0.3)) * maxR * 0.8;
            const x = cx + Math.cos(angle) * gain;
            const y = cy + Math.sin(angle) * gain;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Labels
          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("RADIATION PATTERN · 0°", 8, 14);
          ctx.fillText("90°", 8, cy + 4);
          ctx.fillText("270°", w - 30, cy + 4);
          break;
        }

        // ==================== EM SIMULATOR: FIELD HEATMAP ====================
        case "sim": {
          // Update heatmap data
          const cols = 30;
          const rows = 20;
          const cellW = w / cols;
          const cellH = h / rows;
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const dx = x - cols / 2;
              const dy = y - rows / 2;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const val = Math.sin(t - dist * 0.3) * 0.5 + 0.5;
              const intensity = val * Math.exp(-dist * 0.05);
              const r = Math.floor(intensity * 50);
              const g = Math.floor(intensity * 255);
              const b = Math.floor(intensity * 65);
              ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.5})`;
              ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            }
          }

          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("EM FIELD · TIME DOMAIN", 8, 14);
          break;
        }

        // ==================== TEMP CHAMBER: TEMPERATURE GRAPH ====================
        case "ts": {
          // Update data
          data.shift();
          const target = 25 + 50 * Math.sin(t * 0.2);
          data.push(target + (Math.random() - 0.5) * 2);

          // Grid
          ctx.strokeStyle = `rgba(${hexRgb(green)}, 0.08)`;
          for (let i = 0; i <= 5; i++) {
            const y = (i / 5) * h;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }

          // Draw graph
          ctx.strokeStyle = greenBright;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = `rgba(${hexRgb(green)}, 0.4)`;
          ctx.shadowBlur = 4;
          ctx.beginPath();
          for (let i = 0; i < data.length; i++) {
            const x = (i / data.length) * w;
            const y = h - 10 - (data[i] / 100) * (h - 20);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("TEMPERATURE (°C)", 8, 14);
          const current = data[data.length - 1];
          ctx.fillStyle = greenBright;
          ctx.font = "12px monospace";
          ctx.fillText(`${current.toFixed(1)}°C`, 8, 30);
          break;
        }

        // ==================== POWER SUPPLY: DIGITAL READOUT ====================
        case "ps": {
          const voltage = 12.0 + Math.sin(t * 2) * 0.05;
          const current = 0.5 + 0.3 * Math.sin(t * 1.5) + Math.random() * 0.02;
          const power = voltage * current;

          ctx.font = "bold 18px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(${hexRgb(greenDim)}, 0.15)`;
          ctx.fillText(`${voltage.toFixed(3)}V`, w / 2, h / 2 - 5);
          ctx.fillText(`${current.toFixed(3)}A`, w / 2, h / 2 + 20);
          ctx.fillStyle = greenBright;
          ctx.shadowColor = `rgba(${hexRgb(green)}, 0.5)`;
          ctx.shadowBlur = 6;
          ctx.fillText(`${voltage.toFixed(3)}V`, w / 2, h / 2 - 5);
          ctx.fillText(`${current.toFixed(3)}A`, w / 2, h / 2 + 20);
          ctx.shadowBlur = 0;
          ctx.textAlign = "left";

          ctx.fillStyle = textDim;
          ctx.font = "9px monospace";
          ctx.fillText("CH1 · 12V / 0.5A", 8, 14);
          ctx.fillText(`P = ${power.toFixed(2)}W`, 8, h - 8);
          break;
        }

        default: {
          ctx.fillStyle = textDim;
          ctx.font = "11px monospace";
          ctx.textAlign = "center";
          ctx.fillText("visualization not available", w / 2, h / 2);
          ctx.textAlign = "left";
        }
      }

      // === ANTI-COPY PROTECTION ===
      import("@/lib/canvas-protect").then(({ watermarkCanvas }) => {
        watermarkCanvas(ctx, w, h);
      });
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      draw(0);
      cancelAnimationFrame(rafRef.current);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [active, category, specs]);

  const deviceLabels: Record<string, string> = {
    vna: "Smith Chart (S-parameters)",
    sa: "Spectrum Analyzer",
    pm: "Power Meter",
    fc: "Frequency Counter",
    ac: "Radiation Pattern",
    sim: "EM Field Simulation",
    ts: "Temperature Graph",
    ps: "Power Supply Readout",
  };

  return (
    <div className="lab-visualizer-wrapper">
      {active ? (
        <div className="lab-visualizer">
          <div className="lab-visualizer-bar">
            <span className="lab-visualizer-title">▸ {deviceLabels[category] || "Visualization"}</span>
            <button className="lab-visualizer-close" onClick={() => setActive(false)}>×</button>
          </div>
          <canvas ref={canvasRef} style={{ width: "100%", height: 150, display: "block" }} />
        </div>
      ) : (
        <button className="lab-visualize-btn" onClick={() => setActive(true)}>
          ▸ show live visualization
        </button>
      )}
    </div>
  );
}

function hexRgb(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "0, 255, 65";
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}
