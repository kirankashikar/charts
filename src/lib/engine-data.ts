import { flowLinks, matrixData } from "./chart-builder";
import type { ChartSnapshot } from "./chart-types";

export interface NodeLink {
  nodes: string[];
  links: { source: string; target: string; value: number }[];
}

/** Distinct node names plus the validated links between them. */
export function nodeLinkData(snapshot: ChartSnapshot): NodeLink {
  const links = flowLinks(snapshot.sheets, snapshot.mapping).map((l) => ({
    source: l.s,
    target: l.t,
    value: l.v,
  }));
  const nodes: string[] = [];
  for (const l of links) {
    if (!nodes.includes(l.source)) nodes.push(l.source);
    if (!nodes.includes(l.target)) nodes.push(l.target);
  }
  return { nodes, links };
}

export interface HierarchyNode {
  name: string;
  value?: number;
  children?: HierarchyNode[];
}

/** Source rows collapsed into one parent per source with its targets beneath —
 *  the two-level tree the hierarchy charts (sunburst, treemap, pack) draw. */
export function hierarchyData(snapshot: ChartSnapshot): HierarchyNode {
  const links = flowLinks(snapshot.sheets, snapshot.mapping);
  const groups = new Map<string, HierarchyNode>();
  for (const l of links) {
    const group = groups.get(l.s) ?? { name: l.s, children: [] };
    group.children!.push({ name: l.t, value: l.v });
    groups.set(l.s, group);
  }
  let children = [...groups.values()];
  if (snapshot.style.sortDesc) {
    const total = (n: HierarchyNode) => (n.children ?? []).reduce((a, c) => a + (c.value ?? 0), 0);
    children = children.sort((a, b) => total(b) - total(a));
  }
  return { name: "Total", children };
}

export interface MatrixSeries {
  axes: string[];
  rows: { label: string; vals: number[] }[];
  max: number;
}

export function matrixSeries(snapshot: ChartSnapshot): MatrixSeries {
  const m = matrixData(snapshot.sheets, snapshot.mapping);
  const max = Math.max(1, ...m.rows.flatMap((r) => r.vals));
  return { ...m, max };
}
