export interface IconPath {
  d: string;
  fill: string;
  stroke: string;
  sw: number;
}

const a = "#ec3013";
const k = "#201e1d";

const RAW: Record<string, (Partial<IconPath> & { d: string })[]> = {
  sankey: [
    { d: "M4 4h5v10H4z", fill: k },
    { d: "M9 6C22 6 26 20 51 20", stroke: a, sw: 5 },
    { d: "M9 11C22 11 26 28 51 28", stroke: k, sw: 3 },
    { d: "M51 16h5v18h-5z", fill: k },
  ],
  sunburst: [
    { d: "M30 17m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0", fill: k },
    { d: "M30 17 L30 3 A14 14 0 0 1 42 24 Z", fill: a },
    { d: "M30 17 L42 24 A14 14 0 0 1 18 24 Z", fill: a, stroke: "#f3f2f2", sw: 1 },
  ],
  treemap: [
    { d: "M4 4h26v16H4z", fill: a },
    { d: "M31 4h25v9H31z", fill: k },
    { d: "M31 14h25v6H31z", fill: k },
    { d: "M4 21h52v9H4z", fill: a },
  ],
  pack: [
    { d: "M18 17m-13 0a13 13 0 1 0 26 0a13 13 0 1 0 -26 0", fill: a },
    { d: "M44 17m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0", fill: k },
  ],
  chord: [
    { d: "M30 17m-14 0a14 14 0 1 0 28 0a14 14 0 1 0 -28 0", stroke: k, sw: 3 },
    { d: "M18 9 Q30 17 42 25", stroke: a, sw: 3 },
    { d: "M20 26 Q30 17 40 8", stroke: a, sw: 2 },
  ],
  network: [
    { d: "M12 8 L44 26 M12 8 L46 10 M44 26 L46 10", stroke: k, sw: 1.5 },
    { d: "M12 8m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0", fill: a },
    { d: "M44 26m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", fill: k },
    { d: "M46 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", fill: k },
  ],
  parallel: [
    { d: "M10 3v28M30 3v28M50 3v28", stroke: k, sw: 1.5 },
    { d: "M10 24 L30 8 L50 18", stroke: a, sw: 2.5 },
    { d: "M10 12 L30 22 L50 6", stroke: k, sw: 2 },
  ],
  violin: [
    { d: "M20 3 C30 8 30 14 20 17 C30 20 30 28 20 31 C10 28 10 20 20 17 C10 14 10 8 20 3Z", fill: a },
    { d: "M44 6 C50 11 50 15 44 17 C50 19 50 26 44 29 C38 26 38 19 44 17 C38 15 38 11 44 6Z", fill: k },
  ],
  marimekko: [
    { d: "M4 4h20v12H4z", fill: a },
    { d: "M4 17h20v13H4z", fill: k },
    { d: "M25 4h14v20H25z", fill: a },
    { d: "M25 25h14v5H25z", fill: k },
    { d: "M40 4h16v8H40z", fill: a },
    { d: "M40 13h16v17H40z", fill: k },
  ],
  radar: [
    { d: "M30 3 L52 17 L43 31 L17 31 L8 17Z", stroke: k, sw: 1.2 },
    { d: "M30 9 L45 18 L38 27 L22 25 L17 16Z", fill: a },
  ],
  symbolmap: [
    { d: "M4 8h52v20H4z", stroke: k, sw: 1.2 },
    { d: "M18 18m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", fill: a },
    { d: "M42 20m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", fill: k },
  ],
  connmap: [
    { d: "M4 8h52v20H4z", stroke: k, sw: 1.2 },
    { d: "M12 24 Q30 2 48 22", stroke: a, sw: 2 },
    { d: "M12 24m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", fill: k },
    { d: "M48 22m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0", fill: k },
  ],
  choropleth: [
    { d: "M4 8h52v20H4z", stroke: k, sw: 1.2 },
    { d: "M8 12 L18 10 L22 18 L14 25 L7 21Z", fill: a },
    { d: "M24 11 L36 12 L38 21 L27 26 L22 19Z", fill: k },
    { d: "M39 10 L50 12 L52 20 L44 24 L38 20Z", fill: a, stroke: "#f3f2f2", sw: 0.6 },
  ],
};

export function chartIcon(id: string): IconPath[] {
  return (RAW[id] ?? []).map((p) => ({ fill: "none", stroke: "none", sw: 0, ...p }));
}
