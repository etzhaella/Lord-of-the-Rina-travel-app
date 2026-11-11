"use client";

import { useApp } from "./AppProvider";

export default function LocationStrip() {
  const { location, geoStatus, requestLocation } = useApp();
  let text: React.ReactNode;
  if (geoStatus === "ok" && location)
    text = (
      <>
        <b>המיקום שלך</b>
        <span className="mono">
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          {location.accuracy ? ` · ±${Math.round(location.accuracy)} מ׳` : ""}
        </span>
      </>
    );
  else if (geoStatus === "locating") text = <b>מאתר מיקום…</b>;
  else if (geoStatus === "denied") text = <b>אין הרשאת מיקום – אפשרו GPS בהגדרות הדפדפן</b>;
  else text = <b>המיקום לא זמין</b>;

  return (
    <div className={`location-strip ${geoStatus}`}>
      <span className="pulse" aria-hidden />
      <div className="loc-text">{text}</div>
      {geoStatus !== "ok" && geoStatus !== "locating" && (
        <button className="btn btn-text sm" onClick={requestLocation}>
          נסה שוב
        </button>
      )}
    </div>
  );
}
