"use client";

import { googleMapsUrl } from "@/lib/navigate";
import { useApp } from "./AppProvider";

/** Two ways to navigate to the same place: Waze or Google Maps. */
export default function NavButtons({
  lat,
  lng,
  name,
  placeId,
  small = false,
  wazeLabel = "Waze",
}: {
  lat: number;
  lng: number;
  name: string;
  placeId?: string | null;
  small?: boolean;
  wazeLabel?: string;
}) {
  const { navigateTo } = useApp();
  const sm = small ? " sm" : "";
  return (
    <>
      <button type="button" className={`btn btn-waze${sm}`} onClick={() => navigateTo(lat, lng, name)}>
        🚗 {wazeLabel}
      </button>
      <a
        className={`btn btn-gmaps${sm}`}
        href={googleMapsUrl(lat, lng, placeId)}
        target="_blank"
        rel="noopener"
        aria-label={`ניווט ב-Google Maps אל ${name}`}
      >
        🗺️ Google Maps
      </a>
    </>
  );
}
