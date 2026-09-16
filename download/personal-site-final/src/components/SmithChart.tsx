"use client";

/**
 * Smith Chart — decorative SVG. A recognizable RF engineering visual.
 * Subtle, animated rotation optional.
 */
export default function SmithChart({ size = 200 }: { size?: number }) {
  // Pre-generated circles for the Smith chart (simplified, decorative)
  // Real Smith chart: constant resistance circles + constant reactance arcs.
  // Here we draw a stylized version that's visually recognizable.
  const rCircles = [0, 0.2, 0.5, 1, 2, 5];
  const xArcs = [0.2, 0.5, 1, 2];

  return (
    <svg
      className="smith-chart"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* outer circle (unit circle) */}
      <circle cx="100" cy="100" r="95" stroke="rgba(0,255,65,0.4)" strokeWidth="1" />

      {/* horizontal axis */}
      <line x1="5" y1="100" x2="195" y2="100" stroke="rgba(0,255,65,0.25)" strokeWidth="1" />

      {/* constant resistance circles */}
      {rCircles.map((r, i) => {
        // center on horizontal axis, to the right; radius shrinks as r grows
        const cx = 100 + (1 - r) / (1 + r) * 95;
        const rad = r / (1 + r) * 95;
        if (rad < 1) return null;
        return (
          <circle
            key={`r${i}`}
            cx={cx}
            cy="100"
            r={rad}
            stroke="rgba(0,255,65,0.2)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* constant reactance arcs (upper half) */}
      {xArcs.map((x, i) => {
        const cx = 100 + 95;
        const r = 1 / x * 95;
        return (
          <path
            key={`xu${i}`}
            d={`M ${cx - r * 0.7} ${100 - r * 0.7} A ${r} ${r} 0 0 1 ${cx} ${100 - r}`}
            stroke="rgba(0,255,65,0.15)"
            strokeWidth="0.8"
          />
        );
      })}
      {/* lower half mirror */}
      {xArcs.map((x, i) => {
        const cx = 100 + 95;
        const r = 1 / x * 95;
        return (
          <path
            key={`xl${i}`}
            d={`M ${cx - r * 0.7} ${100 + r * 0.7} A ${r} ${r} 0 0 0 ${cx} ${100 + r}`}
            stroke="rgba(0,255,65,0.15)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* center dot */}
      <circle cx="195" cy="100" r="2" fill="#00ff41" />

      {/* label */}
      <text x="10" y="190" fill="rgba(0,255,65,0.4)" fontSize="7" fontFamily="monospace">
        SMITH · Z-plane
      </text>
    </svg>
  );
}
