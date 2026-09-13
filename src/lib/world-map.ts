import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { FeatureCollection } from "geojson";
// 110m resolution (Natural Earth, public domain via the world-atlas package)
// — plenty of detail for a chart-sized preview at a fraction of the weight
// of the 50m/10m files also shipped in that package.
import worldTopo from "world-atlas/countries-110m.json";

/** The box every geo chart projects into, in buildScene's 760×430 space. */
export const GEO_BOX = { x: 20, y: 20, w: 720, h: 380 };

const countries = feature(
  worldTopo as unknown as Topology,
  (worldTopo as unknown as Topology).objects.countries as GeometryCollection
) as unknown as FeatureCollection;

const projection = geoNaturalEarth1().fitExtent(
  [
    [GEO_BOX.x, GEO_BOX.y],
    [GEO_BOX.x + GEO_BOX.w, GEO_BOX.y + GEO_BOX.h],
  ],
  countries
);

const path = geoPath(projection);

/** One SVG path `d` string per country — computed once at module load since
 *  neither the atlas data nor the projection's fitted box ever changes. */
export const WORLD_COUNTRY_PATHS: string[] = countries.features
  .map((f) => path(f))
  .filter((d): d is string => Boolean(d));

/** The projection's outer boundary (its "ocean"), and a light reference
 *  graticule — both drawn under the countries. */
export const WORLD_SPHERE_PATH = path({ type: "Sphere" }) ?? "";
export const WORLD_GRATICULE_PATH = path(geoGraticule10()) ?? "";

/** Projects a lat/lon pair into the same fitted coordinate space as the
 *  country paths above, so plotted points and arcs line up with the map. */
export function projectLatLon(lat: number, lon: number): [number, number] | null {
  const p = projection([lon, lat]);
  return p ? [p[0], p[1]] : null;
}
