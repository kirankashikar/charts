"use client";

import { CHART_GROUPS, SheetKey, isSeedSheet, seedFor } from "@/lib/chart-types";
import { chartIcon } from "./chart-icons";
import { cardBtn } from "./controls";
import type { StepProps } from "./types";

export function ChartStep({
  chart,
  update,
  setActiveSheet,
}: StepProps & { setActiveSheet: (key: SheetKey) => void }) {
  return (
    <div style={{ padding: "24px 28px 40px" }}>
      <h2 style={{ fontSize: 26, margin: 0 }}>Chart type</h2>
      <p style={{ fontSize: 13, color: "#605d5d", margin: "4px 0 20px", maxWidth: "60ch" }}>
        Types are grouped by the question they answer. Anything your current sheets can&apos;t feed is shown with what it
        needs.
      </p>
      {CHART_GROUPS.map((group) => (
        <div key={group.g} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {group.g}
            </div>
            <div style={{ flex: 1, height: 2, background: "var(--color-divider)" }} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,178px),1fr))",
              gap: 10,
            }}
          >
            {group.items.map((item) => {
              const on = item.id === chart.chartType;
              const unsupported = item.shape === "geo" || item.shape === "obs";
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    const feedingKey: SheetKey = item.shape === "matrix" ? "segments" : "flows";
                    const current = chart.sheets[feedingKey];
                    // Only swap in the new type's seed data when the sheet still
                    // holds a built-in seed — never overwrite something the user
                    // has typed or pasted over it.
                    if (isSeedSheet(current, item.shape)) {
                      update({
                        chartType: item.id,
                        sheets: { ...chart.sheets, [feedingKey]: seedFor(item.id) },
                      });
                    } else {
                      update({ chartType: item.id });
                    }
                    setActiveSheet(feedingKey);
                  }}
                  style={cardBtn(on, unsupported)}
                >
                  <svg viewBox="0 0 60 34" style={{ width: 60, height: 34, display: "block", marginBottom: 10 }}>
                    {chartIcon(item.id).map((p, i) => (
                      <path key={i} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.sw} />
                    ))}
                  </svg>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13.5, lineHeight: 1.2 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#7d7979", marginTop: 3, lineHeight: 1.35 }}>
                    {unsupported
                      ? item.shape === "geo"
                        ? "Needs lat/lon columns"
                        : "Needs raw observations"
                      : item.note}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
