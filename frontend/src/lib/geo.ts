import type { LatLng } from "./types";

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km?: number | null): string {
  if (km == null) return "—";
  if (km < 1) return `${Math.round(km * 1000)} מ׳`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ק״מ`;
}

/** Rough travel-time estimate (straight line × road factor). */
export function travelEstimate(km?: number | null): { walkMin: number; driveMin: number } | null {
  if (km == null) return null;
  const road = km * 1.3;
  return {
    walkMin: Math.max(1, Math.round((road / 4.8) * 60)),
    driveMin: Math.max(2, Math.round((road / 32) * 60 + 3)),
  };
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} דק׳`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} ש׳ ${r} דק׳` : `${h} ש׳`;
}

/** Short human-friendly travel line: walk when close, drive otherwise. */
export function travelLine(km?: number | null): string {
  const t = travelEstimate(km);
  if (!t || km == null) return "";
  if (km <= 1.5) return `🚶 ${formatMinutes(t.walkMin)}`;
  if (km <= 4) return `🚶 ${formatMinutes(t.walkMin)} · 🚗 ${formatMinutes(t.driveMin)}`;
  return `🚗 ${formatMinutes(t.driveMin)}`;
}

/** Accepts "48.2,16.37" or a Google Maps URL containing @lat,lng or q=lat,lng */
export function parseLatLng(text: string): LatLng | null {
  const m = text.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export const priceLabel = (p?: number | null) => (p == null ? "" : p === 0 ? "חינם" : "$".repeat(p));

/** Distance when both points are known, else null. */
export function distanceOrNull(a: LatLng | null, b: { lat: number | null; lng: number | null }): number | null {
  if (!a || b.lat == null || b.lng == null) return null;
  return distanceKm(a, { lat: b.lat, lng: b.lng });
}
