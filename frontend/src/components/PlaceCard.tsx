"use client";

import { useState } from "react";
import { photoUrl } from "@/lib/api";
import { subEmoji } from "@/lib/categories";
import { distanceKm, formatDistance, priceLabel, travelLine } from "@/lib/geo";
import type { Place } from "@/lib/types";
import { useApp } from "./AppProvider";

export function Photo({ name, category, alt }: { name?: string | null; category?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  const src = photoUrl(name);
  if (!src || failed)
    return (
      <div className="photo placeholder" aria-hidden>
        <span>{subEmoji(category)}</span>
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="photo" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export default function PlaceCard({ place, category }: { place: Place; category?: string }) {
  const { origin, isFavorite, toggleFavorite, isDestination, addDestination, navigateTo, openExpense, toast } = useApp();
  const fav = isFavorite(place.place_id);
  const planned = isDestination(place.place_id);
  const km = origin ? distanceKm(origin, place) : place.distance_km;

  const guard = (fn: () => Promise<void>) => () => fn().catch(() => toast("משהו השתבש, נסו שוב"));

  return (
    <article className="card place">
      <div className="place-media">
        <Photo name={place.photo_name} category={category} alt={place.name} />
        {km != null && <span className="badge-distance">{formatDistance(km)}</span>}
        {place.open_now != null && (
          <span className={`badge-open ${place.open_now ? "yes" : "no"}`}>{place.open_now ? "פתוח" : "סגור"}</span>
        )}
      </div>
      <div className="place-body">
        <h3>{place.name}</h3>
        <div className="meta">
          {place.rating != null && (
            <span className="rating">
              ★ {place.rating.toFixed(1)}
              {place.user_ratings_total != null && (
                <span className="muted"> ({place.user_ratings_total.toLocaleString()} ביקורות)</span>
              )}
            </span>
          )}
          {place.price_level != null && <span className="price">{priceLabel(place.price_level)}</span>}
        </div>
        {place.address && <p className="address">{place.address}</p>}
        {km != null && <p className="travel">{travelLine(km)}</p>}

        <div className="actions">
          <button className={`btn btn-fav ${fav ? "on" : ""}`} onClick={guard(() => toggleFavorite(place, category))}>
            {fav ? "❤️ במועדפים" : "🤍 Save to Favorites"}
          </button>
          <button className="btn btn-waze" onClick={() => navigateTo(place.lat, place.lng, place.name)}>
            🚗 Open in Waze
          </button>
        </div>
        <div className="actions secondary">
          <button
            className={`btn btn-ghost sm ${planned ? "on" : ""}`}
            disabled={planned}
            onClick={guard(() => addDestination(place, category))}
          >
            {planned ? "✓ ביעדים שלנו" : "📌 הוסף ליעדים"}
          </button>
          <button className="btn btn-ghost sm" onClick={() => openExpense({ place_name: place.name, category: "food" })}>
            💳 רשום הוצאה
          </button>
        </div>
      </div>
    </article>
  );
}
