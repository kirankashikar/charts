"use client";

import { chartDef, engineDraws, ENGINES, Ground, PALETTES, PaletteId } from "@/lib/chart-types";
import { segBtn } from "./controls";
import type { StepProps } from "./types";

export function StyleStep({ chart, update }: StepProps) {
  const style = chart.style;
  const setStyle = (patch: Partial<typeof style>) => update({ style: { ...style, ...patch } });
  const fallsBack = chart.engine !== "builtin" && !engineDraws(chart.engine, chart.chartType);

  return (
    <div style={{ padding: "24px 28px 40px" }}>
      <h2 style={{ fontSize: 26, margin: 0 }}>Style</h2>
      <p style={{ fontSize: 13, color: "#605d5d", margin: "4px 0 20px", maxWidth: "60ch" }}>
        Boardroom defaults: flat fills, flush-left labels, no gradients. Changes apply to the live preview and the
        published viewer.
      </p>

      <div className="field" style={{ marginBottom: 18 }}>
        <label>Chart title</label>
        <input
          className="input"
          value={style.title}
          onChange={(e) => setStyle({ title: e.target.value })}
          style={{ width: "100%", maxWidth: 460 }}
        />
      </div>
      <div className="field" style={{ marginBottom: 18 }}>
        <label>Subtitle / source line</label>
        <input
          className="input"
          value={style.subtitle}
          onChange={(e) => setStyle({ subtitle: e.target.value })}
          style={{ width: "100%", maxWidth: 460 }}
        />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Theme</div>
        <div style={{ display: "flex", gap: 2, border: "1px solid var(--color-divider)", width: "fit-content" }}>
          {(
            [
              ["light", "Light ground"],
              ["dark", "Dark ground"],
            ] as [Ground, string][]
          ).map(([key, label]) => (
            <button key={key} onClick={() => setStyle({ ground: key })} style={segBtn(style.ground === key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Render engine</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {ENGINES.map((option) => {
            const on = option.id === chart.engine;
            const draws = engineDraws(option.id, chart.chartType);
            return (
              <button
                key={option.id}
                onClick={() => update({ engine: option.id })}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 1,
                  background: "transparent",
                  border: on ? "2px solid #ec3013" : "1px solid var(--color-divider)",
                  padding: "8px 12px",
                  cursor: "pointer",
                  opacity: draws ? 1 : 0.55,
                }}
              >
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 12 }}>{option.name}</span>
                <span style={{ fontSize: 10, color: "#7d7979" }}>
                  {draws ? option.note : `No ${chartDef(chart.chartType).name.toLowerCase()}`}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "#7d7979", marginTop: 8, maxWidth: "56ch" }}>
          {fallsBack
            ? `${ENGINES.find((e) => e.id === chart.engine)?.name} has no ${chartDef(
                chart.chartType
              ).name.toLowerCase()} layout, so this chart draws with the built-in renderer. Published stills always use it too.`
            : "The engine draws the live preview and the published viewer. Library engines add their own tooltips and hover behaviour; the built-in renderer is what the slide still is exported from."}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Palette</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(Object.keys(PALETTES) as PaletteId[]).map((key) => {
            const swatches = (key === "custom" ? style.customColors : PALETTES[key].colors).slice(0, 6);
            return (
              <button
                key={key}
                onClick={() => setStyle({ palette: key })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "transparent",
                  border: key === style.palette ? "2px solid #ec3013" : "1px solid var(--color-divider)",
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", gap: 0 }}>
                  {swatches.map((c, i) => (
                    <span key={i} style={{ width: 16, height: 16, display: "block", background: c }} />
                  ))}
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 12 }}>
                    {PALETTES[key].name}
                  </span>
                  <span style={{ fontSize: 10, color: "#7d7979" }}>{PALETTES[key].note}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {style.palette === "custom" && (
        <div style={{ border: "2px solid var(--color-divider)", padding: 14, marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Your swatches
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {style.customColors.map((color, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const next = style.customColors.slice();
                    next[i] = e.target.value;
                    setStyle({ customColors: next });
                  }}
                  style={{
                    width: 44,
                    height: 36,
                    padding: 0,
                    border: "1px solid var(--color-divider)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                />
                <button
                  onClick={() => {
                    if (style.customColors.length > 1) {
                      setStyle({ customColors: style.customColors.filter((_, j) => j !== i) });
                    }
                  }}
                  style={{ background: "transparent", border: 0, color: "#9b9797", fontSize: 11, cursor: "pointer", padding: 0 }}
                >
                  remove
                </button>
              </div>
            ))}
            <button
              className="btn btn-secondary"
              onClick={() => setStyle({ customColors: [...style.customColors, "#605d5d"] })}
              style={{ alignSelf: "flex-start" }}
            >
              ＋ Swatch
            </button>
          </div>
          <div style={{ fontSize: 11.5, color: "#7d7979", marginTop: 10, maxWidth: "52ch" }}>
            Series are assigned in order and wrap when there are more categories than swatches.
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18, maxWidth: 340 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
          <span>Fill transparency</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: "#7d7979" }}>
            {Math.round(style.fillAlpha * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.05}
          value={style.fillAlpha}
          onChange={(e) => setStyle({ fillAlpha: Number(e.target.value) })}
          style={{ width: "100%", accentColor: "#ec3013" }}
        />
        <div style={{ fontSize: 11.5, color: "#7d7979", marginTop: 4 }}>
          Lower values let overlapping ribbons, arcs and polygons read through each other.
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {(
          [
            ["labels", "Show labels"],
            ["values", "Show values"],
            ["sortDesc", "Sort by size"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={style[key]}
              onChange={() => setStyle({ [key]: !style[key] })}
              style={{ accentColor: "#ec3013", width: 16, height: 16 }}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
