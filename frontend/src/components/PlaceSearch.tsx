"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDistance } from "@/lib/geo";
import type { Place } from "@/lib/types";
import { useApp } from "./AppProvider";

/** Search box backed by Google Places text search. */
export default function PlaceSearch({
  placeholder,
  onPick,
}: {
  placeholder: string;
  onPick: (p: Place) => void;
}) {
  const { origin } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  // rounded so GPS jitter doesn't re-trigger the search
  const oLat = origin ? origin.lat.toFixed(2) : "";
  const oLng = origin ? origin.lng.toFixed(2) : "";

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q.trim() });
        if (oLat && oLng) {
          params.set("lat", oLat);
          params.set("lng", oLng);
        }
        setResults(await api<Place[]>(`/places/search?${params}`));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [q, oLat, oLng]);

  return (
    <div className="search">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {loading && <div className="search-hint">מחפש…</div>}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((p) => (
            <li key={p.place_id}>
              <button
                type="button"
                onClick={() => {
                  onPick(p);
                  setQ("");
                  setResults([]);
                }}
              >
                <strong>{p.name}</strong>
                <span className="muted">
                  {p.address}
                  {p.distance_km != null && ` · ${formatDistance(p.distance_km)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
