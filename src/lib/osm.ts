import { distanceM, type LngLat } from "./geo";

export interface Place {
  name: string;
  kind: string;
  position: LngLat;
  distanceM: number;
}

export interface SiteData {
  address?: string;
  boundaries: { name: string; level: number }[];
  landuse: string[];
  stations: Place[];
  amenities: Place[];
  waterways: string[];
}

interface OverpassElement {
  type: "node" | "way" | "relation" | "area";
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

export function buildOverpassQuery([lng, lat]: LngLat): string {
  return `[out:json][timeout:25];
is_in(${lat},${lng})->.a;
area.a[boundary=administrative];
out tags;
area.a[landuse];
out tags;
(
  node(around:2000,${lat},${lng})[railway=station];
  nwr(around:1500,${lat},${lng})[amenity~"^(school|hospital|clinic|university|college)$"];
  nwr(around:1500,${lat},${lng})[shop=mall];
);
out center tags;
way(around:300,${lat},${lng})[waterway~"^(river|canal|stream|drain)$"];
out tags;`;
}

function amenityKind(tags: Record<string, string>): string | undefined {
  if (tags.shop === "mall") return "Mall";
  switch (tags.amenity) {
    case "school": return "School";
    case "university":
    case "college": return "University / college";
    case "hospital": return "Hospital";
    case "clinic": return "Clinic";
  }
  return undefined;
}

function stationKind(tags: Record<string, string>): string {
  const network = tags.network ?? tags.operator ?? "";
  if (/mrt/i.test(network) || tags.station === "subway") return "MRT";
  if (/lrt/i.test(network) || tags.station === "light_rail") return "LRT";
  if (/monorail/i.test(network) || tags.station === "monorail") return "Monorail";
  if (/ktm|komuter/i.test(network)) return "KTM";
  return "Rail";
}

export function parseOverpass(elements: OverpassElement[], origin: LngLat): Omit<SiteData, "address"> {
  const result: Omit<SiteData, "address"> = {
    boundaries: [],
    landuse: [],
    stations: [],
    amenities: [],
    waterways: [],
  };
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = tags["name:en"] ?? tags.name;

    if (el.type === "area") {
      if (tags.boundary === "administrative" && name) {
        result.boundaries.push({ name, level: Number(tags.admin_level ?? 99) });
      } else if (tags.landuse && !result.landuse.includes(tags.landuse)) {
        result.landuse.push(tags.landuse);
      }
      continue;
    }

    if (tags.waterway) {
      const label = tags.name ?? `Unnamed ${tags.waterway}`;
      if (!result.waterways.includes(label)) result.waterways.push(label);
      continue;
    }

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined || !name) continue;
    const position: LngLat = [lon, lat];

    if (tags.railway === "station") {
      const kind = stationKind(tags);
      const key = `station:${kind}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.stations.push({ name, kind, position, distanceM: distanceM(origin, position) });
      continue;
    }

    const kind = amenityKind(tags);
    if (kind) {
      const key = `amenity:${kind}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.amenities.push({ name, kind, position, distanceM: distanceM(origin, position) });
    }
  }

  result.boundaries.sort((a, b) => b.level - a.level);
  result.stations.sort((a, b) => a.distanceM - b.distanceM);
  result.amenities.sort((a, b) => a.distanceM - b.distanceM);
  return result;
}

export async function fetchSiteData(point: LngLat, signal?: AbortSignal): Promise<SiteData> {
  const [overpass, address] = await Promise.all([
    fetch(OVERPASS_URL, {
      method: "POST",
      body: new URLSearchParams({ data: buildOverpassQuery(point) }),
      signal,
    }).then((r) => {
      if (!r.ok) throw new Error(`OpenStreetMap lookup failed (${r.status}). Try again in a moment.`);
      return r.json() as Promise<{ elements: OverpassElement[] }>;
    }),
    reverseGeocode(point, signal).catch(() => undefined),
  ]);
  return { address, ...parseOverpass(overpass.elements, point) };
}

async function reverseGeocode([lng, lat]: LngLat, signal?: AbortSignal): Promise<string | undefined> {
  const url = `${NOMINATIM_URL}/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal, headers: { "Accept-Language": "en" } });
  if (!res.ok) return undefined;
  const json = (await res.json()) as { display_name?: string };
  return json.display_name;
}

export interface SearchResult {
  label: string;
  position: LngLat;
}

/** Place search limited to the Klang Valley. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "my",
    viewbox: "101.2,3.5,101.95,2.75",
    bounded: "1",
    limit: "6",
  });
  const res = await fetch(`${NOMINATIM_URL}/search?${params}`, { signal, headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const json = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return json.map((r) => ({ label: r.display_name, position: [Number(r.lon), Number(r.lat)] }));
}
