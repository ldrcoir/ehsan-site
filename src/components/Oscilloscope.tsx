"use client";

import { useEffect, useRef } from "react";

/**
 * Oscilloscope — animated sine wave that reacts to mouse movement.
 * Pure canvas, no deps. Adds RF/electronic vibe.
 */
export default function Oscilloscope({ height = 80 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
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

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
    };
    canvas.addEventListener("mousemove", onMove);

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.04;

      // fade trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "rgba(0, 255, 65, 0.08)";
      ctx.lineWidth = 1;
      const gridX = 8;
      const gridY = 4;
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

      // center line
      ctx.strokeStyle = "rgba(0, 255, 65, 0.2)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // waveform — freq and amp react to mouse
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const freq = 2 + mx * 6; // 2–8 cycles
      const amp = (0.15 + (1 - my) * 0.3) * h;

      // glow
      ctx.shadowColor = "rgba(0, 255, 65, 0.6)";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#00ff41";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        const phase = (x / w) * Math.PI * 2 * freq + t;
        // composite sine + harmonic for richer waveform
        const y = h / 2
          + Math.sin(phase) * amp
          + Math.sin(phase * 2.1 + t * 0.7) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    if (!reduce) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      // static draw
      draw();
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className="oscilloscope" style={{ height }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      <div className="oscilloscope-label">CH1 · RF · 10 mV/div</div>
    </div>
  );
}
