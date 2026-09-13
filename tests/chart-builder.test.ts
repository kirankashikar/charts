import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildScene, paletteColors, sceneToSvg } from "../src/lib/chart-builder";
import { DEFAULT_MAPPING, DEFAULT_SHEETS, DEFAULT_STYLE, ChartSnapshot } from "../src/lib/chart-types";

function makeSnapshot(chartType: string, customStyle?: Partial<typeof DEFAULT_STYLE>): ChartSnapshot {
  return {
    name: `Test ${chartType}`,
    chartType,
    engine: "builtin",
    sheets: DEFAULT_SHEETS,
    mapping: {
      ...DEFAULT_MAPPING,
      flow: { s: 0, t: 1, v: 2 },
      matrix: { label: 0, measures: [1, 2, 3] },
    },
    style: { ...DEFAULT_STYLE, ...customStyle },
  };
}

describe("chart-builder lib", () => {
  describe("paletteColors", () => {
    it("returns correct palette array for built-in palettes", () => {
      const colors = paletteColors({ ...DEFAULT_STYLE, palette: "deep" });
      assert.ok(Array.isArray(colors));
      assert.ok(colors.length > 0);
      assert.ok(colors[0].startsWith("#"));
    });

    it("returns custom colors when palette is custom", () => {
      const colors = paletteColors({
        ...DEFAULT_STYLE,
        palette: "custom",
        customColors: ["#112233", "#445566"],
      });
      assert.deepEqual(colors, ["#112233", "#445566"]);
    });

    it("falls back to red if customColors is empty", () => {
      const colors = paletteColors({
        ...DEFAULT_STYLE,
        palette: "custom",
        customColors: [],
      });
      assert.deepEqual(colors, ["#ec3013"]);
    });
  });

  describe("buildScene across chart types", () => {
    const chartTypes = [
      "sankey",
      "sunburst",
      "treemap",
      "pack",
      "chord",
      "network",
      "parallel",
      "radar",
      "marimekko",
    ];

    for (const type of chartTypes) {
      it(`successfully builds scene for ${type}`, () => {
        const snapshot = makeSnapshot(type);
        const scene = buildScene(snapshot);

        assert.equal(scene.vb, "0 0 760 430");
        assert.ok(Array.isArray(scene.paths));
        assert.ok(Array.isArray(scene.rects));
        assert.ok(Array.isArray(scene.circles));
        assert.ok(Array.isArray(scene.lines));
        assert.ok(Array.isArray(scene.labels));

        // The scene should have visual elements drawn
        const totalElements =
          scene.paths.length +
          scene.rects.length +
          scene.circles.length +
          scene.lines.length +
          scene.labels.length;
        assert.ok(totalElements > 0, `Chart type ${type} produced zero visual elements`);

        // Coordinate integrity check: no NaN in paths or shapes
        for (const r of scene.rects) {
          assert.ok(!isNaN(r.x), `NaN x in rect for ${type}`);
          assert.ok(!isNaN(r.y), `NaN y in rect for ${type}`);
          assert.ok(!isNaN(r.w), `NaN w in rect for ${type}`);
          assert.ok(!isNaN(r.h), `NaN h in rect for ${type}`);
        }
        for (const p of scene.paths) {
          assert.ok(!p.d.includes("NaN"), `NaN in path d for ${type}: ${p.d}`);
        }
      });
    }

    it("handles dark ground mode properly", () => {
      const snapshot = makeSnapshot("sankey", { ground: "dark" });
      const scene = buildScene(snapshot);
      assert.ok(scene.paths.length > 0 || scene.rects.length > 0);
    });

    it("handles empty data gracefully without throwing", () => {
      const snapshot: ChartSnapshot = {
        name: "Empty Sankey",
        chartType: "sankey",
        engine: "builtin",
        sheets: {
          flows: { name: "Flows", cols: ["S", "T", "V"], types: ["text", "text", "number"], rows: [] },
          segments: { name: "Segments", cols: ["Cat", "M1"], types: ["text", "number"], rows: [] },
        },
        mapping: { ...DEFAULT_MAPPING, flow: { s: 0, t: 1, v: 2 }, matrix: { label: 0, measures: [1] } },
        style: DEFAULT_STYLE,
      };

      const scene = buildScene(snapshot);
      assert.equal(scene.vb, "0 0 760 430");
    });
  });

  describe("sceneToSvg", () => {
    it("converts scene to well-formed SVG string", () => {
      const snapshot = makeSnapshot("sankey", { title: "Revenue Flow", subtitle: "Q3 2026" });
      const scene = buildScene(snapshot);
      const svg = sceneToSvg(snapshot, scene);

      assert.ok(typeof svg === "string");
      assert.ok(svg.startsWith("<svg"));
      assert.ok(svg.endsWith("</svg>"));
      assert.ok(svg.includes('viewBox="0 0 816 534"'));
      assert.ok(svg.includes("Revenue Flow"));
      assert.ok(svg.includes("Q3 2026"));
      assert.ok(!svg.includes("NaN"));
    });
  });
});
