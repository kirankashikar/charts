export type ColumnType = "text" | "number" | "geo";

export interface Sheet {
  name: string;
  cols: string[];
  types: ColumnType[];
  rows: string[][];
}

export type SheetKey = "flows" | "segments";

export type Sheets = Record<SheetKey, Sheet>;

export interface FlowMapping {
  s: number;
  t: number;
  v: number;
}

export interface MatrixMapping {
  label: number;
  measures: number[];
}

export interface Mapping {
  flow: FlowMapping;
  matrix: MatrixMapping;
}

export type PaletteId = "accent" | "ink" | "duo" | "wash" | "deep" | "custom";
export type Ground = "light" | "dark";

export interface ChartStyle {
  title: string;
  subtitle: string;
  palette: PaletteId;
  customColors: string[];
  fillAlpha: number;
  ground: Ground;
  labels: boolean;
  values: boolean;
  sortDesc: boolean;
}

/** What a chart type needs from the data: two node columns and a weight
 *  (flow), a label plus numeric measures (matrix), raw observations (obs),
 *  or coordinates (geo). `obs` and `geo` have no renderer yet. */
export type ChartShape = "flow" | "matrix" | "obs" | "geo";

export interface ChartDef {
  id: string;
  name: string;
  shape: ChartShape;
  note: string;
}

export interface ChartGroup {
  g: string;
  items: ChartDef[];
}

/** Which library draws the chart. `builtin` is the hand-rolled SVG renderer;
 *  the others are loaded on demand and fall back to it for types they can't
 *  draw. */
export type Engine = "builtin" | "echarts" | "plotly" | "d3";

export const ENGINES: { id: Engine; name: string; note: string }[] = [
  { id: "builtin", name: "Graphos", note: "Every type · fastest" },
  { id: "echarts", name: "ECharts", note: "Animated · tooltips" },
  { id: "plotly", name: "Plotly", note: "Hover · zoom · export" },
  { id: "d3", name: "D3", note: "Classic layouts" },
];

/** Chart types each engine draws itself. Anything absent falls back to the
 *  built-in renderer rather than showing an empty frame. */
export const ENGINE_SUPPORT: Record<Engine, string[]> = {
  builtin: ["sankey", "sunburst", "treemap", "pack", "chord", "network", "parallel", "marimekko", "radar"],
  echarts: ["sankey", "sunburst", "treemap", "network", "chord", "parallel", "radar"],
  plotly: ["sankey", "sunburst", "treemap", "parallel", "radar"],
  d3: ["sankey", "sunburst", "treemap", "pack", "chord", "network"],
};

export function engineDraws(engine: Engine, chartType: string): boolean {
  return ENGINE_SUPPORT[engine]?.includes(chartType) ?? false;
}

/** Everything needed to draw a chart, with no database or session involved —
 *  this is what a published version stores and what the viewer renders. */
export interface ChartSnapshot {
  name: string;
  chartType: string;
  engine: Engine;
  sheets: Sheets;
  mapping: Mapping;
  style: ChartStyle;
}

export const CHART_GROUPS: ChartGroup[] = [
  {
    g: "Flow & hierarchy",
    items: [
      { id: "sankey", name: "Sankey", shape: "flow", note: "Volume moving between stages" },
      { id: "sunburst", name: "Sunburst", shape: "flow", note: "Nested shares, radially" },
      { id: "treemap", name: "Treemap", shape: "flow", note: "Part-to-whole by area" },
      { id: "pack", name: "Circle packing", shape: "flow", note: "Grouped magnitudes" },
    ],
  },
  {
    g: "Relationship",
    items: [
      { id: "chord", name: "Chord", shape: "flow", note: "Two-way exchange between nodes" },
      { id: "network", name: "Network", shape: "flow", note: "Who connects to whom" },
      { id: "parallel", name: "Parallel coordinates", shape: "matrix", note: "Many measures, one line each" },
      { id: "violin", name: "Violin", shape: "obs", note: "Distribution shape per group" },
    ],
  },
  {
    g: "Composition",
    items: [{ id: "marimekko", name: "Marimekko", shape: "matrix", note: "Share within share, weighted" }],
  },
  {
    g: "Comparison",
    items: [{ id: "radar", name: "Radar / spider", shape: "matrix", note: "Profile across 3+ measures" }],
  },
  {
    g: "Geospatial",
    items: [
      { id: "symbolmap", name: "Proportional symbol map", shape: "geo", note: "Magnitude by place" },
      { id: "connmap", name: "Connection map", shape: "geo", note: "Origin → destination arcs" },
    ],
  },
];

