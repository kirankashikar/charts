import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canView,
  normalizeChartType,
  normalizeEngine,
  normalizeMapping,
  normalizeSheets,
  normalizeStyle,
  parseAccess,
  snapshotFromJson,
  toClientChart,
  toSnapshot,
} from "../src/lib/charts";
import { DEFAULT_SHEETS, DEFAULT_STYLE } from "../src/lib/chart-types";

describe("charts lib", () => {
  describe("normalizeChartType", () => {
    it("preserves valid chart types", () => {
      assert.equal(normalizeChartType("sankey"), "sankey");
      assert.equal(normalizeChartType("radar"), "radar");
      assert.equal(normalizeChartType("sunburst"), "sunburst");
      assert.equal(normalizeChartType("treemap"), "treemap");
      assert.equal(normalizeChartType("chord"), "chord");
      assert.equal(normalizeChartType("parallel"), "parallel");
      assert.equal(normalizeChartType("marimekko"), "marimekko");
    });

    it("falls back to sankey for unknown types or invalid values", () => {
      assert.equal(normalizeChartType("unknown_chart"), "sankey");
      assert.equal(normalizeChartType(null), "sankey");
      assert.equal(normalizeChartType(123), "sankey");
    });

    it("passes an empty string through as-is — it means no type chosen yet", () => {
      assert.equal(normalizeChartType(""), "");
    });
  });

  describe("normalizeEngine", () => {
    it("accepts supported engines", () => {
      assert.equal(normalizeEngine("builtin"), "builtin");
      assert.equal(normalizeEngine("echarts"), "echarts");
      assert.equal(normalizeEngine("plotly"), "plotly");
      assert.equal(normalizeEngine("d3"), "d3");
    });

    it("falls back to builtin for unsupported engine", () => {
      assert.equal(normalizeEngine("highcharts"), "builtin");
      assert.equal(normalizeEngine(null), "builtin");
      assert.equal(normalizeEngine(undefined), "builtin");
    });
  });

  describe("normalizeSheets", () => {
    it("provides defaults when sheets are empty or undefined", () => {
      const sheets = normalizeSheets(undefined);
      assert.equal(sheets.flows.name, "Flows");
      assert.deepEqual(sheets.flows.cols, DEFAULT_SHEETS.flows.cols);
      assert.deepEqual(sheets.segments.cols, DEFAULT_SHEETS.segments.cols);
    });

    it("sanitizes column names and row values", () => {
      const input = {
        flows: {
          name: "Custom Flows",
          cols: ["Source", "Target", "Value"],
          types: ["text", "text", "number"],
          rows: [
            ["A", "B", "100"],
            ["B", "C", "50"],
          ],
        },
      };
      const sheets = normalizeSheets(input);
      assert.equal(sheets.flows.name, "Custom Flows");
      assert.equal(sheets.flows.rows.length, 2);
      assert.deepEqual(sheets.flows.rows[0], ["A", "B", "100"]);
    });

    it("filters invalid column types to text", () => {
      const input = {
        flows: {
          name: "Flows",
          cols: ["Col1", "Col2"],
          types: ["invalid_type", "number"],
          rows: [["a", "1"]],
        },
      };
      const sheets = normalizeSheets(input);
      assert.equal(sheets.flows.types[0], "text");
      assert.equal(sheets.flows.types[1], "number");
    });
  });

  describe("normalizeMapping", () => {
    it("clamps column indices within sheet column bounds", () => {
      const sheets = normalizeSheets(undefined);
      const mapping = normalizeMapping(
        {
          flow: { s: 0, t: 1, v: 999 }, // 999 out of bounds
          matrix: { label: 50, measures: [1, 2, 999] },
        },
        sheets
      );
      assert.ok(mapping.flow.v < sheets.flows.cols.length);
      assert.ok(mapping.matrix.label < sheets.segments.cols.length);
    });
  });

  describe("normalizeStyle", () => {
    it("validates palette selection and clamps fillAlpha", () => {
      const style = normalizeStyle({
        palette: "ink",
        fillAlpha: 1.5, // should clamp to 1
        ground: "dark",
      });
      assert.equal(style.palette, "ink");
      assert.equal(style.fillAlpha, 1);
      assert.equal(style.ground, "dark");
    });

    it("falls back to default palette for invalid palette name", () => {
      const style = normalizeStyle({ palette: "nonexistent" });
      assert.equal(style.palette, DEFAULT_STYLE.palette);
    });

    it("filters valid hex colors for custom palette", () => {
      const style = normalizeStyle({
        palette: "custom",
        customColors: ["#ff0000", "#123456", "invalid_color", "#fff"],
      });
      assert.deepEqual(style.customColors, ["#ff0000", "#123456", "#fff"]);
    });
  });

  describe("canView access control", () => {
    const ownerId = "owner-1";
    const ownerEmail = "kiran@fluidpalette.com";

    it("allows the owner to view regardless of access mode", () => {
      assert.equal(canView("PRIVATE", ownerEmail, ownerId, ownerId, ownerEmail), true);
      assert.equal(canView("WORKSPACE", ownerEmail, ownerId, ownerId, ownerEmail), true);
      assert.equal(canView("LINK", ownerEmail, ownerId, ownerId, ownerEmail), true);
    });

    it("allows anyone with link when access is LINK", () => {
      assert.equal(canView("LINK", ownerEmail, ownerId, "viewer-2", "anyone@external.com"), true);
      assert.equal(canView("LINK", ownerEmail, ownerId, null, null), true);
    });

    it("restricts PRIVATE charts from non-owners", () => {
      assert.equal(canView("PRIVATE", ownerEmail, ownerId, "viewer-2", "other@fluidpalette.com"), false);
      assert.equal(canView("PRIVATE", ownerEmail, ownerId, null, null), false);
    });

    it("allows WORKSPACE viewers with matching email domain", () => {
      const sameDomainViewer = "colleague@fluidpalette.com";
      const differentDomainViewer = "user@otherdomain.com";

      assert.equal(canView("WORKSPACE", ownerEmail, ownerId, "viewer-3", sameDomainViewer), true);
      assert.equal(canView("WORKSPACE", ownerEmail, ownerId, "viewer-4", differentDomainViewer), false);
      assert.equal(canView("WORKSPACE", ownerEmail, ownerId, null, null), false);
    });
  });

  describe("parseAccess", () => {
    it("parses enum keys and UI labels", () => {
      assert.equal(parseAccess("LINK"), "LINK");
      assert.equal(parseAccess("Anyone with link"), "LINK");
      assert.equal(parseAccess("WORKSPACE"), "WORKSPACE");
      assert.equal(parseAccess("My workspace"), "WORKSPACE");
      assert.equal(parseAccess("PRIVATE"), "PRIVATE");
      assert.equal(parseAccess("Only me"), "PRIVATE");
      assert.equal(parseAccess("UNKNOWN"), null);
    });
  });

  describe("snapshot conversions", () => {
    it("converts client chart to snapshot and back", () => {
      const clientChart = toClientChart({
        id: "c1",
        userId: "u1",
        name: "Test Chart",
        chartType: "sankey",
        shell: "split",
        engine: "builtin",
        sheets: JSON.parse(JSON.stringify(DEFAULT_SHEETS)),
        mapping: { flow: { s: 0, t: 1, v: 2 }, matrix: { label: 0, measures: [1, 2] } },
        style: JSON.parse(JSON.stringify(DEFAULT_STYLE)),
        access: "LINK",
        embed: "viewer",
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const snapshot = toSnapshot(clientChart);
      assert.equal(snapshot.name, "Test Chart");
      assert.equal(snapshot.chartType, "sankey");

      const validated = snapshotFromJson(snapshot);
      assert.equal(validated.name, "Test Chart");
      assert.equal(validated.chartType, "sankey");
    });
  });
});
