import type { Access, Chart } from "@prisma/client";
import {
  CHART_GROUPS,
  ChartSnapshot,
  ChartStyle,
  ColumnType,
  ENGINE_SUPPORT,
  Engine,
  DEFAULT_MAPPING,
  DEFAULT_SHEETS,
  DEFAULT_STYLE,
  Ground,
  Mapping,
  PALETTES,
  PaletteId,
  Sheet,
  Sheets,
} from "./chart-types";

/** A chart as the client components consume it: JSON-safe, no Date objects. */
export interface ClientChart {
  id: string;
  name: string;
  chartType: string;
  engine: Engine;
  shell: string;
  sheets: Sheets;
  mapping: Mapping;
  style: ChartStyle;
  access: Access;
  embed: string;
  version: number;
  updatedAt: string;
}

const CHART_IDS = new Set(CHART_GROUPS.flatMap((g) => g.items.map((i) => i.id)));
const COLUMN_TYPES: ColumnType[] = ["text", "number", "geo"];
const HEX = /^#[0-9a-fA-F]{3,8}$/;

const MAX_ROWS = 5000;
const MAX_COLS = 60;
const MAX_CELL = 512;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.slice(0, MAX_CELL) : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isFinite(n) ? n : fallback;
}

function normalizeSheet(raw: unknown, fallback: Sheet): Sheet {
  const r = (raw ?? {}) as Partial<Sheet>;
  const cols = Array.isArray(r.cols) ? r.cols.slice(0, MAX_COLS).map((c) => str(c, "Column")) : fallback.cols;
  const types = cols.map((_, i) => {
    const t = Array.isArray(r.types) ? r.types[i] : undefined;
    return COLUMN_TYPES.includes(t as ColumnType) ? (t as ColumnType) : "text";
  });
  const rows = Array.isArray(r.rows)
    ? r.rows.slice(0, MAX_ROWS).map((row) => cols.map((_, i) => str(Array.isArray(row) ? row[i] : "")))
    : fallback.rows;
  return { name: str(r.name, fallback.name) || fallback.name, cols, types, rows };
}

export function normalizeSheets(raw: unknown): Sheets {
  const r = (raw ?? {}) as Partial<Sheets>;
  return {
    flows: normalizeSheet(r.flows, DEFAULT_SHEETS.flows),
    segments: normalizeSheet(r.segments, DEFAULT_SHEETS.segments),
  };
}

export function normalizeMapping(raw: unknown, sheets: Sheets): Mapping {
  const r = (raw ?? {}) as Partial<Mapping>;
  const clamp = (v: unknown, fallback: number, max: number) => {
    const n = Math.floor(num(v, fallback));
    return n >= 0 && n < max ? n : Math.min(fallback, Math.max(0, max - 1));
  };
  const fc = Math.max(1, sheets.flows.cols.length);
  const mc = Math.max(1, sheets.segments.cols.length);
  const flowRaw = (r.flow ?? DEFAULT_MAPPING.flow) as Mapping["flow"];
  const matrixRaw = (r.matrix ?? DEFAULT_MAPPING.matrix) as Mapping["matrix"];
  const obsRaw = (r.obs ?? DEFAULT_MAPPING.obs) as Mapping["obs"];
  const geoPointRaw = (r.geoPoint ?? DEFAULT_MAPPING.geoPoint) as Mapping["geoPoint"];
  const geoArcRaw = (r.geoArc ?? DEFAULT_MAPPING.geoArc) as Mapping["geoArc"];
  const measures = Array.isArray(matrixRaw.measures)
    ? Array.from(new Set(matrixRaw.measures.map((m) => Math.floor(num(m, -1))))).filter((m) => m >= 0 && m < mc)
    : DEFAULT_MAPPING.matrix.measures.filter((m) => m < mc);
  return {
    flow: {
      s: clamp(flowRaw.s, 0, fc),
      t: clamp(flowRaw.t, 1, fc),
      v: clamp(flowRaw.v, 2, fc),
    },
    matrix: { label: clamp(matrixRaw.label, 0, mc), measures: measures.sort((a, b) => a - b) },
    obs: {
      group: clamp(obsRaw.group, 0, fc),
      value: clamp(obsRaw.value, 1, fc),
    },
    geoPoint: {
      place: clamp(geoPointRaw.place, 0, fc),
      lat: clamp(geoPointRaw.lat, 1, fc),
      lon: clamp(geoPointRaw.lon, 2, fc),
      value: clamp(geoPointRaw.value, 3, fc),
    },
    geoArc: {
      originPlace: clamp(geoArcRaw.originPlace, 0, fc),
      originLat: clamp(geoArcRaw.originLat, 1, fc),
      originLon: clamp(geoArcRaw.originLon, 2, fc),
      destPlace: clamp(geoArcRaw.destPlace, 3, fc),
      destLat: clamp(geoArcRaw.destLat, 4, fc),
      destLon: clamp(geoArcRaw.destLon, 5, fc),
      value: clamp(geoArcRaw.value, 6, fc),
    },
  };
}

