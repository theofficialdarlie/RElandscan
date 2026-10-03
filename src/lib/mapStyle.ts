import type { StyleSpecification } from "maplibre-gl";

/** Free, key-less basemaps: OpenStreetMap streets and Esri satellite imagery. */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    streets: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
    satellite: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [
    { id: "streets", type: "raster", source: "streets" },
    { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" } },
  ],
};

/** Roughly the Klang Valley: KL, Putrajaya and surrounding Selangor districts. */
export const KLANG_VALLEY_BOUNDS: [[number, number], [number, number]] = [
  [100.95, 2.6],
  [102.0, 3.65],
];
export const KL_CENTER: [number, number] = [101.6869, 3.139];
