"use client";

import { useEffect, useRef } from "react";

/**
 * SpectrumAnalyzer — animated frequency spectrum display.
 * Shows signal power across a frequency range with peaks and noise floor.
 * More visually dynamic and RF-relevant than a Smith Chart.
 */
export default function SpectrumAnalyzer({ height = 120 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Persistent peaks that slowly decay
    const numBins = 48;
    const peaks = new Array(numBins).fill(0);
    const noiseFloor = 0.15;

    // Simulated signal sources at specific bins
    const signals = [
      { bin: 8, strength: 0.7, freq: "2.40" },
      { bin: 16, strength: 0.5, freq: "2.44" },
      { bin: 28, strength: 0.85, freq: "5.18" },
      { bin: 38, strength: 0.6, freq: "5.74" },
    ];

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.05;

      // Clear
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(0, 255, 65, 0.08)";
      ctx.lineWidth = 1;
      const gridX = 8;
      const gridY = 5;
      for (let i = 0; i <= gridX; i++) {
        const x = (i / gridX) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let i = 0; i <= gridY; i++) {
        const y = (i / gridY) * h;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Draw spectrum bars
      const barWidth = w / numBins;
      for (let i = 0; i < numBins; i++) {
        // Base noise
        let val = noiseFloor + Math.random() * 0.08;

        // Add signal contributions
        for (const sig of signals) {
          const dist = Math.abs(i - sig.bin);
          if (dist < 4) {
            val += sig.strength * Math.exp(-dist * dist * 0.5) * (0.9 + Math.sin(t + i * 0.3) * 0.1);
          }
        }

        // Peak hold
        if (val > peaks[i]) {
          peaks[i] = val;
        } else {
          peaks[i] = Math.max(val, peaks[i] - 0.005);
        }

        // Draw bar
        const barHeight = val * h * 0.85;
        const y = h - barHeight;

        // Gradient: green at bottom, brighter at top
        const gradient = ctx.createLinearGradient(0, h, 0, y);
        gradient.addColorStop(0, "rgba(0, 143, 17, 0.6)");
        gradient.addColorStop(0.7, "rgba(0, 255, 65, 0.7)");
        gradient.addColorStop(1, "rgba(57, 255, 20, 0.9)");
        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth + 1, y, barWidth - 2, barHeight);

        // Peak line
        const peakY = h - peaks[i] * h * 0.85;
        ctx.fillStyle = "#39ff14";
        ctx.fillRect(i * barWidth + 1, peakY, barWidth - 2, 2);
      }

      // Frequency labels
      ctx.fillStyle = "rgba(0, 255, 65, 0.5)";
      ctx.font = "8px monospace";
      const freqs = ["2.0", "3.0", "4.0", "5.0", "6.0"];
      freqs.forEach((f, i) => {
        const x = (i / (freqs.length - 1)) * (w - 20) + 10;
        ctx.fillText(f + "G", x, h - 3);
      });

      // dBm labels
      ctx.fillStyle = "rgba(0, 255, 65, 0.4)";
      const dbmLabels = ["0", "-20", "-40", "-60", "-80"];
      dbmLabels.forEach((d, i) => {
        const y = (i / (dbmLabels.length - 1)) * (h - 10) + 8;
        ctx.fillText(d, 2, y);
      });

      // Title
      ctx.fillStyle = "rgba(0, 255, 65, 0.6)";
      ctx.font = "8px monospace";
      ctx.fillText("SPECTRUM · SPAN 2-6GHz · RBW 1MHz", w / 2 - 60, 10);
    };

    if (!reduce) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      draw();
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="spectrum-analyzer" style={{ height }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
