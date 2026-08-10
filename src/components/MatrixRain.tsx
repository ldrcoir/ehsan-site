"use client";

import { useEffect, useRef } from "react";

/**
 * Matrix rain canvas — fixed background, subtle green characters falling.
 * Respects prefers-reduced-motion.
 */
export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: number[] = [];
    const fontSize = 14;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=<>{}[]|\\/";

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.floor((Math.random() * height) / fontSize));
    };
    resize();
    window.addEventListener("resize", resize);

    let last = 0;
    const FPS = 18;
    const interval = 1000 / FPS;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < interval) return;
      last = now;

      // fade background slightly
      ctx.fillStyle = "rgba(0, 0, 0, 0.06)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // head is brighter
        if (Math.random() > 0.975) {
          ctx.fillStyle = "rgba(180, 255, 180, 0.9)";
        } else {
          ctx.fillStyle = "rgba(0, 255, 65, 0.45)";
        }
        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-bg" aria-hidden="true" />;
}
