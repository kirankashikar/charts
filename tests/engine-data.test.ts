import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hierarchyData, matrixSeries, nodeLinkData } from "../src/lib/engine-data";
import { DEFAULT_SHEETS, DEFAULT_STYLE, ChartSnapshot } from "../src/lib/chart-types";

describe("engine-data lib", () => {
  const baseSnapshot: ChartSnapshot = {
    name: "Test",
    chartType: "sankey",
    engine: "builtin",
    sheets: DEFAULT_SHEETS,
    mapping: {
      flow: { s: 0, t: 1, v: 2 },
      matrix: { label: 0, measures: [1, 2, 3] },
    },
    style: DEFAULT_STYLE,
  };

  describe("nodeLinkData", () => {
    it("extracts unique nodes and links from flows", () => {
      const { nodes, links } = nodeLinkData(baseSnapshot);

      assert.ok(nodes.length > 0);
      assert.ok(links.length > 0);

      // Verify all link sources and targets are in nodes list
      for (const link of links) {
        assert.ok(nodes.includes(link.source));
        assert.ok(nodes.includes(link.target));
        assert.ok(typeof link.value === "number");
        assert.ok(link.value >= 0);
      }

      // Check uniqueness of nodes
      const uniqueNodes = new Set(nodes);
      assert.equal(nodes.length, uniqueNodes.size);
    });
  });

  describe("hierarchyData", () => {
    it("builds a root node with categorized children", () => {
      const hierarchy = hierarchyData(baseSnapshot);

      assert.equal(hierarchy.name, "Total");
      assert.ok(Array.isArray(hierarchy.children));
      assert.ok(hierarchy.children.length > 0);

      for (const parent of hierarchy.children) {
        assert.ok(parent.name);
        assert.ok(Array.isArray(parent.children));
        assert.ok(parent.children.length > 0);
        for (const child of parent.children) {
          assert.ok(child.name);
          assert.ok(typeof child.value === "number");
        }
      }
    });

    it("sorts parents descending when sortDesc is true", () => {
      const sortedSnapshot = {
        ...baseSnapshot,
        style: { ...DEFAULT_STYLE, sortDesc: true },
      };
      const hierarchy = hierarchyData(sortedSnapshot);
      const totals = (hierarchy.children ?? []).map((c) =>
        (c.children ?? []).reduce((sum, item) => sum + (item.value ?? 0), 0)
      );

      for (let i = 0; i < totals.length - 1; i++) {
        assert.ok(totals[i] >= totals[i + 1], "Children are not sorted in descending order");
      }
    });
  });

  describe("matrixSeries", () => {
    it("extracts axes, rows and computes max value", () => {
      const matrix = matrixSeries(baseSnapshot);

      assert.ok(Array.isArray(matrix.axes));
      assert.ok(matrix.axes.length > 0);
      assert.ok(Array.isArray(matrix.rows));
      assert.ok(matrix.rows.length > 0);
      assert.ok(typeof matrix.max === "number");
      assert.ok(matrix.max > 0);

      for (const row of matrix.rows) {
        assert.ok(row.label);
        assert.equal(row.vals.length, matrix.axes.length);
        for (const val of row.vals) {
          assert.ok(!isNaN(val));
          assert.ok(val <= matrix.max);
        }
      }
    });
  });
});
