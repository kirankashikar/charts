import * as d3 from "d3";
import { sankey as d3Sankey, sankeyLinkHorizontal, type SankeyGraph } from "d3-sankey";
import { groundColors, paletteColors } from "../chart-builder";
import type { ChartSnapshot } from "../chart-types";
import { hierarchyData, nodeLinkData, type HierarchyNode } from "../engine-data";

const W = 760;
const H = 430;

interface SNode {
  name: string;
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}
interface SLink {
  source: string | number | SNode;
  target: string | number | SNode;
  value: number;
  width?: number;
}

/**
 * Draws a snapshot with d3's own layouts into an existing <svg>. Returns false
 * when d3 has no layout for the type (or the data breaks one, e.g. a cycle in
 * a sankey) so the caller can fall back to the built-in renderer.
 */
export function renderD3(el: SVGSVGElement, snapshot: ChartSnapshot): boolean {
  const { chartType, style } = snapshot;
  const colors = paletteColors(style);
  const color = (i: number) => colors[i % colors.length];
  const { ink, groundBg } = groundColors(style.ground);
  const alpha = style.fillAlpha;
  const showLabels = style.labels;

  const svg = d3.select(el);
  svg.selectAll("*").remove();
  svg.attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
  const root = svg.append("g");
  const label = (g: d3.Selection<SVGGElement, unknown, null, undefined>) =>
    g.attr("font-family", "Archivo, system-ui, sans-serif").attr("fill", ink);

  try {
    if (chartType === "sankey") {
      const { nodes, links } = nodeLinkData(snapshot);
      const layout = d3Sankey<SNode, SLink>()
        .nodeId((d) => d.name)
        .nodeWidth(13)
        .nodePadding(14)
        .extent([
          [26, 26],
          [W - 110, H - 26],
        ]);
      const graph = layout({
        nodes: nodes.map((name) => ({ name })),
        links: links.map((l) => ({ ...l })),
      }) as SankeyGraph<SNode, SLink>;

      root
        .append("g")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", (_, i) => color(i))
        .attr("stroke-width", (d) => Math.max(1, d.width ?? 1))
        .attr("stroke-opacity", 0.32 * alpha);

      root
        .append("g")
        .selectAll("rect")
        .data(graph.nodes)
        .join("rect")
        .attr("x", (d) => d.x0 ?? 0)
        .attr("y", (d) => d.y0 ?? 0)
        .attr("width", (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
        .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr("fill", ink);

      if (showLabels) {
        label(root.append("g"))
          .selectAll("text")
          .data(graph.nodes)
          .join("text")
          .attr("x", (d) => ((d.x0 ?? 0) < W / 2 ? (d.x1 ?? 0) + 8 : (d.x0 ?? 0) - 8))
          .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2 + 4)
          .attr("text-anchor", (d) => ((d.x0 ?? 0) < W / 2 ? "start" : "end"))
          .attr("font-size", 12)
          .attr("font-weight", 600)
          .text((d) => d.name);
      }
      return true;
    }

    if (chartType === "sunburst") {
      const data = d3.hierarchy<HierarchyNode>(hierarchyData(snapshot)).sum((d) => d.value ?? 0);
      if (style.sortDesc) data.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      const radius = Math.min(W, H) / 2 - 30;
      d3.partition<HierarchyNode>().size([2 * Math.PI, radius])(data);
      const arc = d3
        .arc<d3.HierarchyRectangularNode<HierarchyNode>>()
        .startAngle((d) => d.x0)
        .endAngle((d) => d.x1)
        .innerRadius((d) => d.y0)
        .outerRadius((d) => d.y1 - 2);

      const rings = (data.descendants() as d3.HierarchyRectangularNode<HierarchyNode>[]).filter((d) => d.depth > 0);
      const groupIndex = (d: d3.HierarchyRectangularNode<HierarchyNode>) => {
        const top = d.depth === 1 ? d : d.ancestors().find((a) => a.depth === 1)!;
        return top.parent?.children?.indexOf(top) ?? 0;
      };

      const g = root.attr("transform", `translate(${W / 2},${H / 2})`);
      g.selectAll("path")
        .data(rings)
        .join("path")
        .attr("d", arc)
        .attr("fill", (d) => color(groupIndex(d)))
        .attr("fill-opacity", (d) => (d.depth === 1 ? 1 : 0.45) * alpha)
        .attr("stroke", groundBg)
        .attr("stroke-width", 2);

      if (showLabels) {
        label(g.append("g"))
          .selectAll("text")
          .data(rings.filter((d) => d.x1 - d.x0 > 0.16))
          .join("text")
          .attr("transform", (d) => {
            const angle = (d.x0 + d.x1) / 2 - Math.PI / 2;
            const r = (d.y0 + d.y1) / 2;
            const deg = (angle * 180) / Math.PI;
            const flip = deg > 90 || deg < -90;
            return `rotate(${flip ? deg + 180 : deg}) translate(${flip ? -r : r},0)`;
          })
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", 10.5)
          .attr("font-weight", (d) => (d.depth === 1 ? 800 : 600))
          .attr("fill", (d) => (d.depth === 1 ? "#f3f2f2" : ink))
          .text((d) => d.data.name);
      }
      return true;
    }

    if (chartType === "treemap" || chartType === "pack") {
      const data = d3.hierarchy<HierarchyNode>(hierarchyData(snapshot)).sum((d) => d.value ?? 0);
      if (style.sortDesc) data.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
      const topIndex = (node: d3.HierarchyNode<HierarchyNode>) => {
        let cur = node;
        while (cur.depth > 1 && cur.parent) cur = cur.parent;
        return cur.parent?.children?.indexOf(cur) ?? 0;
      };

      if (chartType === "treemap") {
        d3.treemap<HierarchyNode>().size([W, H]).paddingInner(3).paddingTop(18)(data);
        const leaves = data.descendants() as d3.HierarchyRectangularNode<HierarchyNode>[];
        root
          .selectAll("rect")
          .data(leaves.filter((d) => d.depth > 0))
          .join("rect")
          .attr("x", (d) => d.x0)
          .attr("y", (d) => d.y0)
          .attr("width", (d) => Math.max(0, d.x1 - d.x0))
          .attr("height", (d) => Math.max(0, d.y1 - d.y0))
          .attr("fill", (d) => color(topIndex(d)))
          .attr("fill-opacity", (d) => (d.depth === 1 ? 0.22 : 0.85) * alpha);

        if (showLabels) {
          label(root.append("g"))
            .selectAll("text")
            .data(leaves.filter((d) => d.depth === 2 && d.x1 - d.x0 > 60 && d.y1 - d.y0 > 24))
            .join("text")
            .attr("x", (d) => d.x0 + 8)
            .attr("y", (d) => d.y0 + 18)
            .attr("font-size", 11.5)
            .attr("font-weight", 800)
            .attr("fill", "#f3f2f2")
            .text((d) => d.data.name);
        }
      } else {
        d3.pack<HierarchyNode>().size([W - 20, H - 20]).padding(6)(data);
        const nodes = data.descendants() as d3.HierarchyCircularNode<HierarchyNode>[];
        root
          .attr("transform", "translate(10,10)")
          .selectAll("circle")
          .data(nodes.filter((d) => d.depth > 0))
          .join("circle")
          .attr("cx", (d) => d.x)
          .attr("cy", (d) => d.y)
          .attr("r", (d) => d.r)
          .attr("fill", (d) => color(topIndex(d)))
          .attr("fill-opacity", (d) => (d.depth === 1 ? 0.2 : 0.9) * alpha)
          .attr("stroke", (d) => (d.depth === 1 ? color(topIndex(d)) : "none"))
          .attr("stroke-width", 1.5);

        if (showLabels) {
          label(root.append("g"))
            .selectAll("text")
            .data(nodes.filter((d) => d.depth === 1))
            .join("text")
            .attr("x", (d) => d.x)
            .attr("y", (d) => d.y + d.r + 14)
            .attr("text-anchor", "middle")
            .attr("font-size", 11)
            .attr("font-weight", 800)
            .text((d) => d.data.name);
        }
      }
      return true;
    }

    if (chartType === "chord") {
      const { nodes, links } = nodeLinkData(snapshot);
      const index = new Map(nodes.map((n, i) => [n, i]));
      const matrix = nodes.map(() => nodes.map(() => 0));
      for (const l of links) matrix[index.get(l.source)!][index.get(l.target)!] += l.value;

      const chords = d3.chord().padAngle(0.035).sortSubgroups(d3.descending)(matrix);
      const radius = Math.min(W, H) / 2 - 40;
      const g = root.attr("transform", `translate(${W / 2},${H / 2})`);

      g.append("g")
        .selectAll("path")
        .data(chords.groups)
        .join("path")
        .attr("d", d3.arc<d3.ChordGroup>().innerRadius(radius).outerRadius(radius + 15) as never)
        .attr("fill", (d) => color(d.index));

      g.append("g")
        .selectAll("path")
        .data(chords)
        .join("path")
        .attr("d", d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(radius) as never)
        .attr("fill", (d) => color(d.source.index))
        .attr("fill-opacity", 0.3 * alpha);

      if (showLabels) {
        label(g.append("g"))
          .selectAll("text")
          .data(chords.groups)
          .join("text")
          .attr("transform", (d) => {
            const angle = (d.startAngle + d.endAngle) / 2 - Math.PI / 2;
            return `translate(${Math.cos(angle) * (radius + 24)},${Math.sin(angle) * (radius + 24)})`;
          })
          .attr("text-anchor", (d) => ((d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start"))
          .attr("dy", "0.35em")
          .attr("font-size", 10.5)
          .attr("font-weight", 600)
          .text((d) => nodes[d.index]);
      }
      return true;
    }

    if (chartType === "network") {
      const { nodes, links } = nodeLinkData(snapshot);
      const weight = new Map<string, number>();
      for (const l of links) {
        weight.set(l.source, (weight.get(l.source) ?? 0) + l.value);
        weight.set(l.target, (weight.get(l.target) ?? 0) + l.value);
      }
      const max = Math.max(1, ...weight.values());
      const maxLink = Math.max(1, ...links.map((l) => l.value));
      type Sim = d3.SimulationNodeDatum & { name: string; r: number };
      const simNodes: Sim[] = nodes.map((name) => ({ name, r: 8 + 20 * Math.sqrt((weight.get(name) ?? 0) / max) }));
      const simLinks = links.map((l) => ({ ...l }));

      const simulation = d3
        .forceSimulation(simNodes)
        .force(
          "link",
          d3
            .forceLink<Sim, (typeof simLinks)[number]>(simLinks)
            .id((d) => d.name)
            .distance(110)
        )
        .force("charge", d3.forceManyBody().strength(-320))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force(
          "collide",
          d3.forceCollide<Sim>().radius((d) => d.r + 14)
        )
        .stop();
      // Settle the layout synchronously: a still frame, not an animation.
      simulation.tick(300);

      root
        .append("g")
        .selectAll("line")
        .data(simLinks)
        .join("line")
        .attr("x1", (d) => (d.source as unknown as Sim).x ?? 0)
        .attr("y1", (d) => (d.source as unknown as Sim).y ?? 0)
        .attr("x2", (d) => (d.target as unknown as Sim).x ?? 0)
        .attr("y2", (d) => (d.target as unknown as Sim).y ?? 0)
        .attr("stroke", (_, i) => color(i))
        .attr("stroke-width", (d) => Math.max(1, (d.value / maxLink) * 9))
        .attr("stroke-opacity", 0.5 * alpha);

      root
        .append("g")
        .selectAll("circle")
        .data(simNodes)
        .join("circle")
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0)
        .attr("r", (d) => d.r)
        .attr("fill", (_, i) => color(i))
        .attr("stroke", groundBg)
        .attr("stroke-width", 2);

      if (showLabels) {
        label(root.append("g"))
          .selectAll("text")
          .data(simNodes)
          .join("text")
          .attr("x", (d) => d.x ?? 0)
          .attr("y", (d) => (d.y ?? 0) + d.r + 14)
          .attr("text-anchor", "middle")
          .attr("font-size", 10.5)
          .attr("font-weight", 600)
          .text((d) => d.name);
      }
      return true;
    }
  } catch {
    svg.selectAll("*").remove();
    return false;
  }

  return false;
}
