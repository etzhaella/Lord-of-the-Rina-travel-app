"use client";

import Link from "next/link";
import { distanceKm, formatDistance, travelLine } from "@/lib/geo";
import { useApp } from "./AppProvider";
import NavButtons from "./NavButtons";

const fmtDate = (d?: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "short" }) : "";

/** Home-base card: where we sleep tonight + one-tap "take me back". */
export default function HotelCard({ compact = false }: { compact?: boolean }) {
  const { hotel, location } = useApp();

  if (!hotel)
    return (
      <Link href="/hotel" className="card hotel-card empty">
        <span className="hotel-icon">🏨</span>
        <div>
          <strong>איפה אנחנו ישנים?</strong>
          <p className="muted">הוסיפו את מיקום המלון – ותמיד תוכלו לחזור אליו בלחיצה</p>
        </div>
        <span className="chev">‹</span>
      </Link>
    );

  const km = location ? distanceKm(location, hotel) : null;

  return (
    <section className="card hotel-card">
      <div className="hotel-head">
        <span className="hotel-icon">🏨</span>
        <div className="grow">
          <small className="eyebrow">המלון שלנו</small>
          <strong>{hotel.name}</strong>
          {!compact && hotel.address && <p className="muted small">{hotel.address}</p>}
          {(hotel.check_in || hotel.check_out) && (
            <p className="muted small">
              {fmtDate(hotel.check_in)} – {fmtDate(hotel.check_out)}
            </p>
          )}
        </div>
        {km != null && (
          <div className="hotel-dist">
            <b>{formatDistance(km)}</b>
            <small>{travelLine(km)}</small>
          </div>
        )}
      </div>
      <div className="actions">
        <NavButtons lat={hotel.lat} lng={hotel.lng} name={hotel.name} placeId={hotel.place_id} wazeLabel="חזרה למלון" />
        {hotel.phone && (
          <a className="btn btn-ghost" href={`tel:${hotel.phone}`}>
            📞 התקשר
          </a>
        )}
        {compact && (
          <Link className="btn btn-ghost" href="/hotel">
            ✏️ ערוך
          </Link>
        )}
      </div>
    </section>
  );
}
