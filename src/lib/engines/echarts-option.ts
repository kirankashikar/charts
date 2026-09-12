import { groundColors, paletteColors } from "../chart-builder";
import type { ChartSnapshot } from "../chart-types";
import { hierarchyData, matrixSeries, nodeLinkData } from "../engine-data";

type EChartsOption = Record<string, unknown>;

/**
 * ECharts config for a snapshot. Pure data, so the browser and the server-side
 * SVG renderer that feeds the published PNG produce the same chart.
 */
export function echartsOption(snapshot: ChartSnapshot): EChartsOption | null {
  const { chartType, style } = snapshot;
  const colors = paletteColors(style);
  const { ink, muted, groundBg } = groundColors(style.ground);
  const alpha = style.fillAlpha;

  const base: EChartsOption = {
    color: colors,
    backgroundColor: groundBg,
    animation: false,
    textStyle: { fontFamily: "Archivo, system-ui, sans-serif", color: ink },
    tooltip: { trigger: "item" },
  };

  const labelOn = { show: style.labels, color: ink, fontFamily: "Archivo, system-ui, sans-serif" };

  if (chartType === "sankey") {
    const { nodes, links } = nodeLinkData(snapshot);
    return {
      ...base,
      series: [
        {
          type: "sankey",
          data: nodes.map((name) => ({ name })),
          links,
          emphasis: { focus: "adjacency" },
          label: { ...labelOn, fontWeight: 600 },
          lineStyle: { color: "gradient", opacity: 0.32 * alpha },
          itemStyle: { color: ink, borderWidth: 0 },
          left: 24,
          right: 90,
          top: 20,
          bottom: 20,
        },
      ],
    };
  }

  if (chartType === "sunburst") {
    return {
      ...base,
      series: [
        {
          type: "sunburst",
          radius: ["18%", "88%"],
          data: hierarchyData(snapshot).children,
          label: { ...labelOn, minAngle: 8 },
          itemStyle: { borderColor: groundBg, borderWidth: 2, opacity: alpha },
          levels: [{}, { r0: "18%", r: "52%" }, { r0: "54%", r: "88%", itemStyle: { opacity: 0.55 * alpha } }],
        },
      ],
    };
  }

  if (chartType === "treemap") {
    return {
      ...base,
      series: [
        {
          type: "treemap",
          data: hierarchyData(snapshot).children,
          roam: false,
          breadcrumb: { show: false },
          label: { ...labelOn, color: "#f3f2f2", fontWeight: 700 },
          upperLabel: { show: style.labels, height: 20, color: ink },
          itemStyle: { borderColor: groundBg, borderWidth: 2, gapWidth: 2, opacity: alpha },
        },
      ],
    };
  }

  if (chartType === "network" || chartType === "chord") {
    const { nodes, links } = nodeLinkData(snapshot);
    const weight = new Map<string, number>();
    for (const l of links) {
      weight.set(l.source, (weight.get(l.source) ?? 0) + l.value);
      weight.set(l.target, (weight.get(l.target) ?? 0) + l.value);
    }
    const max = Math.max(1, ...weight.values());
    const maxLink = Math.max(1, ...links.map((l) => l.value));
    return {
      ...base,
      series: [
        {
          type: "graph",
          layout: "circular",
          circular: { rotateLabel: true },
          data: nodes.map((name, i) => ({
            name,
            value: weight.get(name) ?? 0,
            symbolSize: 10 + 26 * Math.sqrt((weight.get(name) ?? 0) / max),
            itemStyle: { color: colors[i % colors.length] },
          })),
          links: links.map((l, i) => ({
            ...l,
            lineStyle: {
              width: chartType === "chord" ? Math.max(2, (l.value / maxLink) * 16) : Math.max(1, (l.value / maxLink) * 9),
              opacity: (chartType === "chord" ? 0.3 : 0.5) * alpha,
              curveness: 0.35,
              color: colors[i % colors.length],
            },
          })),
          label: { ...labelOn, position: "right" },
          emphasis: { focus: "adjacency" },
        },
      ],
    };
  }

  if (chartType === "parallel") {
    const { axes, rows } = matrixSeries(snapshot);
    return {
      ...base,
      parallelAxis: axes.map((name, i) => ({
        dim: i,
        name,
        nameTextStyle: { color: ink, fontWeight: 700 },
        axisLine: { lineStyle: { color: ink } },
        axisLabel: { color: muted },
      })),
      parallel: { left: 60, right: 40, top: 60, bottom: 40 },
      series: rows.map((r, i) => ({
        type: "parallel",
        name: r.label,
        data: [r.vals],
        lineStyle: { width: 2.5, opacity: 0.9 * alpha, color: colors[i % colors.length] },
      })),
      legend: { show: style.labels, textStyle: { color: ink }, top: 8 },
    };
  }

  if (chartType === "radar") {
    const { axes, rows, max } = matrixSeries(snapshot);
    return {
      ...base,
      radar: {
        indicator: axes.map((name) => ({ name, max })),
        axisName: { color: ink, fontWeight: 700 },
        splitLine: { lineStyle: { color: muted } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: muted } },
      },
      legend: { show: style.labels, textStyle: { color: ink }, left: 8, top: 8, orient: "vertical" },
      series: [
        {
          type: "radar",
          data: rows.map((r, i) => ({
            value: r.vals,
            name: r.label,
            areaStyle: { opacity: 0.16 * alpha, color: colors[i % colors.length] },
            lineStyle: { width: 2.5, color: colors[i % colors.length] },
            itemStyle: { color: colors[i % colors.length] },
          })),
        },
      ],
    };
  }

  return null;
}
