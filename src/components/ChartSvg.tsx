import type { CSSProperties } from "react";
import type { Scene } from "@/lib/chart-builder";

export function ChartSvg({ scene, style }: { scene: Scene; style?: CSSProperties }) {
  return (
    <svg
      viewBox={scene.vb}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block", fontFamily: "Archivo, system-ui, sans-serif", ...style }}
    >
      {scene.paths.map((s, i) => (
        <path key={`p${i}`} d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} opacity={s.op} />
      ))}
      {scene.rects.map((s, i) => (
        <rect
          key={`r${i}`}
          x={s.x}
          y={s.y}
          width={s.w}
          height={s.h}
          fill={s.fill}
          stroke={s.stroke}
          strokeWidth={s.sw}
          opacity={s.op}
        />
      ))}
      {scene.circles.map((s, i) => (
        <circle key={`c${i}`} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} opacity={s.op} />
      ))}
      {scene.lines.map((s, i) => (
        <line key={`l${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.stroke} strokeWidth={s.sw} opacity={s.op} />
      ))}
      {scene.labels.map((s, i) => (
        <text
          key={`t${i}`}
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
