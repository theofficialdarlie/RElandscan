import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as MlMap } from "maplibre-gl";
import { KLANG_VALLEY_BOUNDS, KL_CENTER, MAP_STYLE } from "./lib/mapStyle";
import { centroid, polygonAreaM2, type LngLat } from "./lib/geo";
import { fetchSiteData, type SiteData } from "./lib/osm";
import SearchBox from "./components/SearchBox";
import SiteReport from "./components/SiteReport";
import Feasibility from "./components/Feasibility";

type Mode = "inspect" | "draw";
type Basemap = "streets" | "satellite";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function siteGeoJSON(vertices: LngLat[], closed: boolean): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = vertices.map((v) => ({
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: v },
  }));
  if (closed && vertices.length >= 3) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[...vertices, vertices[0]]] },
    });
  } else if (vertices.length >= 2) {
    features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: vertices } });
  }
  return { type: "FeatureCollection", features };
}

function placesGeoJSON(point: LngLat | null, data: SiteData | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const add = (kind: string) => (p: { position: LngLat }) =>
    features.push({ type: "Feature", properties: { kind }, geometry: { type: "Point", coordinates: p.position } });
  data?.stations.forEach(add("station"));
  data?.amenities.forEach(add("amenity"));
  if (point) {
    features.push({ type: "Feature", properties: { kind: "selected" }, geometry: { type: "Point", coordinates: point } });
  }
  return { type: "FeatureCollection", features };
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const modeRef = useRef<Mode>("inspect");
  const abortRef = useRef<AbortController | null>(null);

  const [mode, setMode] = useState<Mode>("inspect");
  const [basemap, setBasemap] = useState<Basemap>("streets");
  const [vertices, setVertices] = useState<LngLat[]>([]);
  const [siteClosed, setSiteClosed] = useState(false);
  const [point, setPoint] = useState<LngLat | null>(null);
  const [data, setData] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  modeRef.current = mode;

  const inspect = useCallback(async (p: LngLat) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPoint(p);
    setData(null);
    setError(null);
    setLoading(true);
    try {
      setData(await fetchSiteData(p, controller.signal));
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(
        e instanceof TypeError
          ? "Couldn't reach OpenStreetMap. Check your connection and try again."
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: MAP_STYLE,
      center: KL_CENTER,
      zoom: 11,
      maxBounds: KLANG_VALLEY_BOUNDS,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
    map.doubleClickZoom.disable();

    map.on("load", () => {
      map.addSource("site", { type: "geojson", data: EMPTY });
      map.addLayer({ id: "site-fill", type: "fill", source: "site", filter: ["==", "$type", "Polygon"], paint: { "fill-color": "#f97316", "fill-opacity": 0.25 } });
      map.addLayer({ id: "site-line", type: "line", source: "site", filter: ["!=", "$type", "Point"], paint: { "line-color": "#ea580c", "line-width": 2.5 } });
      map.addLayer({ id: "site-vertex", type: "circle", source: "site", filter: ["==", "$type", "Point"], paint: { "circle-radius": 4, "circle-color": "#fff", "circle-stroke-color": "#ea580c", "circle-stroke-width": 2 } });

      map.addSource("places", { type: "geojson", data: EMPTY });
      map.addLayer({
        id: "places",
        type: "circle",
        source: "places",
        paint: {
          "circle-radius": ["match", ["get", "kind"], "selected", 8, "station", 6, 4],
          "circle-color": ["match", ["get", "kind"], "selected", "#dc2626", "station", "#2563eb", "#16a34a"],
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
    });

    map.on("click", (e) => {
      const p: LngLat = [e.lngLat.lng, e.lngLat.lat];
      if (modeRef.current === "draw") setVertices((v) => [...v, p]);
      else void inspect(p);
    });

    return () => {
      abortRef.current?.abort();
      map.remove();
    };
  }, [inspect]);

  useEffect(() => {
    (mapRef.current?.getSource("site") as GeoJSONSource | undefined)?.setData(siteGeoJSON(vertices, siteClosed));
  }, [vertices, siteClosed]);

  useEffect(() => {
    (mapRef.current?.getSource("places") as GeoJSONSource | undefined)?.setData(placesGeoJSON(point, data));
  }, [point, data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    map.setLayoutProperty("satellite", "visibility", basemap === "satellite" ? "visible" : "none");
  }, [basemap]);

  useEffect(() => {
    mapRef.current?.getCanvas().style.setProperty("cursor", mode === "draw" ? "crosshair" : "");
  }, [mode]);

  const startDrawing = () => {
    setVertices([]);
    setSiteClosed(false);
    setMode("draw");
  };

  const finishDrawing = () => {
    if (vertices.length < 3) return;
    setSiteClosed(true);
    setMode("inspect");
    void inspect(centroid(vertices));
  };

  const clearSite = () => {
    setVertices([]);
    setSiteClosed(false);
    setMode("inspect");
  };

  const flyTo = (p: LngLat, zoom = 16) => mapRef.current?.flyTo({ center: p, zoom });

  const siteAreaM2 = siteClosed ? polygonAreaM2(vertices) : 0;

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <h1>RElandscan</h1>
          <p className="tagline">Land intelligence for the Klang Valley</p>
        </header>

        <SearchBox
          onSelect={(p) => {
            flyTo(p);
            void inspect(p);
          }}
        />

        <div className="toolbar">
          {mode === "draw" ? (
            <>
              <button className="primary" onClick={finishDrawing} disabled={vertices.length < 3}>
                Finish site ({vertices.length} points)
              </button>
              <button onClick={clearSite}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={startDrawing}>{siteClosed ? "Redraw site" : "Draw site boundary"}</button>
              {siteClosed && <button onClick={clearSite}>Clear site</button>}
            </>
          )}
          <button onClick={() => setBasemap((b) => (b === "streets" ? "satellite" : "streets"))}>
            {basemap === "streets" ? "Satellite" : "Streets"}
          </button>
        </div>
        {mode === "draw" && <p className="hint">Click on the map to outline the land, then press Finish.</p>}

        <SiteReport point={point} data={data} loading={loading} error={error} siteAreaM2={siteAreaM2} onFocus={flyTo} />
        <Feasibility siteAreaM2={siteAreaM2} />

        <footer>
          Map data © OpenStreetMap contributors. Information is indicative only. Always confirm with the land
          office, local council and a registered surveyor before making decisions.
        </footer>
      </aside>
      <div ref={containerRef} className="map" />
    </div>
  );
}
