"use client";

import { useEffect, useRef, useState } from "react";
import { googleMapsUrl, openInWaze, platform, WAZE_STORE, wazeWebUrl } from "@/lib/navigate";

/**
 * Opens Waze straight away. If Waze doesn't take over (not installed),
 * the sheet offers Google Maps or installing Waze.
 */
export default function NavigateSheet({
  target,
  onClose,
}: {
  target: { lat: number; lng: number; name: string };
  onClose: () => void;
}) {
  const [stage, setStage] = useState<"opening" | "fallback">("opening");
  const p = platform();

  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React strict-mode runs effects twice in dev
    started.current = true;
    if (p === "desktop") {
      openInWaze(target.lat, target.lng, () => {});
      onClose();
      return;
    }
    openInWaze(target.lat, target.lng, () => setStage("fallback"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // user came back from Waze → close quietly
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden && stage === "opening") onClose();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [stage, onClose]);

  if (p === "desktop") return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {stage === "opening" ? (
          <>
            <h3>פותחים את Waze…</h3>
            <p className="muted">ניווט אל {target.name}</p>
          </>
        ) : (
          <>
            <h3>Waze לא נפתח</h3>
            <p className="muted">נראה ש-Waze לא מותקן. איך להמשיך לניווט אל {target.name}?</p>
            <div className="sheet-actions">
              <a className="btn btn-primary" href={googleMapsUrl(target.lat, target.lng)} target="_blank" rel="noopener">
                🗺️ פתח ב-Google Maps
              </a>
              <a
                className="btn btn-ghost"
                href={p === "ios" ? WAZE_STORE.ios : WAZE_STORE.android}
                target="_blank"
                rel="noopener"
              >
                ⬇️ התקן את Waze
              </a>
              <a className="btn btn-ghost" href={wazeWebUrl(target.lat, target.lng)} target="_blank" rel="noopener">
                🌐 Waze בדפדפן
              </a>
            </div>
          </>
        )}
        <button className="btn btn-text" onClick={onClose}>
          סגור
        </button>
      </div>
    </div>
  );
}
