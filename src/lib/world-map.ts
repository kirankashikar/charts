import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, MultiPoint } from "geojson";
// 110m resolution (Natural Earth, public domain via the world-atlas package)
// — plenty of detail for a chart-sized preview at a fraction of the weight
// of the 50m/10m files also shipped in that package.
import worldTopo from "world-atlas/countries-110m.json";
// US states specifically — there is no similarly small, well-maintained
// open-source package covering every country's states/provinces globally
// (only US-atlas, from the same source as world-atlas), so "state" scope
// is US-only for now.
import usTopo from "us-atlas/states-10m.json";

/** The box every geo chart projects into, in buildScene's 760×430 space. */
export const GEO_BOX = { x: 20, y: 20, w: 720, h: 380 };

const worldFeatures = feature(
  worldTopo as unknown as Topology,
  (worldTopo as unknown as Topology).objects.countries as GeometryCollection
) as unknown as FeatureCollection;

const usStateFeatures = feature(
  usTopo as unknown as Topology,
  (usTopo as unknown as Topology).objects.states as GeometryCollection
) as unknown as FeatureCollection;

export type RegionLevel = "country" | "usState";

/** A handful of common name variants the atlas spells differently than a
 *  user typically would (e.g. pasting "USA" or "South Korea"). Not
 *  exhaustive — exact and substring matches against the atlas name already
 *  cover most real input. */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states of america",
  us: "united states of america",
  "united states": "united states of america",
  uk: "united kingdom",
  "great britain": "united kingdom",
  "south korea": "korea, rep.",
  "north korea": "dem. rep. korea",
  russia: "russian federation",
  "czech republic": "czechia",
  drc: "dem. rep. congo",
  "ivory coast": "côte d'ivoire",
  vietnam: "viet nam",
  laos: "lao pdr",
  syria: "syrian arab republic",
  iran: "iran (islamic republic of)",
  tanzania: "united republic of tanzania",
};

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function findRegion(features: Feature[], name: string): Feature | null {
  const target = normalizeName(name);
  const aliased = COUNTRY_ALIASES[target] ?? target;
  for (const candidate of [target, aliased]) {
    const exact = features.find((f) => normalizeName(String(f.properties?.name ?? "")) === candidate);
    if (exact) return exact;
  }
  const partial = features.find((f) => {
    const n = normalizeName(String(f.properties?.name ?? ""));
    return n.includes(target) || target.includes(n);
  });
  return partial ?? null;
}

/** Looks up a country or US state by name (case-insensitive, tolerant of a
 *  few common aliases and substrings). Returns null if nothing matched. */
export function findNamedRegion(name: string, level: RegionLevel): Feature | null {
  return findRegion(level === "usState" ? usStateFeatures.features : worldFeatures.features, name);
}

export interface ChoroplethLayer {
  /** Every region at this level, unfilled — the backdrop matched regions
   *  sit on top of, so an unmatched neighbor still reads as part of the
   *  map rather than a gap. */
  basePaths: string[];
  matchedPaths: { d: string; value: number; place: string; centroid: [number, number] }[];
  spherePath: string;
  graticulePath: string;
}

/** Same fit-to-what-matters idea as buildGeoLayer, but for named regions
 *  instead of lat/lon points: zooms to the matched regions' actual shapes
 *  (no coordinates needed from the data) rather than always showing the
 *  whole world or all fifty states for a chart that highlights three. */
