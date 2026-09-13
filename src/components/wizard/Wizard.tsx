"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { EngineChart } from "@/components/EngineChart";
import {
  buildScene,
  flowLinks,
  groundColors,
  matrixData,
  obsGroups,
  geoPoints,
  geoArcs,
  geoRegionRows,
} from "@/lib/chart-builder";
import { chartDef, SheetKey, STEPS } from "@/lib/chart-types";
import type { ClientChart } from "@/lib/charts";
import { toSnapshot } from "@/lib/charts";
import { DataStep } from "./DataStep";
import { ChartStep } from "./ChartStep";
import { MapStep } from "./MapStep";
import { StyleStep } from "./StyleStep";
import { PublishStep } from "./PublishStep";
import { segBtn } from "./controls";

const NEXT_LABELS = ["Add your data →", "Map the columns →", "Style it →", "Publish →", "Copy link & finish"];

export function Wizard({
  chart: initial,
  initials,
  viewerUrl,
}: {
  chart: ClientChart;
  initials: string;
  viewerUrl: string;
}) {
  const router = useRouter();
  const [chart, setChart] = useState(initial);
  const [step, setStep] = useState(0);
  const [activeSheet, setActiveSheet] = useState<SheetKey>(
    chartDef(initial.chartType).shape === "matrix" ? "segments" : "flows"
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishing, setPublishing] = useState(false);

  const update = useCallback((patch: Partial<ClientChart>) => setChart((c) => ({ ...c, ...patch })), []);

  // Everything the server persists — version and updatedAt are excluded so
  // writing the server's response back doesn't retrigger a save.
  const payload = useMemo(
    () =>
      JSON.stringify({
        chartType: chart.chartType,
        shell: chart.shell,
        sheets: chart.sheets,
        mapping: chart.mapping,
        style: chart.style,
        access: chart.access,
        embed: chart.embed,
      }),
    [chart]
  );

  const savedPayload = useRef(payload);

  const refetchFromServer = useCallback(async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/charts/${chart.id}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { chart: ClientChart };
      savedPayload.current = JSON.stringify({
        chartType: data.chart.chartType,
        shell: data.chart.shell,
        sheets: data.chart.sheets,
        mapping: data.chart.mapping,
        style: data.chart.style,
        access: data.chart.access,
        embed: data.chart.embed,
      });
      setChart(data.chart);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [chart.id]);

  useEffect(() => {
    if (payload === savedPayload.current) return;
    setSaveState("saving");
    let cancelled = false;
    // A transient failure (a blip in connectivity, a cold serverless
    // function) shouldn't strand the user on "could not save" until their
    // next keystroke happens to retry it — back off and retry a few times
    // before actually giving up.
    const attemptSave = async (attempt: number): Promise<void> => {
      try {
        const res = await fetch(`/api/charts/${chart.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { chart: ClientChart };
        if (cancelled) return;
        savedPayload.current = payload;
        setChart((c) => ({ ...c, version: data.chart.version, updatedAt: data.chart.updatedAt }));
        setSaveState("saved");
      } catch {
        if (cancelled) return;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          if (!cancelled) await attemptSave(attempt + 1);
        } else {
          setSaveState("error");
        }
      }
    };
    const timer = setTimeout(() => attemptSave(0), 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [payload, chart.id]);

  const publish = async () => {
    setPublishing(true);
    try {
      await fetch(`/api/charts/${chart.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      savedPayload.current = payload;
      const res = await fetch(`/api/charts/${chart.id}/publish`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { chart: ClientChart };
      setChart((c) => ({ ...c, version: data.chart.version, updatedAt: data.chart.updatedAt }));
      setSaveState("saved");
      router.refresh();
    } catch {
      setSaveState("error");
    } finally {
      setPublishing(false);
    }
  };

  const def = chartDef(chart.chartType);
  const snapshot = useMemo(() => toSnapshot(chart), [chart]);
  const scene = useMemo(() => buildScene(snapshot), [snapshot]);
  const ground = groundColors(chart.style.ground);
  const isSplit = chart.shell === "split";

  const rowNote =
    def.shape === "matrix"
      ? `${matrixData(chart.sheets, chart.mapping).rows.length} series`
      : def.shape === "obs"
        ? `${obsGroups(chart.sheets, chart.mapping).length} groups`
        : def.shape === "geopoint"
          ? `${geoPoints(chart.sheets, chart.mapping).length} places`
          : def.shape === "geoarc"
            ? `${geoArcs(chart.sheets, chart.mapping).length} routes`
            : def.shape === "georegion"
              ? `${geoRegionRows(chart.sheets, chart.mapping).length} regions`
              : `${flowLinks(chart.sheets, chart.mapping).length} links`;

  const syncNote =
    saveState === "saving"
      ? "saving…"
      : saveState === "error"
        ? "could not save"
        : scene.locked
          ? "waiting on data"
          : "synced with sheet";

  const stepMeta = [
    "Step 1 of 5 · 12 types, 2 need extra columns",
    "Step 2 of 5 · autosaved to your workspace",
    "Step 3 of 5 · encodings validate as you pick",
    "Step 4 of 5 · applies to preview and viewer",
    `Step 5 of 5 · publishing writes version v${chart.version + 1}`,
  ][step];

  const onNext = async () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (chart.version > 0) {
      try {
        await navigator.clipboard.writeText(viewerUrl);
      } catch {
        // clipboard permission denied — the link is still on screen to copy by hand
      }
    }
    router.push("/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      <TopBar
        title={chart.style.title}
        initials={initials}
        shellToggle={
          <div style={{ display: "flex", gap: 2, border: "1px solid var(--color-divider)" }}>
            <button onClick={() => update({ shell: "split" })} style={segBtn(isSplit)}>
              Split
            </button>
            <button onClick={() => update({ shell: "canvas" })} style={segBtn(!isSplit)}>
              Canvas
            </button>
          </div>
        }
      />

      <div style={isSplit ? { display: "block" } : { display: "flex", flexWrap: "wrap", alignItems: "stretch", minHeight: "calc(100vh - 60px)" }}>
        <div
          style={
            isSplit
              ? {
                  display: "flex",
                  flexWrap: "wrap",
                  borderBottom: "2px solid var(--color-divider)",
                  background: "var(--color-bg)",
                  position: "sticky",
                  top: 60,
                  zIndex: 15,
                }
              : {
                  flex: "0 0 210px",
                  display: "flex",
                  flexDirection: "column",
                  borderRight: "2px solid var(--color-divider)",
                  alignContent: "flex-start",
                  minWidth: 180,
                }
          }
        >
          {STEPS.map((s, i) => {
            const on = i === step;
            const done = i < step;
            return (
              <button
                key={s.label}
                onClick={() => setStep(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: isSplit ? "10px 18px" : "12px 16px",
                  background: on ? "var(--color-surface)" : "transparent",
                  border: 0,
                  ...(isSplit
                    ? { borderRight: "1px solid var(--color-divider)" }
                    : { borderBottom: "1px solid var(--color-divider)", width: "100%" }),
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: on ? (isSplit ? "inset 0 -3px 0 #ec3013" : "inset 3px 0 0 #ec3013") : "none",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 11,
                    background: on ? "#ec3013" : done ? "#201e1d" : "transparent",
                    color: on || done ? "#f3f2f2" : "#7d7979",
                    border: `1px solid ${on ? "#ec3013" : done ? "#201e1d" : "var(--color-divider)"}`,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 800,
                      fontSize: 13,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#7d7979",
                      fontWeight: 400,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "22ch",
                    }}
                  >
                    {s.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={
            isSplit
              ? { display: "flex", flexWrap: "wrap", alignItems: "stretch", minHeight: "calc(100vh - 122px)" }
              : { flex: "1 1 520px", display: "flex", flexWrap: "wrap-reverse", alignItems: "stretch", minWidth: 0 }
          }
        >
          <div
            style={
              isSplit
                ? {
                    flex: "1 1 460px",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "2px solid var(--color-divider)",
                  }
                : {
                    flex: "1 1 380px",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    borderRight: "2px solid var(--color-divider)",
                    maxWidth: 640,
                  }
            }
          >
            {step === 0 && <ChartStep chart={chart} update={update} setActiveSheet={setActiveSheet} />}
            {step === 1 && (
              <DataStep chart={chart} update={update} activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
            )}
            {step === 2 && <MapStep chart={chart} update={update} />}
            {step === 3 && <StyleStep chart={chart} update={update} />}
            {step === 4 && (
              <PublishStep
                chart={chart}
                update={update}
                scene={scene}
                viewerUrl={viewerUrl}
                onPublish={publish}
                publishing={publishing}
              />
            )}

            <div
              style={{
                position: "sticky",
                bottom: 0,
                background: "var(--color-bg)",
                borderTop: "2px solid var(--color-divider)",
                padding: "12px 28px",
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button className="btn btn-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={onNext}>
                {NEXT_LABELS[step]}
              </button>
              <span style={{ fontSize: 12, color: "#7d7979", marginLeft: "auto" }}>{stepMeta}</span>
            </div>
          </div>

          <div
            style={
              isSplit
                ? {
                    flex: "1 1 420px",
                    minWidth: 0,
                    background: "var(--color-surface)",
                    display: "flex",
                    flexDirection: "column",
                    position: "sticky",
                    top: 122,
                    alignSelf: "flex-start",
                    maxHeight: "calc(100vh - 122px)",
                  }
                : {
                    flex: "2 1 480px",
                    minWidth: 0,
                    background: "var(--color-surface)",
                    display: "flex",
                    flexDirection: "column",
                  }
            }
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "12px 20px",
                borderBottom: "1px solid var(--color-divider)",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Live preview
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: saveState === "error" ? "#ec3013" : "#7d7979",
                    display: "block",
                  }}
                />
                <span style={{ fontSize: 11, color: "#7d7979" }}>{syncNote}</span>
                <button
                  type="button"
                  title="Reload this chart's data from your workspace"
                  onClick={refetchFromServer}
                  disabled={saveState === "saving"}
                  style={{
                    background: "none",
                    border: 0,
                    padding: 2,
                    lineHeight: 0,
                    cursor: saveState === "saving" ? "default" : "pointer",
                    color: "#7d7979",
                    opacity: saveState === "saving" ? 0.5 : 1,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M13.5 8a5.5 5.5 0 1 1-1.7-3.97" strokeLinecap="round" />
                    <path d="M13.5 2.5v3.5H10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            {(def.shape === "geopoint" || def.shape === "geoarc" || def.shape === "georegion") && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  padding: "8px 20px",
                  borderBottom: "1px solid var(--color-divider)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 11, color: "#7d7979", marginRight: 4 }}>Map</span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  title="Zoom in"
                  onClick={() => update({ style: { ...chart.style, geoZoom: Math.max(0.2, (chart.style.geoZoom || 1) * 0.7) } })}
                >
                  + Zoom in
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  title="Zoom out"
                  onClick={() => update({ style: { ...chart.style, geoZoom: Math.min(8, (chart.style.geoZoom || 1) * 1.4) } })}
                >
                  − Zoom out
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  title="Fit to data"
                  onClick={() => update({ style: { ...chart.style, geoZoom: 1 } })}
                >
                  Fit to data
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  title="Show the whole world"
                  onClick={() => update({ style: { ...chart.style, geoZoom: 0 } })}
                >
                  World view
                </button>
              </div>
            )}
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: isSplit ? 20 : 32,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                background: ground.groundBg,
              }}
            >
              <div style={{ width: "100%", maxWidth: 820 }}>
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 800,
                    fontSize: 19,
                    lineHeight: 1.15,
                    color: ground.ink,
                  }}
                >
                  {chart.style.title}
                </div>
                <div style={{ fontSize: 12, color: ground.muted, marginTop: 3 }}>{chart.style.subtitle}</div>
                <hr
                  style={{
                    height: 2,
                    border: 0,
                    margin: "12px 0",
                    background: ground.dark ? "#605d5d" : "var(--color-divider)",
                  }}
                />
                {scene.locked ? (
                  <div
                    style={{
                      border: "2px dashed var(--color-divider)",
                      padding: "40px 28px",
                      background: "var(--color-surface)",
                    }}
                  >
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>
                      {def.shape === "geopoint" || def.shape === "geoarc" || def.shape === "georegion"
                        ? "No geography in this sheet"
                        : "No observation-level rows"}
                    </div>
                    <div style={{ fontSize: 13, color: "#605d5d", maxWidth: "48ch", marginBottom: 16 }}>
                      {def.shape === "geopoint" || def.shape === "geoarc"
                        ? `A ${def.name.toLowerCase()} needs latitude and longitude columns plus a numeric value. Check the Map step.`
                        : def.shape === "georegion"
                          ? "A choropleth needs a place name and a numeric value, with names that match a country or US state. Check the Map step."
                          : "A violin plot draws a distribution, so it needs one row per observation rather than the aggregated totals in this sheet."}
                    </div>
                    <button className="btn btn-primary" onClick={() => setStep(1)}>
                      Add the columns
                    </button>
                  </div>
                ) : (
                  <EngineChart snapshot={snapshot} />
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    flexWrap: "wrap",
                    marginTop: 14,
                    fontSize: 11,
                    color: ground.muted,
                  }}
                >
                  <span>{def.name}</span>
                  <span>{rowNote}</span>
                  <span style={{ marginLeft: "auto" }}>graphos.app</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
