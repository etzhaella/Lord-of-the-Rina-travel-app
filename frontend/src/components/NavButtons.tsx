"use client";

import { googleMapsAddressUrl, googleMapsUrl, wazeAddressUrl } from "@/lib/navigate";
import { useApp } from "./AppProvider";

/**
 * Two ways to navigate to the same place: Waze or Google Maps.
 * Uses coordinates when known, otherwise the address text.
 */
export default function NavButtons({
  lat,
  lng,
  name,
  address,
  placeId,
  small = false,
  wazeLabel = "Waze",
}: {
  lat?: number | null;
  lng?: number | null;
  name: string;
  address?: string | null;
  placeId?: string | null;
  small?: boolean;
  wazeLabel?: string;
}) {
  const { navigateTo } = useApp();
  const sm = small ? " sm" : "";
  const hasCoords = lat != null && lng != null;
  const query = address ? `${name}, ${address}` : name;

  return (
    <>
      {hasCoords ? (
        <button type="button" className={`btn btn-waze${sm}`} onClick={() => navigateTo(lat!, lng!, name)}>
          🚗 {wazeLabel}
        </button>
      ) : (
        <a className={`btn btn-waze${sm}`} href={wazeAddressUrl(query)} target="_blank" rel="noopener">
          🚗 {wazeLabel}
        </a>
      )}
      <a
        className={`btn btn-gmaps${sm}`}
        href={hasCoords ? googleMapsUrl(lat!, lng!, placeId) : googleMapsAddressUrl(query)}
        target="_blank"
        rel="noopener"
        aria-label={`ניווט ב-Google Maps אל ${name}`}
      >
        🗺️ Google Maps
      </a>
    </>
  );
}