export function buildChoroplethLayer(
  matches: { feature: Feature; value: number; place: string }[],
  level: RegionLevel,
  zoom: number
): ChoroplethLayer {
  const baseFeatures = level === "usState" ? usStateFeatures.features : worldFeatures.features;
  const matchedFeatures = matches.map((m) => m.feature);
  const useMatchedFit = zoom > 0 && matchedFeatures.length > 0;
  const pad = useMatchedFit ? Math.min(80, 20 * zoom) : 0;
  const box: [[number, number], [number, number]] = [
    [GEO_BOX.x + pad, GEO_BOX.y + pad],
    [GEO_BOX.x + GEO_BOX.w - pad, GEO_BOX.y + GEO_BOX.h - pad],
  ];
  const extent: FeatureCollection | { type: "Sphere" } = useMatchedFit
    ? { type: "FeatureCollection", features: matchedFeatures }
    : level === "usState"
      ? { type: "FeatureCollection", features: baseFeatures }
      : { type: "Sphere" };

  const projection = geoNaturalEarth1().fitExtent(box, extent);
  const path = geoPath(projection);

  return {
    basePaths: baseFeatures.map((f) => path(f)).filter((d): d is string => Boolean(d)),
    matchedPaths: matches
      .map((m) => ({ d: path(m.feature) ?? "", value: m.value, place: m.place, centroid: path.centroid(m.feature) }))
      .filter((m) => m.d),
    spherePath: level === "usState" ? "" : (path({ type: "Sphere" }) ?? ""),
    graticulePath: path(geoGraticule10()) ?? "",
  };
}

export interface GeoLayer {
  countryPaths: string[];
  spherePath: string;
  graticulePath: string;
  /** Projects a lat/lon pair into this layer's fitted coordinate space. */
  project: (lat: number, lon: number) => [number, number] | null;
}

/**
 * Builds a basemap fitted either to the whole world (zoom 0 / no points) or
 * to a padded box around the given points — so a cluster of cities in one
 * city gets a legible close-up instead of eight overlapping labels lost in
 * a full world map. `zoom` scales the padding around that data box: 1 is
 * the default fit, below 1 is tighter, above 1 backs further out.
 */
export function buildGeoLayer(points: [number, number][], zoom: number): GeoLayer {
  const extent: FeatureCollection | { type: "Sphere" } =
    zoom <= 0 || points.length === 0 ? { type: "Sphere" } : { type: "FeatureCollection", features: [focusFeature(points, zoom)] };

  const projection = geoNaturalEarth1().fitExtent(
    [
      [GEO_BOX.x, GEO_BOX.y],
      [GEO_BOX.x + GEO_BOX.w, GEO_BOX.y + GEO_BOX.h],
    ],
    extent
  );
  const path = geoPath(projection);

  return {
    countryPaths: worldFeatures.features.map((f) => path(f)).filter((d): d is string => Boolean(d)),
    spherePath: path({ type: "Sphere" }) ?? "",
    graticulePath: path(geoGraticule10()) ?? "",
    project: (lat: number, lon: number) => {
      const p = projection([lon, lat]);
      return p ? [p[0], p[1]] : null;
    },
  };
}

/** A padded bounding box around the given lat/lon points, as a GeoJSON
 *  feature `fitExtent` can size a projection against. Floors the box at a
 *  minimum span so a single point (or a tight cluster) doesn't zoom in to a
 *  meaningless close-up with no surrounding context. */
function focusFeature(points: [number, number][], zoom: number) {
  const lats = points.map((p) => p[0]);
  const lons = points.map((p) => p[1]);
  const latSpan = Math.max(8, (Math.max(...lats) - Math.min(...lats)) * 1.5) * zoom;
  const lonSpan = Math.max(8, (Math.max(...lons) - Math.min(...lons)) * 1.5) * zoom;
  const latMid = (Math.max(...lats) + Math.min(...lats)) / 2;
  const lonMid = (Math.max(...lons) + Math.min(...lons)) / 2;
  const coordinates: MultiPoint["coordinates"] = [
    [lonMid - lonSpan / 2, Math.max(-89, latMid - latSpan / 2)],
    [lonMid + lonSpan / 2, Math.min(89, latMid + latSpan / 2)],
  ];
  return { type: "Feature" as const, properties: {}, geometry: { type: "MultiPoint" as const, coordinates } };
}
