import {
  ChartSnapshot,
  ChartStyle,
  Ground,
  Mapping,
  PALETTES,
  Sheets,
  chartDef,
} from "./chart-types";

export interface BaseShape {
  fill: string;
  stroke: string;
  sw: number;
  op: number;
}
export interface PathShape extends BaseShape {
  d: string;
}
export interface RectShape extends BaseShape {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface CircleShape extends BaseShape {
  cx: number;
  cy: number;
  r: number;
}
export interface LineShape {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  sw: number;
  op: number;
}
export interface LabelShape {
  x: number;
  y: number;
  text: string;
  fill: string;
  size: number;
  weight: number;
  anchor: "start" | "middle" | "end";
  tr: string;
  op: number;
}

export interface Scene {
  vb: string;
  paths: PathShape[];
  rects: RectShape[];
  circles: CircleShape[];
  lines: LineShape[];
  labels: LabelShape[];
  /** True when the chart type needs columns the sheets don't carry. */
  locked: boolean;
}

export interface FlowLink {
  s: string;
  t: string;
  v: number;
}

export interface MatrixData {
  axes: string[];
  rows: { label: string; vals: number[] }[];
}

const W = 760;
const H = 430;

export function paletteColors(style: ChartStyle): string[] {
  if (style.palette === "custom") {
    const c = (style.customColors || []).filter(Boolean);
    return c.length ? c : ["#ec3013"];
  }
  return PALETTES[style.palette].colors;
}

export function groundColors(ground: Ground) {
  const dark = ground === "dark";
  return {
    dark,
    ink: dark ? "#f3f2f2" : "#201e1d",
    onInk: dark ? "#201e1d" : "#f3f2f2",
    groundBg: dark ? "#201e1d" : "#f3f2f2",
    gridLine: dark ? "#605d5d" : "#bab6b6",
    muted: dark ? "#bab6b6" : "#7d7979",
  };
}

/** Rows that survive validation: both node columns filled, weight positive. */
export function flowLinks(sheets: Sheets, mapping: Mapping): FlowLink[] {
  const m = mapping.flow;
  const out: FlowLink[] = [];
  for (const r of sheets.flows.rows) {
    const v = parseFloat(r[m.v]);
    if (r[m.s] && r[m.t] && isFinite(v) && v > 0) out.push({ s: String(r[m.s]), t: String(r[m.t]), v });
  }
  return out;
}

export function matrixData(sheets: Sheets, mapping: Mapping): MatrixData {
  const s = sheets.segments;
  const m = mapping.matrix;
  const axes = m.measures.map((i) => s.cols[i]).filter(Boolean);
  const rows = s.rows
    .filter((r) => r[m.label])
    .map((r) => ({
      label: String(r[m.label]),
      vals: m.measures.map((i) => {
        const n = parseFloat(r[i]);
        return isFinite(n) ? n : 0;
      }),
    }));
  return { axes, rows };
}

export function formatValue(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k" : String(n);
}

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number): [number, number] => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const laf = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const f = (n: number) => n.toFixed(2);
  if (r0 <= 0.01) {
    return `M${f(cx)},${f(cy)}L${f(x0)},${f(y0)}A${f(r1)},${f(r1)} 0 ${laf} 1 ${f(x1)},${f(y1)}Z`;
  }
  return `M${f(x0)},${f(y0)}A${f(r1)},${f(r1)} 0 ${laf} 1 ${f(x1)},${f(y1)}L${f(x2)},${f(y2)}A${f(r0)},${f(
    r0
  )} 0 ${laf} 0 ${f(x3)},${f(y3)}Z`;
}

export function emptyScene(locked = true): Scene {
  return { vb: `0 0 ${W} ${H}`, paths: [], rects: [], circles: [], lines: [], labels: [], locked };
}

interface SankeyNode {
  name: string;
  in: number;
  out: number;
  d: number;
  h: number;
  x: number;
  y: number;
  w: number;
  sy: number;
  ty: number;
}

interface RadialNode {
  name: string;
  v: number;
  i: number;
  a0: number;
  a1: number;
  cur: number;
  x: number;
  y: number;
  r: number;
}

/**
 * Draws the chart as flat shape lists in a 760×430 user space. Deliberately
 * free of DOM and React so the same geometry serves the live preview, the
 * public viewer and the server-rendered PNG a slide points at.
 */
