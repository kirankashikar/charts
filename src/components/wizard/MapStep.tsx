"use client";

import { chartDef, Mapping } from "@/lib/chart-types";
import { flowLinks, matrixData, obsGroups, geoPoints, geoArcs } from "@/lib/chart-builder";
import { chipBtn } from "./controls";
import type { StepProps } from "./types";

interface FieldRow {
  label: string;
  help: string;
  control: React.ReactNode;
}

function colSelect(
  cols: string[],
  value: number,
  onChange: (i: number) => void
) {
  return (
    <select className="input" value={String(value)} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%" }}>
      {cols.map((c, i) => (
        <option key={i} value={String(i)}>
          {c}
        </option>
      ))}
    </select>
  );
}

export function MapStep({ chart, update }: StepProps) {
  const def = chartDef(chart.chartType);
  const cols = chart.sheets.flows.cols;
  const setObs = <K extends keyof Mapping["obs"]>(key: K, value: number) =>
    update({ mapping: { ...chart.mapping, obs: { ...chart.mapping.obs, [key]: value } } });
  const setGeoPoint = <K extends keyof Mapping["geoPoint"]>(key: K, value: number) =>
    update({ mapping: { ...chart.mapping, geoPoint: { ...chart.mapping.geoPoint, [key]: value } } });
  const setGeoArc = <K extends keyof Mapping["geoArc"]>(key: K, value: number) =>
    update({ mapping: { ...chart.mapping, geoArc: { ...chart.mapping.geoArc, [key]: value } } });
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
  } else if (def.shape === "obs") {
    fields.push({
      label: "Group",
      help: "One violin per distinct value in this column",
      control: colSelect(cols, chart.mapping.obs.group, (i) => setObs("group", i)),
    });
    fields.push({
      label: "Value",
      help: "One number per row — the observation itself, not a total",
      control: colSelect(cols, chart.mapping.obs.value, (i) => setObs("value", i)),
    });
  } else if (def.shape === "geopoint") {
    (
      [
        ["place", "Place", "Label shown at each point"],
        ["lat", "Latitude", "-90 to 90"],
        ["lon", "Longitude", "-180 to 180"],
        ["value", "Value", "Drives the circle's size"],
      ] as const
    ).forEach(([key, label, help]) => {
      fields.push({ label, help, control: colSelect(cols, chart.mapping.geoPoint[key], (i) => setGeoPoint(key, i)) });
    });
  } else if (def.shape === "geoarc") {
    (
      [
        ["originPlace", "Origin", "Label for the arc's start"],
        ["originLat", "Origin latitude", "-90 to 90"],
        ["originLon", "Origin longitude", "-180 to 180"],
        ["destPlace", "Destination", "Label for the arc's end"],
        ["destLat", "Destination latitude", "-90 to 90"],
        ["destLon", "Destination longitude", "-180 to 180"],
        ["value", "Value", "Drives the arc's thickness"],
      ] as const
    ).forEach(([key, label, help]) => {
      fields.push({ label, help, control: colSelect(cols, chart.mapping.geoArc[key], (i) => setGeoArc(key, i)) });
    });
  }

  const intro =
    def.shape === "flow"
      ? "A flow chart needs three columns: two node columns and a numeric weight. Repeat a target name as a source to chain another stage."
      : def.shape === "matrix"
        ? "A comparison chart needs one label column and three or more numeric measures. Each measure becomes an axis or a band."
        : def.shape === "obs"
          ? "A violin plot needs one row per observation — a group column plus the raw value, not a pre-aggregated total."
          : def.shape === "geopoint"
            ? "A symbol map needs a latitude and longitude column plus a numeric value — one row per place."
            : "A connection map needs a latitude/longitude pair for both the origin and the destination, plus a numeric value.";

  const locked =
    (def.shape === "obs" && obsGroups(chart.sheets, chart.mapping).length === 0) ||
    (def.shape === "geopoint" && geoPoints(chart.sheets, chart.mapping).length === 0) ||
    (def.shape === "geoarc" && geoArcs(chart.sheets, chart.mapping).length === 0);

  const validNote = locked
    ? `${def.name} can't render from these sheets yet — add the columns it needs, or pick another type.`
    : def.shape === "flow"
      ? `${flowLinks(chart.sheets, chart.mapping).length} valid links found. Rows with a blank node or a non-numeric value are skipped, not deleted.`
      : def.shape === "matrix"
        ? `${matrixData(chart.sheets, chart.mapping).rows.length} series × ${
            matrixData(chart.sheets, chart.mapping).axes.length
          } measures. Three measures minimum for a readable shape.`
        : def.shape === "obs"
          ? `${obsGroups(chart.sheets, chart.mapping).length} groups found across ${chart.sheets.flows.rows.length} rows.`
          : def.shape === "geopoint"
            ? `${geoPoints(chart.sheets, chart.mapping).length} valid places found.`
            : `${geoArcs(chart.sheets, chart.mapping).length} valid routes found.`;

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
