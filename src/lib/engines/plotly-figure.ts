import { groundColors, paletteColors } from "../chart-builder";
import type { ChartSnapshot } from "../chart-types";
import { hierarchyData, matrixSeries, nodeLinkData } from "../engine-data";

export interface PlotlyFigure {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

export function plotlyFigure(snapshot: ChartSnapshot): PlotlyFigure | null {
  const { chartType, style } = snapshot;
  const colors = paletteColors(style);
  const { ink, groundBg, muted } = groundColors(style.ground);
  const alpha = style.fillAlpha;

  const layout: Record<string, unknown> = {
    paper_bgcolor: groundBg,
    plot_bgcolor: groundBg,
    font: { family: "Archivo, system-ui, sans-serif", color: ink, size: 12 },
    margin: { l: 50, r: 30, t: 30, b: 40 },
    showlegend: style.labels,
    legend: { font: { color: ink } },
  };

  if (chartType === "sankey") {
    const { nodes, links } = nodeLinkData(snapshot);
    const index = new Map(nodes.map((n, i) => [n, i]));
    return {
      data: [
        {
          type: "sankey",
          orientation: "h",
          node: {
            label: style.labels ? nodes : nodes.map(() => ""),
            pad: 14,
            thickness: 13,
            color: nodes.map(() => ink),
            line: { width: 0 },
          },
          link: {
            source: links.map((l) => index.get(l.source)),
            target: links.map((l) => index.get(l.target)),
            value: links.map((l) => l.value),
            color: links.map((_, i) => hexToRgba(colors[i % colors.length], 0.32 * alpha)),
          },
        },
      ],
      layout,
    };
  }

  if (chartType === "sunburst" || chartType === "treemap") {
    const root = hierarchyData(snapshot);
    const labels: string[] = [];
    const parents: string[] = [];
    const values: number[] = [];
    const marker: string[] = [];
    root.children?.forEach((group, i) => {
      labels.push(group.name);
      parents.push("");
      values.push((group.children ?? []).reduce((sum, kid) => sum + (kid.value ?? 0), 0));
      marker.push(colors[i % colors.length]);
      group.children?.forEach((kid) => {
        labels.push(`${group.name} → ${kid.name}`);
        parents.push(group.name);
        values.push(kid.value ?? 0);
        marker.push(hexToRgba(colors[i % colors.length], (chartType === "treemap" ? 0.85 : 0.55) * alpha));
      });
    });
    return {
      data: [
        {
          type: chartType,
          labels,
          parents,
          values,
          branchvalues: "total",
          marker: { colors: marker, line: { color: groundBg, width: 2 } },
          textinfo: style.labels ? (style.values ? "label+value" : "label") : "none",
        },
      ],
      layout,
    };
  }

  if (chartType === "parallel") {
    const { axes, rows } = matrixSeries(snapshot);
    return {
      data: [
        {
          type: "parcoords",
          line: { color: rows.map((_, i) => i), colorscale: colors.map((c, i) => [i / (colors.length - 1), c]) },
          dimensions: axes.map((name, i) => ({
            label: name,
            values: rows.map((r) => r.vals[i]),
            range: [0, Math.max(1, ...rows.map((r) => r.vals[i]))],
          })),
        },
      ],
      layout: { ...layout, margin: { l: 70, r: 50, t: 60, b: 40 } },
    };
  }

  if (chartType === "radar") {
    const { axes, rows } = matrixSeries(snapshot);
    return {
      data: rows.map((r, i) => ({
        type: "scatterpolar",
        r: [...r.vals, r.vals[0]],
        theta: [...axes, axes[0]],
        fill: "toself",
        name: r.label,
        fillcolor: hexToRgba(colors[i % colors.length], 0.16 * alpha),
        line: { color: colors[i % colors.length], width: 2.5 },
      })),
      layout: {
        ...layout,
        polar: {
          bgcolor: groundBg,
          radialaxis: { visible: true, gridcolor: muted, linecolor: muted },
          angularaxis: { gridcolor: muted, linecolor: muted },
        },
      },
    };
  }

  return null;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.slice(0, 6);
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
