"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartSvg } from "./ChartSvg";
import { buildScene } from "@/lib/chart-builder";
import { engineDraws, type ChartSnapshot } from "@/lib/chart-types";
import { echartsOption } from "@/lib/engines/echarts-option";
import { plotlyFigure } from "@/lib/engines/plotly-figure";

type EChartsInstance = { setOption: (o: unknown, opts?: unknown) => void; resize: () => void; dispose: () => void };

/**
 * Renders a snapshot with the engine it asks for. Library engines load on
 * demand; anything they can't draw falls back to the built-in SVG renderer so
 * the chart always appears.
 */
export function EngineChart({ snapshot }: { snapshot: ChartSnapshot }) {
  const host = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Keyed by engine+type so switching either one retries rather than staying
  // stuck on the built-in fallback.
  const [failedFor, setFailedFor] = useState<string | null>(null);

  const scene = useMemo(() => buildScene(snapshot), [snapshot]);
  const engine = snapshot.engine;
  const key = `${engine}:${snapshot.chartType}`;
  const setFailed = useCallback(() => setFailedFor(key), [key]);
  const usesLibrary =
    engine !== "builtin" && engineDraws(engine, snapshot.chartType) && !scene.locked && failedFor !== key;

  const option = useMemo(() => (engine === "echarts" && usesLibrary ? echartsOption(snapshot) : null), [engine, usesLibrary, snapshot]);
  const figure = useMemo(() => (engine === "plotly" && usesLibrary ? plotlyFigure(snapshot) : null), [engine, usesLibrary, snapshot]);

  // ECharts
  useEffect(() => {
    if (engine !== "echarts" || !option || !host.current) return;
    let chart: EChartsInstance | null = null;
    let disposed = false;
    let observer: ResizeObserver | null = null;

    import("echarts")
      .then((echarts) => {
        if (disposed || !host.current) return;
        chart = echarts.init(host.current, undefined, { renderer: "svg" }) as unknown as EChartsInstance;
        chart.setOption(option, { notMerge: true });
        observer = new ResizeObserver(() => chart?.resize());
        observer.observe(host.current);
      })
      .catch(() => setFailed());

    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
    };
  }, [engine, option, setFailed]);

  // Plotly
  useEffect(() => {
    if (engine !== "plotly" || !figure || !host.current) return;
    let disposed = false;
    const node = host.current;

    import("plotly.js-dist-min")
      .then((mod) => {
        const Plotly = (mod.default ?? mod) as {
          react: (el: HTMLElement, data: unknown, layout: unknown, config: unknown) => Promise<unknown>;
          purge: (el: HTMLElement) => void;
        };
        if (disposed) return;
        return Plotly.react(node, figure.data, figure.layout, {
          responsive: true,
          displayModeBar: false,
        }).then(() => {
          if (disposed) Plotly.purge(node);
        });
      })
      .catch(() => setFailed());

    return () => {
      disposed = true;
      import("plotly.js-dist-min")
        .then((mod) => {
          const Plotly = (mod.default ?? mod) as { purge: (el: HTMLElement) => void };
          Plotly.purge(node);
        })
        .catch(() => {});
    };
  }, [engine, figure, setFailed]);

  // D3
  useEffect(() => {
    if (engine !== "d3" || !usesLibrary || !svgRef.current) return;
    const el = svgRef.current;
    let disposed = false;

    import("@/lib/engines/d3-render")
      .then(({ renderD3 }) => {
        if (disposed) return;
        if (!renderD3(el, snapshot)) setFailed();
      })
      .catch(() => setFailed());

    return () => {
      disposed = true;
    };
  }, [engine, usesLibrary, snapshot, setFailed]);

  if (!usesLibrary) return <ChartSvg scene={scene} />;

  if (engine === "d3") {
    return <svg ref={svgRef} style={{ width: "100%", height: "auto", aspectRatio: "760 / 430", display: "block" }} />;
  }

  return <div ref={host} style={{ width: "100%", aspectRatio: "760 / 430" }} />;
}
