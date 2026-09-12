"use client";

import { useState } from "react";
import { chartDef, ColumnType, Sheet, SheetKey, Sheets } from "@/lib/chart-types";
import { tabBtn } from "./controls";
import type { DataStepProps } from "./types";

function editSheet(sheets: Sheets, key: SheetKey, edit: (sheet: Sheet) => Sheet): Sheets {
  return { ...sheets, [key]: edit(structuredClone(sheets[key])) };
}

export function DataStep({ chart, update, activeSheet, setActiveSheet }: DataStepProps) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteNote, setPasteNote] = useState("");

  const sheet = chart.sheets[activeSheet];
  const def = chartDef(chart.chartType);
  const feedingKey: SheetKey = def.shape === "matrix" ? "segments" : "flows";

  const mutate = (edit: (s: Sheet) => Sheet) => update({ sheets: editSheet(chart.sheets, activeSheet, edit) });

  const applyPaste = () => {
    const lines = pasteText
      .trim()
      .split(/\n/)
      .filter(Boolean)
      .map((l) => l.split("\t"));
    if (lines.length < 2) {
      setPasteNote("Need a header row and at least one data row.");
      return;
    }
    mutate((s) => ({
      ...s,
      cols: lines[0],
      types: lines[0].map((_, i) => (isFinite(parseFloat(lines[1][i])) ? "number" : "text")) as ColumnType[],
      rows: lines.slice(1),
    }));
    setPasteOpen(false);
    setPasteText("");
    setPasteNote("");
  };

  return (
    <div style={{ padding: "24px 28px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 26, margin: 0 }}>Your data</h2>
          <p style={{ fontSize: 13, color: "#605d5d", margin: "4px 0 0", maxWidth: "56ch" }}>
            Type in the grid, or paste a block straight from Excel. Every keystroke redraws the chart.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setPasteOpen(!pasteOpen);
            setPasteNote("");
          }}
        >
          Paste from Excel
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, margin: "20px 0 0", borderBottom: "2px solid var(--color-divider)" }}>
        {(Object.keys(chart.sheets) as SheetKey[]).map((key) => (
          <button key={key} onClick={() => setActiveSheet(key)} style={tabBtn(key === activeSheet)}>
            {chart.sheets[key].name}
            <span style={{ fontWeight: 400, color: "#7d7979", fontSize: 11, marginLeft: 8 }}>
              {chart.sheets[key].rows.length}×{chart.sheets[key].cols.length}
            </span>
          </button>
        ))}
      </div>

      {pasteOpen && (
        <div style={{ border: "2px solid #ec3013", padding: 16, marginTop: 16, background: "#fff2ef" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 13, marginBottom: 8 }}>
            Paste tab-separated cells
          </div>
          <textarea
            className="input"
            rows={4}
            placeholder={"Source\tTarget\tValue"}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            style={{ width: "100%", fontFamily: "ui-monospace,monospace", fontSize: 12 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" onClick={applyPaste}>
              Replace sheet
            </button>
            <button className="btn btn-secondary" onClick={() => setPasteOpen(false)}>
              Cancel
            </button>
            <span style={{ fontSize: 12, color: "#7c1405", alignSelf: "center" }}>{pasteNote}</span>
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto", marginTop: 18, border: "1px solid var(--color-divider)" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520, fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 34, background: "#201e1d" }} />
              {sheet.cols.map((col, i) => (
                <th
                  key={i}
                  style={{
                    background: "#201e1d",
                    color: "#f3f2f2",
                    padding: 0,
                    textAlign: "left",
                    borderLeft: "1px solid #444141",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px" }}>
                    <input
                      value={col}
                      onChange={(e) =>
                        mutate((s) => {
                          s.cols[i] = e.target.value;
                          return s;
                        })
                      }
                      style={{
                        background: "transparent",
                        border: 0,
                        color: "#f3f2f2",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: "0.04em",
                        width: "100%",
                        minWidth: 60,
                        padding: 0,
                      }}
                    />
                    <select
                      value={sheet.types[i] ?? "text"}
                      onChange={(e) =>
                        mutate((s) => {
                          s.types[i] = e.target.value as ColumnType;
                          return s;
                        })
                      }
                      style={{
                        background: "transparent",
                        border: "1px solid #605d5d",
                        color: "#bab6b6",
                        fontSize: 10,
                        padding: "1px 2px",
                        textTransform: "uppercase",
                      }}
                    >
                      <option value="text">Text</option>
                      <option value="number">Num</option>
                      <option value="geo">Geo</option>
                    </select>
                  </div>
                </th>
              ))}
              <th style={{ background: "#201e1d", width: 38, padding: 0, borderLeft: "1px solid #444141" }}>
                <button
                  title="Add column"
                  onClick={() =>
                    mutate((s) => {
                      s.cols.push("Column " + (s.cols.length + 1));
                      s.types.push("number");
                      s.rows.forEach((r) => r.push(""));
                      return s;
                    })
                  }
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: 0,
                    color: "#f3f2f2",
                    fontSize: 16,
                    cursor: "pointer",
                    padding: "8px 0",
                  }}
                >
                  ＋
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, ri) => (
              <tr key={ri}>
                <td
                  style={{
                    background: "var(--color-surface)",
                    color: "#7d7979",
                    fontSize: 11,
                    textAlign: "center",
                    borderBottom: "1px solid var(--color-divider)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {ri + 1}
                </td>
                {sheet.cols.map((_, ci) => {
                  const numeric = (sheet.types[ci] ?? "text") === "number";
                  return (
                    <td
                      key={ci}
                      style={{
                        padding: 0,
                        borderLeft: "1px solid var(--color-divider)",
                        borderBottom: "1px solid var(--color-divider)",
                      }}
                    >
                      <input
                        className="gx-cell"
                        value={row[ci] ?? ""}
                        onChange={(e) =>
                          mutate((s) => {
                            s.rows[ri][ci] = e.target.value;
                            return s;
                          })
                        }
                        style={{
                          width: "100%",
                          border: 0,
                          background: "transparent",
                          padding: "7px 10px",
                          fontSize: 13,
                          fontFamily: numeric ? "ui-monospace,monospace" : "var(--font-body)",
                          textAlign: numeric ? "right" : "left",
                          fontVariantNumeric: "tabular-nums",
                          color: "#201e1d",
                        }}
                      />
                    </td>
                  );
                })}
                <td
                  style={{
                    padding: 0,
                    borderLeft: "1px solid var(--color-divider)",
                    borderBottom: "1px solid var(--color-divider)",
                    textAlign: "center",
                  }}
                >
                  <button
                    className="row-del"
                    title="Delete row"
                    onClick={() =>
                      mutate((s) => {
                        s.rows.splice(ri, 1);
                        return s;
                      })
                    }
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "#9b9797",
                      cursor: "pointer",
                      padding: "6px 8px",
                      fontSize: 13,
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button
          className="btn btn-secondary"
          onClick={() =>
            mutate((s) => {
              s.rows.push(s.cols.map(() => ""));
              return s;
            })
          }
        >
          ＋ Row
        </button>
        <span style={{ fontSize: 12, color: "#7d7979", alignSelf: "center" }}>
          {sheet.rows.length} rows · {sheet.cols.length} columns ·{" "}
          {feedingKey === activeSheet ? "feeding the chart" : `not used by ${def.name}`}
        </span>
      </div>
    </div>
  );
}