export const PALETTES: Record<PaletteId, { name: string; note: string; colors: string[] }> = {
  accent: {
    name: "Signal",
    note: "Accent ramp",
    colors: ["#ec3013", "#ff563c", "#ff9783", "#ae1800", "#ffc4b8", "#7c1405", "#dd2b0f", "#4d170e"],
  },
  ink: {
    name: "Ink",
    note: "Neutral ramp",
    colors: ["#201e1d", "#444141", "#605d5d", "#7d7979", "#9b9797", "#bab6b6", "#2d2b2b", "#d7d3d3"],
  },
  duo: {
    name: "Duotone",
    note: "Accent + ink",
    colors: ["#ec3013", "#201e1d", "#ff9783", "#605d5d", "#ae1800", "#9b9797", "#ff563c", "#444141"],
  },
  wash: {
    name: "Wash",
    note: "Light tints",
    colors: ["#ffc4b8", "#d7d3d3", "#ff9783", "#bab6b6", "#ffe0d9", "#eae7e7", "#ff563c", "#9b9797"],
  },
  deep: {
    name: "Deep",
    note: "Dark steps",
    colors: ["#4d170e", "#2d2b2b", "#7c1405", "#444141", "#ae1800", "#605d5d", "#dd2b0f", "#7d7979"],
  },
  custom: { name: "Custom", note: "Your swatches", colors: [] },
};

export const STEPS = [
  { label: "Chart", hint: "Pick a type" },
  { label: "Data", hint: "Enter or paste rows" },
  { label: "Map", hint: "Columns → encodings" },
  { label: "Style", hint: "Title, palette, labels" },
  { label: "Publish", hint: "Link for the deck" },
] as const;

export function chartDef(id: string): ChartDef {
  for (const g of CHART_GROUPS) {
    for (const item of g.items) if (item.id === id) return item;
  }
  return CHART_GROUPS[0].items[0];
}

const FUNNEL_SEED: Sheet = {
  name: "Flows",
  cols: ["Source", "Target", "Value"],
  types: ["text", "text", "number"],
  rows: [
    ["Organic search", "Homepage", "4200"],
    ["Paid social", "Homepage", "1800"],
    ["Email", "Homepage", "1500"],
    ["Referral", "Product tour", "900"],
    ["Homepage", "Sign-up", "3600"],
    ["Homepage", "Pricing", "2400"],
    ["Product tour", "Sign-up", "700"],
    ["Pricing", "Sign-up", "1500"],
    ["Sign-up", "Activated", "3900"],
    ["Sign-up", "Dormant", "1900"],
  ],
};

const SUNBURST_SEED: Sheet = {
  name: "Flows",
  cols: ["Region", "Market", "Revenue"],
  types: ["text", "text", "number"],
  rows: [
    ["Americas", "United States", "5200000"],
    ["Americas", "Brazil", "980000"],
    ["Americas", "Canada", "760000"],
    ["EMEA", "Germany", "1400000"],
    ["EMEA", "United Kingdom", "1150000"],
    ["EMEA", "UAE", "540000"],
    ["APAC", "Japan", "1600000"],
    ["APAC", "India", "890000"],
  ],
};

const TREEMAP_SEED: Sheet = {
  name: "Flows",
  cols: ["Sector", "Holding", "Market value"],
  types: ["text", "text", "number"],
  rows: [
    ["Technology", "Nimbus Cloud", "4100000"],
    ["Technology", "Vertex Chips", "2600000"],
    ["Healthcare", "Alden Bio", "1800000"],
    ["Healthcare", "Cura Labs", "950000"],
    ["Energy", "Solara Grid", "1300000"],
    ["Energy", "Petrolux", "700000"],
    ["Retail", "Marketwell", "600000"],
  ],
};

const PACK_SEED: Sheet = {
  name: "Flows",
  cols: ["Product line", "SKU", "Units sold"],
  types: ["text", "text", "number"],
  rows: [
    ["Footwear", "Trail runner", "18400"],
    ["Footwear", "Studio flat", "9200"],
    ["Footwear", "Court classic", "12600"],
    ["Apparel", "Packable jacket", "7400"],
    ["Apparel", "Base layer", "5100"],
    ["Accessories", "Trail pack", "3200"],
    ["Accessories", "Cap", "6800"],
  ],
};

const RELATIONSHIP_SEED: Sheet = {
  name: "Flows",
  cols: ["From", "To", "Hours"],
  types: ["text", "text", "number"],
  rows: [
    ["Engineering", "Product", "420"],
    ["Engineering", "Design", "260"],
    ["Product", "Design", "340"],
    ["Product", "Marketing", "180"],
    ["Design", "Marketing", "150"],
    ["Marketing", "Sales", "300"],
    ["Sales", "Support", "220"],
    ["Support", "Engineering", "140"],
    ["Sales", "Product", "190"],
  ],
};

