import { useState } from "react";
import { searchPlaces, type SearchResult } from "../lib/osm";
import type { LngLat } from "../lib/geo";

export default function SearchBox({ onSelect }: { onSelect: (p: LngLat) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("Searching…");
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      setStatus(found.length ? null : "No places found in the Klang Valley.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Search failed");
    }
  };

  return (
    <div className="search">
      <form onSubmit={submit}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a place, e.g. Bangsar South"
          aria-label="Search places"
        />
        <button type="submit">Go</button>
      </form>
      {status && <p className="muted">{status}</p>}
      {results.length > 0 && (
        <ul className="results">
          {results.map((r) => (
            <li key={r.label}>
              <button
                onClick={() => {
                  onSelect(r.position);
                  setResults([]);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