export function normalizeStyle(raw: unknown): ChartStyle {
  const r = (raw ?? {}) as Partial<ChartStyle>;
  const palette: PaletteId = (Object.keys(PALETTES) as PaletteId[]).includes(r.palette as PaletteId)
    ? (r.palette as PaletteId)
    : DEFAULT_STYLE.palette;
  const customColors = Array.isArray(r.customColors)
    ? r.customColors.filter((c): c is string => typeof c === "string" && HEX.test(c)).slice(0, 24)
    : DEFAULT_STYLE.customColors;
  const ground: Ground = r.ground === "dark" ? "dark" : "light";
  return {
    title: str(r.title, DEFAULT_STYLE.title),
    subtitle: str(r.subtitle, DEFAULT_STYLE.subtitle),
    palette,
    customColors: customColors.length ? customColors : DEFAULT_STYLE.customColors,
    fillAlpha: Math.min(1, Math.max(0.15, num(r.fillAlpha, 1))),
    ground,
    labels: r.labels !== false,
    values: r.values !== false,
    sortDesc: r.sortDesc !== false,
  };
}

export function normalizeChartType(raw: unknown): string {
  return typeof raw === "string" && CHART_IDS.has(raw) ? raw : "sankey";
}

export function normalizeEngine(raw: unknown): Engine {
  return typeof raw === "string" && raw in ENGINE_SUPPORT ? (raw as Engine) : "builtin";
}

export function toClientChart(chart: Chart): ClientChart {
  const sheets = normalizeSheets(chart.sheets);
  return {
    id: chart.id,
    name: chart.name,
    chartType: normalizeChartType(chart.chartType),
    engine: normalizeEngine(chart.engine),
    shell: chart.shell === "canvas" ? "canvas" : "split",
    sheets,
    mapping: normalizeMapping(chart.mapping, sheets),
    style: normalizeStyle(chart.style),
    access: chart.access,
    embed: chart.embed,
    version: chart.version,
    updatedAt: chart.updatedAt.toISOString(),
  };
}

export function toSnapshot(chart: ClientChart): ChartSnapshot {
  return {
    name: chart.name,
    chartType: chart.chartType,
    engine: chart.engine,
    sheets: chart.sheets,
    mapping: chart.mapping,
    style: chart.style,
  };
}

/** A stored ChartVersion.snapshot, re-validated before it is rendered. */
export function snapshotFromJson(raw: unknown): ChartSnapshot {
  const r = (raw ?? {}) as Partial<ChartSnapshot>;
  const sheets = normalizeSheets(r.sheets);
  return {
    name: str(r.name, "Untitled chart"),
    chartType: normalizeChartType(r.chartType),
    engine: normalizeEngine(r.engine),
    sheets,
    mapping: normalizeMapping(r.mapping, sheets),
    style: normalizeStyle(r.style),
  };
}

export const ACCESS_LABELS: Record<Access, string> = {
  LINK: "Anyone with link",
  WORKSPACE: "My workspace",
  PRIVATE: "Only me",
};

export function parseAccess(raw: unknown): Access | null {
  if (raw === "LINK" || raw === "WORKSPACE" || raw === "PRIVATE") return raw;
  const byLabel = (Object.entries(ACCESS_LABELS) as [Access, string][]).find(([, label]) => label === raw);
  return byLabel ? byLabel[0] : null;
}

/**
 * Who may open a published viewer URL. WORKSPACE means any signed-in member of
 * the same email domain as the owner — the closest thing to a workspace until
 * teams exist.
 */
export function canView(
  access: Access,
  ownerEmail: string | null,
  ownerId: string,
  viewerId: string | null,
  viewerEmail: string | null
): boolean {
  if (viewerId && viewerId === ownerId) return true;
  if (access === "LINK") return true;
  if (access === "PRIVATE") return false;
  if (!viewerEmail || !ownerEmail) return false;
  const domain = (e: string) => e.split("@")[1]?.toLowerCase() ?? "";
  return domain(viewerEmail) !== "" && domain(viewerEmail) === domain(ownerEmail);
}