const NETWORK_SEED: Sheet = {
  name: "Flows",
  cols: ["Page", "Links to", "Clicks"],
  types: ["text", "text", "number"],
  rows: [
    ["Homepage", "Pricing", "3400"],
    ["Homepage", "Docs", "2100"],
    ["Homepage", "Blog", "1200"],
    ["Pricing", "Sign-up", "1900"],
    ["Docs", "API reference", "1500"],
    ["Docs", "Sign-up", "700"],
    ["Blog", "Docs", "600"],
    ["Blog", "Pricing", "450"],
    ["API reference", "Sign-up", "500"],
  ],
};

const PROFILE_SEED: Sheet = {
  name: "Segments",
  cols: ["Segment", "Reach", "Engagement", "Retention", "Revenue", "Cost"],
  types: ["text", "number", "number", "number", "number", "number"],
  rows: [
    ["Enterprise", "82", "64", "91", "96", "70"],
    ["Mid-market", "68", "77", "74", "71", "55"],
    ["SMB", "91", "58", "46", "43", "38"],
    ["Self-serve", "74", "83", "39", "29", "22"],
  ],
};

const MARIMEKKO_SEED: Sheet = {
  name: "Segments",
  cols: ["Category", "Market size", "North America", "Europe", "Asia", "Growth"],
  types: ["text", "number", "number", "number", "number", "number"],
  rows: [
    ["Smartphones", "480", "38", "29", "33", "6"],
    ["Laptops", "260", "42", "31", "27", "3"],
    ["Tablets", "90", "35", "27", "38", "-2"],
    ["Wearables", "55", "30", "22", "48", "14"],
  ],
};

const RADAR_SEED: Sheet = {
  name: "Segments",
  cols: ["Product", "Speed", "Battery", "Camera", "Display", "Price"],
  types: ["text", "number", "number", "number", "number", "number"],
  rows: [
    ["Aria X", "88", "72", "94", "90", "60"],
    ["Nova 5", "76", "91", "70", "82", "78"],
    ["Pulse Mini", "64", "85", "58", "66", "92"],
  ],
};

/** Seed data per flow-shaped chart type — each is its own story shaped the
 *  way that chart draws it, so the column order itself shows what to paste
 *  in: a funnel for sankey, nested categories for the hierarchy charts, a
 *  many-to-many web for the relationship charts. */
export const FLOW_SEEDS: Record<string, Sheet> = {
  sankey: FUNNEL_SEED,
  sunburst: SUNBURST_SEED,
  treemap: TREEMAP_SEED,
  pack: PACK_SEED,
  chord: RELATIONSHIP_SEED,
  network: NETWORK_SEED,
};

/** Seed data per matrix-shaped chart type — one label column plus five
 *  measures each, matching the default column mapping so switching types
 *  doesn't require re-mapping columns before the preview draws. */
export const MATRIX_SEEDS: Record<string, Sheet> = {
  parallel: PROFILE_SEED,
  marimekko: MARIMEKKO_SEED,
  radar: RADAR_SEED,
};

const FLOW_SEED_LIST = Object.values(FLOW_SEEDS);
const MATRIX_SEED_LIST = Object.values(MATRIX_SEEDS);

function sameSheetData(a: Sheet, b: Sheet): boolean {
  return JSON.stringify(a.cols) === JSON.stringify(b.cols) && JSON.stringify(a.rows) === JSON.stringify(b.rows);
}

/** True when `sheet` still matches one of the built-in seed datasets for that
 *  shape — i.e. the user hasn't typed or pasted their own data over it yet. */
export function isSeedSheet(sheet: Sheet, shape: ChartShape): boolean {
  const list = shape === "matrix" ? MATRIX_SEED_LIST : FLOW_SEED_LIST;
  return list.some((seed) => sameSheetData(seed, sheet));
}

/** The seed sheet a given chart type wants to feed it, falling back to the
 *  shared funnel/profile seed for shapes without a bespoke dataset. */
export function seedFor(chartId: string): Sheet {
  const shape = chartDef(chartId).shape;
  const seed = shape === "matrix" ? MATRIX_SEEDS[chartId] : FLOW_SEEDS[chartId];
  return structuredClone(seed ?? (shape === "matrix" ? PROFILE_SEED : FUNNEL_SEED));
}

export const DEFAULT_SHEETS: Sheets = {
  flows: FUNNEL_SEED,
  segments: PROFILE_SEED,
};

export const DEFAULT_MAPPING: Mapping = {
  flow: { s: 0, t: 1, v: 2 },
  matrix: { label: 0, measures: [1, 2, 3, 4, 5] },
};

export const DEFAULT_STYLE: ChartStyle = {
  title: "Acquisition → activation flow",
  subtitle: "Q3 FY26 · all regions · n = 14,900 sessions",
  palette: "accent",
  customColors: ["#ec3013", "#201e1d", "#ff9783", "#605d5d", "#ffc4b8", "#9b9797"],
  fillAlpha: 1,
  ground: "light",
  labels: true,
  values: true,
  sortDesc: true,
};
