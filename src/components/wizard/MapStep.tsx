"use client";

import { chartDef } from "@/lib/chart-types";
import { flowLinks, matrixData } from "@/lib/chart-builder";
import { chipBtn } from "./controls";
import type { StepProps } from "./types";

interface FieldRow {
  label: string;
  help: string;
  control: React.ReactNode;
}

export function MapStep({ chart, update }: StepProps) {
  const def = chartDef(chart.chartType);
  const locked = def.shape === "geo" || def.shape === "obs";
  const fields: FieldRow[] = [];

  if (def.shape === "flow") {
    const options = chart.sheets.flows.cols.map((c, i) => ({ value: String(i), label: c }));
    (
      [
        ["s", "Source node", "Where each unit of volume starts"],
        ["t", "Target node", "Where it lands — repeated names chain into stages"],
        ["v", "Value", "Numeric weight; drives ribbon thickness and area"],
      ] as const
    ).forEach(([key, label, help]) => {
      fields.push({
        label,
        help,
        control: (
          <select
            className="input"
            value={String(chart.mapping.flow[key])}
            onChange={(e) =>
              update({ mapping: { ...chart.mapping, flow: { ...chart.mapping.flow, [key]: Number(e.target.value) } } })
            }
            style={{ width: "100%" }}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ),
      });
    });
  } else if (def.shape === "matrix") {
    fields.push({
      label: "Series label",
      help: "One line, spoke set or column per row",
      control: (
        <select
          className="input"
          value={String(chart.mapping.matrix.label)}
          onChange={(e) =>
            update({
              mapping: { ...chart.mapping, matrix: { ...chart.mapping.matrix, label: Number(e.target.value) } },
            })
          }
          style={{ width: "100%" }}
        >
          {chart.sheets.segments.cols.map((c, i) => (
            <option key={i} value={String(i)}>
              {c}
            </option>
          ))}
        </select>
      ),
    });
    fields.push({
      label: "Measures",
      help: "Pick 3 or more numeric columns — each becomes an axis",
      control: (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {chart.sheets.segments.cols.map((c, i) => {
            const on = chart.mapping.matrix.measures.includes(i);
            return (
              <button
                key={i}
                onClick={() => {
                  const measures = on
                    ? chart.mapping.matrix.measures.filter((m) => m !== i)
                    : [...chart.mapping.matrix.measures, i].sort((a, b) => a - b);
                  update({ mapping: { ...chart.mapping, matrix: { ...chart.mapping.matrix, measures } } });
                }}
                style={chipBtn(on)}
              >
                {c}
              </button>
            );
          })}
        </div>
      ),
    });
  } else {
    fields.push({
      label: def.shape === "geo" ? "Latitude / Longitude" : "Observation column",
      help:
        def.shape === "geo"
          ? "No column in this sheet is typed as Geo. Add lat/lon or a place-name column."
          : "Needs one row per observation, not pre-aggregated totals.",
      control: null,
    });
  }

  const intro =
    def.shape === "flow"
      ? "A flow chart needs three columns: two node columns and a numeric weight. Repeat a target name as a source to chain another stage."
      : def.shape === "matrix"
        ? "A comparison chart needs one label column and three or more numeric measures. Each measure becomes an axis or a band."
        : "This type needs columns the current sheets do not carry yet.";

  const validNote = locked
    ? `${def.name} can't render from these sheets yet — add the columns it needs, or pick another type.`
    : def.shape === "flow"
      ? `${flowLinks(chart.sheets, chart.mapping).length} valid links found. Rows with a blank node or a non-numeric value are skipped, not deleted.`
      : `${matrixData(chart.sheets, chart.mapping).rows.length} series × ${
          matrixData(chart.sheets, chart.mapping).axes.length
        } measures. Three measures minimum for a readable shape.`;

  return (
    <div style={{ padding: "24px 28px 40px" }}>
      <h2 style={{ fontSize: 26, margin: 0 }}>Map data to {def.name}</h2>
      <p style={{ fontSize: 13, color: "#605d5d", margin: "4px 0 20px", maxWidth: "60ch" }}>{intro}</p>
      {fields.map((f) => (
        <div
          key={f.label}
          style={{
            display: "flex",
            gap: 20,
            alignItems: "flex-start",
            padding: "16px 0",
            borderTop: "1px solid var(--color-divider)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 14 }}>
              {f.label} <span style={{ color: "#ec3013" }}>*</span>
            </div>
            <div style={{ fontSize: 12, color: "#7d7979", marginTop: 2, maxWidth: "40ch" }}>{f.help}</div>
          </div>
          <div style={{ flex: "1 1 220px" }}>{f.control}</div>
        </div>
      ))}
      <div
        style={{
          borderTop: "2px solid var(--color-divider)",
          marginTop: 8,
          paddingTop: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ width: 8, height: 8, background: locked ? "#ec3013" : "#201e1d", marginTop: 6, flex: "none" }} />
        <div style={{ fontSize: 13, color: "#444141", maxWidth: "64ch" }}>{validNote}</div>
      </div>
    </div>
  );
}