export function buildScene(snapshot: ChartSnapshot): Scene {
  const { chartType, sheets, mapping, style } = snapshot;
  const def = chartDef(chartType);
  if (def.shape === "geo" || def.shape === "obs") return emptyScene(true);

  const out = emptyScene(false);
  const id = def.id;
  const lab = style.labels;
  const showV = style.values;
  const L = flowLinks(sheets, mapping);
  const colors = paletteColors(style);
  const col = (i: number) => colors[i % colors.length];
  const { ink: INK, onInk: ONINK, groundBg: GROUND, gridLine: GRID, muted: MUTED } = groundColors(style.ground);

  const pushPath = (o: Partial<PathShape> & { d: string }) =>
    out.paths.push({ fill: "none", stroke: "none", sw: 0, op: 1, ...o });
  const pushRect = (o: Partial<RectShape> & { x: number; y: number; w: number; h: number }) =>
    out.rects.push({ fill: "none", stroke: "none", sw: 0, op: 1, ...o });
  const pushCircle = (o: Partial<CircleShape> & { cx: number; cy: number; r: number }) =>
    out.circles.push({ fill: "none", stroke: "none", sw: 0, op: 1, ...o });
  const text = (o: Partial<LabelShape> & { x: number; y: number; text: string }) =>
    out.labels.push({ fill: INK, size: 11, weight: 400, anchor: "start", tr: "", op: 1, ...o });

  if (id === "sankey") {
    const nodes: Record<string, SankeyNode> = {};
    const order: string[] = [];
    L.forEach((l) =>
      [l.s, l.t].forEach((n) => {
        if (!nodes[n]) {
          nodes[n] = { name: n, in: 0, out: 0, d: 0, h: 0, x: 0, y: 0, w: 0, sy: 0, ty: 0 };
          order.push(n);
        }
      })
    );
    L.forEach((l) => {
      nodes[l.s].out += l.v;
      nodes[l.t].in += l.v;
    });
    // Relax depths until every target sits at least one column right of its source.
    for (let k = 0; k < order.length; k++) {
      L.forEach((l) => {
        nodes[l.t].d = Math.max(nodes[l.t].d, nodes[l.s].d + 1);
      });
    }
    const maxD = Math.max(0, ...order.map((n) => nodes[n].d));
    const cols: Record<number, SankeyNode[]> = {};
    order.forEach((n) => {
      (cols[nodes[n].d] = cols[nodes[n].d] || []).push(nodes[n]);
    });
    const pad = 26,
      nw = 13,
      gap = 14;
    Object.keys(cols).forEach((key) => {
      const d = Number(key);
      const arr = cols[d];
      if (style.sortDesc) arr.sort((a, b) => Math.max(b.in, b.out) - Math.max(a.in, a.out));
      const total = arr.reduce((a, n) => a + Math.max(n.in, n.out), 0) || 1;
      const avail = H - 2 * pad - gap * (arr.length - 1);
      let y = pad;
      arr.forEach((n) => {
        n.h = Math.max(4, (Math.max(n.in, n.out) / total) * avail);
        n.x = maxD ? pad + d * ((W - 2 * pad - nw - 110) / maxD) : pad;
        n.y = y;
        n.w = nw;
        n.sy = y;
        n.ty = y;
        y += n.h + gap;
      });
    });
    const sorted = L.slice().sort((a, b) => b.v - a.v);
    const scaleOf = (n: SankeyNode) => n.h / (Math.max(n.in, n.out) || 1);
    sorted.forEach((l, i) => {
      const a = nodes[l.s],
        b = nodes[l.t];
      const th1 = l.v * scaleOf(a),
        th2 = l.v * scaleOf(b);
      const x0 = a.x + a.w,
        x1 = b.x,
        mx = (x0 + x1) / 2;
      const s0 = a.sy,
        s1 = a.sy + th1,
        t0 = b.ty,
        t1 = b.ty + th2;
      a.sy += th1;
      b.ty += th2;
      pushPath({
        d: `M${x0},${s0}C${mx},${s0} ${mx},${t0} ${x1},${t0}L${x1},${t1}C${mx},${t1} ${mx},${s1} ${x0},${s1}Z`,
        fill: col(i),
        op: 0.32,
      });
    });
    order.forEach((n) => {
      const nd = nodes[n];
      pushRect({ x: nd.x, y: nd.y, w: nd.w, h: nd.h, fill: INK });
      if (lab) {
        text({
          x: nd.d === maxD ? nd.x - 8 : nd.x + nd.w + 8,
          y: nd.y + nd.h / 2 + 4,
          text: n + (showV ? "  " + formatValue(Math.max(nd.in, nd.out)) : ""),
          anchor: nd.d === maxD ? "end" : "start",
          size: 12,
          weight: 600,
        });
      }
    });
  }

  if (id === "sunburst" || id === "pack" || id === "chord" || id === "network" || id === "treemap") {
    const groups: Record<string, { name: string; v: number; kids: { name: string; v: number }[] }> = {};
    L.forEach((l) => {
      groups[l.s] = groups[l.s] || { name: l.s, v: 0, kids: [] };
      groups[l.s].v += l.v;
      groups[l.s].kids.push({ name: l.t, v: l.v });
    });
    const gs = Object.keys(groups).map((k) => groups[k]);
    if (style.sortDesc) gs.sort((a, b) => b.v - a.v);
    const total = gs.reduce((a, g) => a + g.v, 0) || 1;

    if (id === "sunburst") {
      const cx = W / 2,
        cy = H / 2,
        r0 = 46,
        r1 = 118,
        r2 = 188;
      let a = -Math.PI / 2;
      pushCircle({ cx, cy, r: r0 - 4, fill: INK });
      text({ x: cx, y: cy - 2, text: "TOTAL", anchor: "middle", size: 9, weight: 800, fill: ONINK });
      text({ x: cx, y: cy + 12, text: formatValue(total), anchor: "middle", size: 14, weight: 800, fill: ONINK });
      gs.forEach((g, i) => {
        const sweep = (g.v / total) * Math.PI * 2,
          a1 = a + sweep;
        pushPath({ d: arcPath(cx, cy, r0, r1, a, a1), fill: col(i), stroke: GROUND, sw: 2 });
        let ka = a;
        g.kids.forEach((k) => {
          const ks = (k.v / total) * Math.PI * 2;
          pushPath({ d: arcPath(cx, cy, r1 + 2, r2, ka, ka + ks), fill: col(i), op: 0.45, stroke: GROUND, sw: 2 });
          if (lab && ks > 0.16) {
            const mid = ka + ks / 2,
              deg = (mid * 180) / Math.PI;
            const flip = deg > 90 || deg < -90;
            const rr = r2 + 8,
              x = cx + rr * Math.cos(mid),
              y = cy + rr * Math.sin(mid);
            text({
              x,
              y: y + 3,
              text: k.name,
              anchor: flip ? "end" : "start",
              size: 10.5,
              weight: 600,
              tr: `rotate(${flip ? deg + 180 : deg},${x.toFixed(1)},${y.toFixed(1)})`,
            });
          }
          ka += ks;
        });
        if (lab && sweep > 0.2) {
          const mid = a + sweep / 2,
            rr = (r0 + r1) / 2;
          text({
            x: cx + rr * Math.cos(mid),
            y: cy + rr * Math.sin(mid) + 4,
            text: g.name,
            anchor: "middle",
            size: 11,
            weight: 800,
            fill: "#f3f2f2",
          });
        }
        a = a1;
      });
    }

    if (id === "treemap") {
      const pad = 8;
      const x = pad,
        y = pad,
        w = W - 2 * pad,
        h = H - 2 * pad;
      let acc = 0;
      gs.forEach((g, i) => {
        const gw = (g.v / total) * w;
        pushRect({ x: x + acc, y, w: gw - 3, h, fill: col(i), op: 0.22 });
        let ky = y;
        const kids = g.kids.slice().sort((a, b) => b.v - a.v);
        kids.forEach((k) => {
          const kh = (k.v / g.v) * h;
          pushRect({ x: x + acc, y: ky, w: gw - 3, h: kh - 3, fill: col(i), op: 0.85 });
          if (lab && kh > 26 && gw > 60) {
            text({ x: x + acc + 10, y: ky + 20, text: k.name, size: 11.5, weight: 800, fill: "#f3f2f2" });
            if (showV) {
              text({ x: x + acc + 10, y: ky + 34, text: formatValue(k.v), size: 11, fill: "#f3f2f2", op: 0.9 });
            }
          }
          ky += kh;
        });
        if (lab && gw > 70) {
          text({ x: x + acc + 10, y: y + h - 10, text: g.name.toUpperCase(), size: 9.5, weight: 800, fill: INK });
        }
        acc += gw;
      });
    }

    if (id === "pack") {
      const cx = W / 2,
        cy = H / 2,
        R = 175;
      const maxV = Math.max(...gs.map((g) => g.v));
      gs.forEach((g, i) => {
        const ang = (i / gs.length) * Math.PI * 2 - Math.PI / 2;
        const gr = 34 + 58 * Math.sqrt(g.v / maxV);
        const gx = cx + (R - gr * 0.55) * Math.cos(ang),
          gy = cy + (R - gr * 0.55) * Math.sin(ang) * 0.74;
        pushCircle({ cx: gx, cy: gy, r: gr, fill: col(i), op: 0.2, stroke: col(i), sw: 1.5 });
        const kmax = Math.max(...g.kids.map((k) => k.v));
        g.kids.forEach((k, j) => {
          const kr = gr * 0.34 * Math.sqrt(k.v / kmax) + 6;
          const ka = (j / Math.max(1, g.kids.length)) * Math.PI * 2;
          const off = g.kids.length > 1 ? gr - kr - 5 : 0;
          pushCircle({ cx: gx + off * Math.cos(ka), cy: gy + off * Math.sin(ka), r: kr, fill: col(i), op: 0.9 });
        });
        if (lab) text({ x: gx, y: gy + gr + 15, text: g.name, anchor: "middle", size: 11, weight: 800 });
      });
    }

    if (id === "chord" || id === "network") {
      const cx = W / 2,
        cy = H / 2,
        R = 150;
      const nodes: Record<string, RadialNode> = {};
      const order: string[] = [];
      L.forEach((l) =>
        [l.s, l.t].forEach((n) => {
          if (!nodes[n]) {
            nodes[n] = { name: n, v: 0, i: order.length, a0: 0, a1: 0, cur: 0, x: 0, y: 0, r: 0 };
            order.push(n);
          }
        })
      );
      L.forEach((l) => {
        nodes[l.s].v += l.v;
        nodes[l.t].v += l.v;
      });
      const tot = order.reduce((a, n) => a + nodes[n].v, 0) || 1;
      const maxV = Math.max(...order.map((n) => nodes[n].v));
      if (id === "chord") {
        let a = -Math.PI / 2;
        order.forEach((n, i) => {
          const sw = (nodes[n].v / tot) * (Math.PI * 2 - order.length * 0.035);
          nodes[n].a0 = a;
          nodes[n].a1 = a + sw;
          nodes[n].cur = a;
          pushPath({ d: arcPath(cx, cy, R, R + 15, a, a + sw), fill: col(i) });
          if (lab) {
            const mid = a + sw / 2,
              deg = (mid * 180) / Math.PI,
              flip = deg > 90 || deg < -90;
            const rr = R + 22,
              x = cx + rr * Math.cos(mid),
              y = cy + rr * Math.sin(mid);
            text({
              x,
              y: y + 3,
              text: n,
              anchor: flip ? "end" : "start",
              size: 10.5,
              weight: 600,
              tr: `rotate(${flip ? deg + 180 : deg},${x.toFixed(1)},${y.toFixed(1)})`,
            });
          }
          a += sw + 0.035;
        });
        L.forEach((l, i) => {
          const A = nodes[l.s],
            B = nodes[l.t];
          const wA = (l.v / tot) * (Math.PI * 2 - order.length * 0.035),
            wB = wA;
          const p = (r: number, an: number): [number, number] => [cx + r * Math.cos(an), cy + r * Math.sin(an)];
          const [x0, y0] = p(R, A.cur),
            [x1, y1] = p(R, A.cur + wA);
          const [x2, y2] = p(R, B.cur),
            [x3, y3] = p(R, B.cur + wB);
          A.cur += wA;
          B.cur += wB;
          pushPath({
            d: `M${x0.toFixed(1)},${y0.toFixed(1)}Q${cx},${cy} ${x2.toFixed(1)},${y2.toFixed(1)}A${R},${R} 0 0 1 ${x3.toFixed(
              1
            )},${y3.toFixed(1)}Q${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)}A${R},${R} 0 0 0 ${x0.toFixed(
              1
            )},${y0.toFixed(1)}Z`,
            fill: col(i),
            op: 0.3,
          });
        });
      } else {
        order.forEach((n, i) => {
          const ang = (i / order.length) * Math.PI * 2 - Math.PI / 2;
          nodes[n].x = cx + R * Math.cos(ang);
          nodes[n].y = cy + R * Math.sin(ang) * 0.82;
          nodes[n].r = 8 + 20 * Math.sqrt(nodes[n].v / maxV);
        });
        L.forEach((l, i) => {
          const A = nodes[l.s],
            B = nodes[l.t];
          pushPath({
            d: `M${A.x.toFixed(1)},${A.y.toFixed(1)}Q${cx},${cy} ${B.x.toFixed(1)},${B.y.toFixed(1)}`,
            stroke: col(i),
            sw: Math.max(1, (l.v / maxV) * 9),
            op: 0.5,
          });
        });
        order.forEach((n, i) => {
          const nd = nodes[n];
          pushCircle({ cx: nd.x, cy: nd.y, r: nd.r, fill: col(i), stroke: GROUND, sw: 2 });
          if (lab) text({ x: nd.x, y: nd.y + nd.r + 14, text: n, anchor: "middle", size: 10.5, weight: 600 });
        });
      }
    }
  }

  if (id === "radar" || id === "parallel" || id === "marimekko") {
    const M = matrixData(sheets, mapping);
    if (id === "radar") {
      const cx = W / 2,
        cy = H / 2 + 4,
        R = 160,
        n = M.axes.length || 1;
      const ang = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
      [0.25, 0.5, 0.75, 1].forEach((f) => {
        const pts = M.axes
          .map((_, i) => `${(cx + R * f * Math.cos(ang(i))).toFixed(1)},${(cy + R * f * Math.sin(ang(i))).toFixed(1)}`)
          .join("L");
        pushPath({ d: `M${pts}Z`, stroke: GRID, sw: 1 });
      });
      M.axes.forEach((a, i) => {
        out.lines.push({
          x1: cx,
          y1: cy,
          x2: cx + R * Math.cos(ang(i)),
          y2: cy + R * Math.sin(ang(i)),
          stroke: GRID,
          sw: 1,
          op: 1,
        });
        const rr = R + 22,
          x = cx + rr * Math.cos(ang(i)),
          y = cy + rr * Math.sin(ang(i));
        text({
          x,
          y: y + 4,
          text: a,
          anchor: Math.abs(Math.cos(ang(i))) < 0.2 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end",
          size: 11.5,
          weight: 800,
        });
      });
      const max = Math.max(1, ...M.rows.map((r) => Math.max(...r.vals)));
      M.rows.forEach((r, k) => {
        const pts = r.vals
          .map(
            (v, i) =>
              `${(cx + R * (v / max) * Math.cos(ang(i))).toFixed(1)},${(cy + R * (v / max) * Math.sin(ang(i))).toFixed(
                1
              )}`
          )
          .join("L");
        pushPath({ d: `M${pts}Z`, fill: col(k), op: 0.16 });
        pushPath({ d: `M${pts}Z`, stroke: col(k), sw: 2.5 });
      });
      M.rows.forEach((r, k) => {
        pushRect({ x: 14, y: 16 + k * 19, w: 11, h: 11, fill: col(k) });
        text({ x: 31, y: 26 + k * 19, text: r.label, size: 11.5, weight: 600 });
      });
    }
    if (id === "parallel") {
      const padL = 70,
        padR = 30,
        top = 34,
        bot = H - 44,
        n = M.axes.length || 1;
      const ax = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
      M.axes.forEach((a, i) => {
        const mx = Math.max(1, ...M.rows.map((r) => r.vals[i]));
        out.lines.push({ x1: ax(i), y1: top, x2: ax(i), y2: bot, stroke: INK, sw: 1.5, op: 1 });
        text({ x: ax(i), y: top - 12, text: a, anchor: "middle", size: 11.5, weight: 800 });
        text({ x: ax(i) + 6, y: top + 10, text: String(mx), anchor: "start", size: 9.5, fill: MUTED });
        text({ x: ax(i) + 6, y: bot - 2, text: "0", anchor: "start", size: 9.5, fill: MUTED });
      });
      M.rows.forEach((r, k) => {
        const pts = r.vals
          .map((v, i) => {
            const mx = Math.max(1, ...M.rows.map((rr) => rr.vals[i]));
            return `${ax(i).toFixed(1)},${(bot - (v / mx) * (bot - top)).toFixed(1)}`;
          })
          .join("L");
        pushPath({ d: `M${pts}`, stroke: col(k), sw: 2.5, op: 0.9 });
        if (lab) {
          text({
            x: padL - 10,
            y: bot - (r.vals[0] / Math.max(1, ...M.rows.map((rr) => rr.vals[0]))) * (bot - top) + 4,
            text: r.label,
            anchor: "end",
            size: 11,
            weight: 600,
            fill: col(k),
          });
        }
      });
    }
    if (id === "marimekko") {
      const padL = 16,
        padR = 16,
        top = 26,
        bot = H - 34;
      const totals = M.rows.map((r) => r.vals.reduce((a, b) => a + b, 0) || 1);
      const grand = totals.reduce((a, b) => a + b, 0) || 1;
      let x = padL;
      M.rows.forEach((r, k) => {
        const cw = (totals[k] / grand) * (W - padL - padR) - 4;
        let y = top;
        r.vals.forEach((v, i) => {
          const hh = (v / totals[k]) * (bot - top);
          pushRect({ x, y, w: cw, h: hh - 2, fill: col(i), op: 0.9 });
          if (lab && hh > 22 && cw > 54) {
            text({
              x: x + 8,
              y: y + 18,
              text: M.axes[i] + (showV ? " " + Math.round((v / totals[k]) * 100) + "%" : ""),
              size: 10.5,
              weight: 700,
              fill: i < 2 ? "#f3f2f2" : INK,
            });
          }
          y += hh;
        });
        text({ x, y: bot + 16, text: r.label, size: 11.5, weight: 800 });
        text({ x, y: top - 10, text: formatValue(totals[k]), size: 10, fill: MUTED });
        x += cw + 4;
      });
    }
  }

  const alpha = style.fillAlpha === undefined ? 1 : style.fillAlpha;
  if (alpha < 1) {
    [out.paths, out.rects, out.circles].forEach((list) =>
      list.forEach((s) => {
        if (s.fill && s.fill !== "none") s.op = Number((s.op * alpha).toFixed(3));
      })
    );
  }
  return out;
}

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Serializes a scene (plus its title block) to standalone SVG markup —
 * the input for the PNG a slide carries.
 */
