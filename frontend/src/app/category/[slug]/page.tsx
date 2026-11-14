"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import CategoryOwnPlaces from "@/components/CategoryOwnPlaces";
import PlaceCard from "@/components/PlaceCard";
import { BottomNav, OriginToggle, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";
import { getCategory } from "@/lib/categories";
import type { Place } from "@/lib/types";

type Hidden = { place_id: string; name: string; category?: string | null };

const DISTANCES = [1, 5, 10, 20];
const PRICES = [1, 2, 3, 4];
const RATINGS = [4, 4.5, 4.7, 4.8];

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = getCategory(params.slug);
  if (!cat) notFound();
  return <CategoryView slug={params.slug} />;
}

function CategoryView({ slug }: { slug: string }) {
  const cat = getCategory(slug)!;
  const { origin, geoStatus, toast } = useApp();
  const [hidden, setHidden] = useState<Hidden[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    api<Hidden[]>("/hidden-places").then(setHidden).catch(() => {});
  }, []);

  const hidePlace = async (p: Place) => {
    try {
      const h = await api<Hidden>("/hidden-places", {
        method: "POST",
        json: { place_id: p.place_id, name: p.name, category: sub },
      });
      setHidden((hs) => [h, ...hs.filter((x) => x.place_id !== h.place_id)]);
      setPlaces((ps) => (ps ? ps.filter((x) => x.place_id !== p.place_id) : ps));
      toast("ההצעה הוסתרה 🙈");
    } catch {
      toast("לא הצלחנו להסתיר");
    }
  };

  const unhide = async (h: Hidden) => {
    await api(`/hidden-places/${encodeURIComponent(h.place_id)}`, { method: "DELETE" });
    setHidden((hs) => hs.filter((x) => x.place_id !== h.place_id));
    setRefresh((n) => n + 1);
    toast(`"${h.name}" חזר לרשימה`);
  };
  const [sub, setSub] = useState(cat.subs[0].key);
  const [radius, setRadius] = useState(5);
  const [prices, setPrices] = useState<number[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState<"distance" | "rating">("distance");
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  // ~100m rounding so walking around doesn't refetch constantly
  const oLat = origin ? origin.lat.toFixed(3) : null;
  const oLng = origin ? origin.lng.toFixed(3) : null;

  useEffect(() => {
    if (!oLat || !oLng) return;
    let cancelled = false;
    setPlaces(null);
    setError(null);
    const p = new URLSearchParams({
      category: sub,
      lat: oLat,
      lng: oLng,
      radius_km: String(radius),
      min_rating: String(minRating),
      price: prices.join(","),
      sort,
    });
    api<Place[]>(`/places/nearby?${p}`)
      .then((r) => !cancelled && setPlaces(r))
      .catch(() => !cancelled && setError("לא הצלחנו לטעון מקומות. נסו שוב."));
    return () => {
      cancelled = true;
    };
  }, [sub, radius, prices, minRating, sort, oLat, oLng, refresh]);

  const togglePrice = (p: number) =>
    setPrices((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p].sort()));

  const isFood = slug === "food";

  return (
    <>
      <TopBar title={`${cat.emoji} ${cat.title}`} back="/" />
      <main className="page">
        {cat.subs.length > 1 && (
          <div className="tabs">
            {cat.subs.map((s) => (
              <button key={s.key} className={sub === s.key ? "on" : ""} onClick={() => setSub(s.key)}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        )}

        <CategoryOwnPlaces sub={sub} label={cat.subs.find((s) => s.key === sub)?.label ?? cat.title} />

        <div className="section-head google-head">
          <h2>✨ הצעות מגוגל</h2>
        </div>

        <OriginToggle />

        <div className="filters">
          <div className="filter-row">
            <span className="filter-label">מרחק</span>
            <div className="chip-row">
              {DISTANCES.map((d) => (
                <button key={d} className={`chip ${radius === d ? "on" : ""}`} onClick={() => setRadius(d)}>
                  עד {d} ק״מ
                </button>
              ))}
            </div>
          </div>
          {(isFood || slug === "entertainment") && (
            <div className="filter-row">
              <span className="filter-label">מחיר</span>
              <div className="chip-row">
                {PRICES.map((p) => (
                  <button key={p} className={`chip ${prices.includes(p) ? "on" : ""}`} onClick={() => togglePrice(p)}>
                    {"$".repeat(p)}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="filter-row">
            <span className="filter-label">דירוג</span>
            <div className="chip-row">
              {RATINGS.map((r) => (
                <button
                  key={r}
                  className={`chip ${minRating === r ? "on" : ""}`}
                  onClick={() => setMinRating(minRating === r ? 0 : r)}
                >
                  ★ {r}+
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <span className="filter-label">מיון</span>
            <div className="chip-row">
              <button className={`chip ${sort === "distance" ? "on" : ""}`} onClick={() => setSort("distance")}>
                הכי קרוב
              </button>
              <button className={`chip ${sort === "rating" ? "on" : ""}`} onClick={() => setSort("rating")}>
                הכי מדורג
              </button>
            </div>
          </div>
        </div>

        {!origin ? (
          <div className="card empty-card">
            {geoStatus === "locating"
              ? "מאתר את המיקום שלך…"
              : "צריך מיקום כדי להציג המלצות. אפשרו GPS, או הוסיפו את המלון ונחפש לידו."}
          </div>
        ) : error ? (
          <div className="card empty-card">{error}</div>
        ) : places === null ? (
          <div className="skeletons">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="card empty-card">
            {slug === "christmas"
              ? "לא נמצאו שווקי חג מולד באזור. נסו להגדיל את המרחק 🎄"
              : "לא נמצאו מקומות שמתאימים לסינון. נסו להרחיב את המרחק או להוריד פילטרים."}
          </div>
        ) : (
          <>
            <p className="muted small count">{places.length} מקומות</p>
            <div className="list">
              {places.map((p) => (
                <PlaceCard key={p.place_id} place={p} category={sub} onHide={() => hidePlace(p)} />
              ))}
            </div>
          </>
        )}

        {hidden.filter((h) => !h.category || h.category === sub).length > 0 && (
          <section className="section">
            <button className="btn btn-text" onClick={() => setShowHidden((v) => !v)}>
              {showHidden ? "▾" : "▸"} 🙈 הצעות מוסתרות ({hidden.filter((h) => !h.category || h.category === sub).length})
            </button>
            {showHidden && (
              <ul className="simple-list">
                {hidden
                  .filter((h) => !h.category || h.category === sub)
                  .map((h) => (
                    <li key={h.place_id} className="card">
                      <span className="grow addr-line">{h.name}</span>
                      <button className="btn btn-ghost sm" onClick={() => unhide(h)}>
                        ↩️ החזר
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        )}
      </main>
      <BottomNav />
    </>
  );
}
