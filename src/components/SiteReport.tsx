import { findCouncil } from "../lib/councils";
import { formatDistance, M2_PER_ACRE, SQFT_PER_M2, type LngLat } from "../lib/geo";
import type { Place, SiteData } from "../lib/osm";

interface Props {
  point: LngLat | null;
  data: SiteData | null;
  loading: boolean;
  error: string | null;
  siteAreaM2: number;
  onFocus: (p: LngLat) => void;
}

const LANDUSE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  retail: "Retail",
  industrial: "Industrial",
  construction: "Under construction",
  farmland: "Farmland",
  orchard: "Orchard / plantation",
  forest: "Forest",
  grass: "Grass / open space",
  recreation_ground: "Recreation ground",
  cemetery: "Cemetery",
  religious: "Religious",
  military: "Military",
  brownfield: "Brownfield",
  greenfield: "Greenfield",
};

function PlaceList({ places, empty, onFocus }: { places: Place[]; empty: string; onFocus: (p: LngLat) => void }) {
  if (places.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="places">
      {places.slice(0, 8).map((p) => (
        <li key={`${p.kind}-${p.name}`}>
          <button onClick={() => onFocus(p.position)}>
            <span className="tag">{p.kind}</span> {p.name}
          </button>
          <span className="distance">{formatDistance(p.distanceM)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SiteReport({ point, data, loading, error, siteAreaM2, onFocus }: Props) {
  if (!point) {
    return (
      <section className="card">
        <h2>Site report</h2>
        <p className="muted">
          Click anywhere on the map, or draw a site boundary, to see the location's council, current land use,
          transit access, nearby amenities and flood indicators.
        </p>
      </section>
    );
  }

  const council = data ? findCouncil(data.boundaries.map((b) => b.name)) : undefined;
  const nearestStation = data?.stations[0];

  return (
    <section className="card">
      <h2>Site report</h2>
      <p className="coords">
        {point[1].toFixed(5)}, {point[0].toFixed(5)}
      </p>

      {siteAreaM2 > 0 && (
        <div className="stat-row">
          <div className="stat">
            <span className="stat-value">{Math.round(siteAreaM2 * SQFT_PER_M2).toLocaleString("en-MY")}</span>
            <span className="stat-label">sq ft</span>
          </div>
          <div className="stat">
            <span className="stat-value">{(siteAreaM2 / M2_PER_ACRE).toFixed(2)}</span>
            <span className="stat-label">acres</span>
          </div>
          <div className="stat">
            <span className="stat-value">{Math.round(siteAreaM2).toLocaleString("en-MY")}</span>
            <span className="stat-label">m²</span>
          </div>
        </div>
      )}

      {loading && <p className="muted">Pulling data from OpenStreetMap…</p>}
      {error && <p className="error">{error}</p>}

      {data && (
        <>
          {data.address && <p>{data.address}</p>}

          <h3>Local authority</h3>
          {council ? (
            <p>
              <strong>{council.code}</strong>: {council.name}, {council.state}
              <br />
              Zoning, plot ratio and density are set in this council's local plan (Rancangan Tempatan).{" "}
              <a href={council.website} target="_blank" rel="noreferrer">
                Council website ↗
              </a>
            </p>
          ) : (
            <p className="muted">
              Outside the councils we cover so far
              {data.boundaries.length > 0 && ` (${data.boundaries.map((b) => b.name).join(", ")})`}.
            </p>
          )}

          <h3>Current land use</h3>
          <p>
            {data.landuse.length > 0
              ? data.landuse.map((l) => LANDUSE_LABELS[l] ?? l).join(", ")
              : "Not mapped"}
            <br />
            <span className="muted small">From OpenStreetMap, showing what's there today. This is not the official zoning.</span>
          </p>

          <h3>Transit (within 2 km)</h3>
          {nearestStation && (
            <p>
              Nearest: <strong>{nearestStation.name}</strong> ({nearestStation.kind}),{" "}
              {formatDistance(nearestStation.distanceM)} straight-line
            </p>
          )}
          <PlaceList places={data.stations} empty="No rail stations within 2 km." onFocus={onFocus} />

          <h3>Amenities (within 1.5 km)</h3>
          <PlaceList places={data.amenities} empty="No schools, hospitals or malls mapped nearby." onFocus={onFocus} />

          <h3>Flood indicators</h3>
          {data.waterways.length > 0 ? (
            <p>
              ⚠️ Waterways within 300 m: {data.waterways.slice(0, 4).join(", ")}. Check the JPS flood maps and the
              site's flood history.
            </p>
          ) : (
            <p className="muted">No mapped rivers or drains within 300 m. This is only a rough proxy, not a flood assessment.</p>
          )}

          <h3>Still needed (offline)</h3>
          <ul className="todo">
            <li>Title search via the state land office (e-Tanah): owner, tenure, category of land use, restrictions</li>
            <li>Lot boundary and lot number from a certified plan (JUPEM)</li>
            <li>Zoning and plot ratio from the local plan</li>
            <li>Nearby transaction prices (NAPIC / JPPH)</li>
          </ul>
        </>
      )}
    </section>
  );
}
