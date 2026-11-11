"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import PlaceCard from "@/components/PlaceCard";
import { BottomNav, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";
import { distanceKm } from "@/lib/geo";
import type { Favorite, Place } from "@/lib/types";

export default function FavoritesPage() {
  const { favorites, member, members, origin } = useApp();
  const [scope, setScope] = useState<"mine" | "family">("mine");
  const [familyFavs, setFamilyFavs] = useState<Favorite[]>([]);

  useEffect(() => {
    if (scope === "family") api<Favorite[]>("/favorites").then(setFamilyFavs).catch(() => {});
  }, [scope, favorites]);

  const list = scope === "mine" ? favorites : familyFavs;
  const byName = new Map(members.map((m) => [m.id, m]));
  const sorted = [...list].sort((a, b) => (origin ? distanceKm(origin, a) - distanceKm(origin, b) : 0));

  // de-dupe family view by place, keeping who saved it
  const seen = new Map<string, Favorite[]>();
  for (const f of sorted) seen.set(f.place_id, [...(seen.get(f.place_id) || []), f]);

  return (
    <>
      <TopBar title="❤️ Favorites" back="/" />
      <main className="page">
        <div className="segmented">
          <button className={scope === "mine" ? "on" : ""} onClick={() => setScope("mine")}>
            {member?.emoji} שלי
          </button>
          <button className={scope === "family" ? "on" : ""} onClick={() => setScope("family")}>
            👨‍👩‍👧 של כל המשפחה
          </button>
        </div>

        {seen.size === 0 ? (
          <div className="card empty-card">עוד אין מועדפים. לחצו 🤍 על מקום כדי לשמור אותו כאן.</div>
        ) : (
          <div className="list">
            {Array.from(seen.values()).map((group) => {
              const f = group[0];
              const place: Place = { ...f, place_id: f.place_id };
              return (
                <div key={f.place_id}>
                  {scope === "family" && (
                    <p className="saved-by">
                      נשמר ע״י{" "}
                      {group.map((g) => {
                        const m = byName.get(g.member_id);
                        return m ? `${m.emoji} ${m.name}` : "";
                      }).join(", ")}
                    </p>
                  )}
                  <PlaceCard place={place} category={f.category ?? undefined} />
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