export function sceneToSvg(snapshot: ChartSnapshot, scene: Scene): string {
  const { groundBg, ink, muted } = groundColors(snapshot.style.ground);
  const pad = 28;
  const head = 76;
  const width = 816;
  const height = 534;
  const font = "Archivo, Helvetica, Arial, sans-serif";

  const body = scene.locked
    ? `<text x="${pad}" y="${head + 40}" font-family="${font}" font-size="16" fill="${muted}">Needs columns this sheet doesn't carry yet.</text>`
    : [
        ...scene.paths.map(
          (s) =>
            `<path d="${s.d}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.sw}" opacity="${s.op}"/>`
        ),
        ...scene.rects.map(
          (s) =>
            `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.sw}" opacity="${s.op}"/>`
        ),
        ...scene.circles.map(
          (s) =>
            `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.sw}" opacity="${s.op}"/>`
        ),
        ...scene.lines.map(
          (s) =>
            `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.stroke}" stroke-width="${s.sw}" opacity="${s.op}"/>`
        ),
        ...scene.labels.map(
          (s) =>
            `<text x="${s.x}" y="${s.y}" fill="${s.fill}" font-size="${s.size}" font-weight="${s.weight}" text-anchor="${
              s.anchor
            }" opacity="${s.op}"${s.tr ? ` transform="${s.tr}"` : ""} font-family="${font}">${escapeXml(s.text)}</text>`
        ),
      ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${groundBg}"/>
<text x="${pad}" y="${pad + 22}" font-family="${font}" font-size="24" font-weight="800" fill="${ink}">${escapeXml(
    snapshot.style.title || snapshot.name
  )}</text>
<text x="${pad}" y="${pad + 44}" font-family="${font}" font-size="13" fill="${muted}">${escapeXml(
    snapshot.style.subtitle
  )}</text>
<rect x="${pad}" y="${pad + 56}" width="${width - pad * 2}" height="2" fill="${muted}" opacity="0.5"/>
<g transform="translate(${pad}, ${head + 14})">${body}</g>
</svg>`;
}

/** Five normalized bar heights (%) for a dashboard card, read off real data. */
export function thumbnailBars(snapshot: ChartSnapshot): number[] {
  const def = chartDef(snapshot.chartType);
  const values =
    def.shape === "matrix"
      ? (matrixData(snapshot.sheets, snapshot.mapping).rows[0]?.vals ?? [])
      : flowLinks(snapshot.sheets, snapshot.mapping).map((l) => l.v);
  const picked = values.slice(0, 5);
  while (picked.length < 5) picked.push(0);
  const max = Math.max(1, ...picked);
  return picked.map((v) => Math.max(12, Math.round((v / max) * 100)));
}
