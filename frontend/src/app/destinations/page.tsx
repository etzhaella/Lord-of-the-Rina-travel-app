"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import DestinationEditor from "@/components/DestinationEditor";
import { Photo } from "@/components/PlaceCard";
import NavButtons from "@/components/NavButtons";
import PlaceSearch from "@/components/PlaceSearch";
import { BottomNav, OriginToggle, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";
import { subEmoji, subLabel } from "@/lib/categories";
import { distanceOrNull, formatDistance, travelLine } from "@/lib/geo";
import type { Destination } from "@/lib/types";

export default function DestinationsPage() {
  const { destinations, reloadDestinations, addDestination, origin, members, navigateTo, toast } = useApp();
  const [showVisited, setShowVisited] = useState(false);
  const [editing, setEditing] = useState<Destination | "new" | null>(null);

  const todo = destinations.filter((d) => !d.visited);
  const done = destinations.filter((d) => d.visited);
  const memberById = new Map(members.map((m) => [m.id, m]));

  const patch = async (id: number, body: Partial<Destination>) => {
    await api(`/destinations/${id}`, { method: "PATCH", json: body });
    await reloadDestinations();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= todo.length) return;
    const ids = todo.map((d) => d.id);
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    await api("/destinations/reorder", { method: "POST", json: { ids } });
    await reloadDestinations();
  };

  const remove = async (id: number) => {
    if (!window.confirm("להסיר את היעד?")) return;
    await api(`/destinations/${id}`, { method: "DELETE" });
    await reloadDestinations();
  };

  const located = todo.filter((d) => distanceOrNull(origin, d) != null);
  const nearest = located.length
    ? [...located].sort((a, b) => distanceOrNull(origin, a)! - distanceOrNull(origin, b)!)[0]
    : null;

  const renderItem = (d: Destination, idx: number, list: Destination[]) => {
    const km = distanceOrNull(origin, d);
    const by = d.added_by ? memberById.get(d.added_by) : null;
    return (
      <li key={d.id} className={`card dest ${d.visited ? "visited" : ""}`}>
        <div className="dest-top">
          <div className="dest-thumb">
            <Photo name={d.photo_name} category={d.category} alt={d.name} />
          </div>
          <div className="grow">
            <strong>{d.name}</strong>
            {d.address && <small className="muted block addr-line">{d.address}</small>}
            {d.category && (
              <small className="muted block">
                {subEmoji(d.category)} {subLabel(d.category)}
              </small>
            )}
            <small className="muted block">
              {km != null && `${formatDistance(km)} · ${travelLine(km)}`}
              {d.rating ? ` · ★ ${d.rating}` : ""}
            </small>
            {(d.planned_date || by) && (
              <small className="muted block">
                {d.planned_date && `🗓️ ${new Date(d.planned_date + "T00:00:00").toLocaleDateString("he-IL")}`}
                {by && ` · נוסף ע״י ${by.emoji} ${by.name}`}
              </small>
            )}
            {d.notes && <p className="small">📝 {d.notes}</p>}
          </div>
          {!d.visited && (
            <div className="reorder">
              <button className="icon-btn" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="למעלה">
                ▲
              </button>
              <button
                className="icon-btn"
                disabled={idx === list.length - 1}
                onClick={() => move(idx, 1)}
                aria-label="למטה"
              >
                ▼
              </button>
            </div>
          )}
        </div>

        <div className="actions">
          <NavButtons lat={d.lat} lng={d.lng} name={d.name} address={d.address} placeId={d.place_id} small />
          <button className="btn btn-ghost sm" onClick={() => patch(d.id, { visited: !d.visited })}>
            {d.visited ? "↩️ להחזיר" : "✅ ביקרנו"}
          </button>
          <button className="btn btn-ghost sm" onClick={() => setEditing(d)} aria-label="ערוך">
            ✏️
          </button>
          <button className="btn btn-ghost sm" onClick={() => remove(d.id)} aria-label="הסר">
            🗑️
          </button>
        </div>
      </li>
    );
  };

  return (
    <>
      <TopBar title="📌 היעדים שלנו" back="/" />
      <main className="page">
        <p className="muted small">רשימה משותפת לכל המשפחה – מקומות שבחרנו לבקר בהם בטיול.</p>

        <PlaceSearch
          placeholder="🔎 הוסיפו יעד: מוזיאון, מסעדה, אטרקציה…"
          onPick={(p) => addDestination(p).catch(() => toast("ההוספה נכשלה"))}
        />

        <button className="btn btn-ghost" onClick={() => setEditing("new")}>
          ✍️ הוספה ידנית (שם וכתובת)
        </button>

        <OriginToggle />

        {nearest && (
          <button className="card next-up" onClick={() => navigateTo(nearest.lat!, nearest.lng!, nearest.name)}>
            <small className="eyebrow">היעד הקרוב ביותר</small>
            <strong>{nearest.name}</strong>
            <span>
              {formatDistance(distanceOrNull(origin, nearest))} · נווט ב-Waze ›
            </span>
          </button>
        )}

        {todo.length === 0 ? (
          <div className="card empty-card">
            אין יעדים פתוחים. חפשו למעלה, או לחצו &quot;📌 הוסף ליעדים&quot; על כל מקום בקטגוריות.
          </div>
        ) : (
          <ol className="dest-list">{todo.map((d, i) => renderItem(d, i, todo))}</ol>
        )}

        {done.length > 0 && (
          <section className="section">
            <button className="btn btn-text" onClick={() => setShowVisited((v) => !v)}>
              {showVisited ? "▾" : "▸"} ביקרנו כבר ({done.length})
            </button>
            {showVisited && <ol className="dest-list">{done.map((d, i) => renderItem(d, i, done))}</ol>}
          </section>
        )}
        {editing && (
          <DestinationEditor initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
        )}
      </main>
      <BottomNav />
    </>
  );
}
