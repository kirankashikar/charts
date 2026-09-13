import type { CSSProperties } from "react";
import type { Scene } from "@/lib/chart-builder";

/** Staggered per-shape delay so the chart draws in like Highcharts' load
 *  animation, instead of appearing all at once. Capped so large scenes
 *  (choropleths, big sankeys) don't take forever to finish drawing. */
const delayFor = (i: number) => `${Math.min(i, 40) * 12}ms`;

export function ChartSvg({ scene, style }: { scene: Scene; style?: CSSProperties }) {
  // Re-keying on the shape composition (not every value edit) restarts the
  // entrance animation when the chart type or data shape actually changes,
  // without replaying it on every keystroke in the data grid.
  const revision = `${scene.vb}|${scene.paths.length}|${scene.rects.length}|${scene.circles.length}|${scene.lines.length}|${scene.labels.length}`;
  return (
    <svg
      key={revision}
      viewBox={scene.vb}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block", fontFamily: "Archivo, system-ui, sans-serif", ...style }}
    >
      <style>{`
        @keyframes chart-svg-in {
          from { opacity: 0; transform: scale(0.94) translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        .chart-svg-shape { transform-box: fill-box; transform-origin: center; animation: chart-svg-in 480ms cubic-bezier(.16,1,.3,1) backwards; }
      `}</style>
      {scene.paths.map((s, i) => (
        <path
          key={`p${i}`}
          className="chart-svg-shape"
          style={{ animationDelay: delayFor(i) }}
          d={s.d}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.sw}
          opacity={s.op}
        >
          {s.tip && <title>{s.tip}</title>}
        </path>
      ))}
      {scene.rects.map((s, i) => (
        <rect
          key={`r${i}`}
          className="chart-svg-shape"
          style={{ animationDelay: delayFor(i) }}
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.sw}
          opacity={s.op}
        >
          {s.tip && <title>{s.tip}</title>}
        </rect>
      ))}
      {scene.circles.map((s, i) => (
        <circle
          key={`c${i}`}
          className="chart-svg-shape"
          style={{ animationDelay: delayFor(i) }}
          cx={s.cx}
          cy={s.cy}
          r={s.r}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.sw}
          opacity={s.op}
        >
          {s.tip && <title>{s.tip}</title>}
        </circle>
      ))}
      {scene.lines.map((s, i) => (
        <line
          key={`l${i}`}
          className="chart-svg-shape"
          style={{ animationDelay: delayFor(i) }}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.stroke}
          strokeWidth={s.sw}
          opacity={s.op}
        />
      ))}
      {scene.labels.map((s, i) => (
        <text
          key={`t${i}`}
          className="chart-svg-shape"
          style={{ animationDelay: delayFor(i) }}
          x={s.x}
          y={s.y}
          fill={s.fill}
          fontSize={s.size}
          fontWeight={s.weight}
          textAnchor={s.anchor}
          opacity={s.op}
          transform={s.tr || undefined}
        >
          {s.text}
        </text>
      ))}
    </svg>
  );
}
