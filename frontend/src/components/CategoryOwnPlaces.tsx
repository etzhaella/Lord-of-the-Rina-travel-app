"use client";

import { useState } from "react";
import { subEmoji } from "@/lib/categories";
import { distanceOrNull, formatDistance } from "@/lib/geo";
import type { Destination } from "@/lib/types";
import { useApp } from "./AppProvider";
import DestinationEditor from "./DestinationEditor";
import NavButtons from "./NavButtons";

/** "Our places" in a category: the family's own list, editable in place. */
export default function CategoryOwnPlaces({ sub, label }: { sub: string; label: string }) {
  const { destinations, origin } = useApp();
  const [editing, setEditing] = useState<Destination | "new" | null>(null);
  const mine = destinations.filter((d) => d.category === sub);

  return (
    <section className="own-places">
      <div className="section-head">
        <h2>
          {subEmoji(sub)} המקומות שלנו · {label}
        </h2>
        <button className="btn btn-primary sm" onClick={() => setEditing("new")}>
          ＋ הוסף
        </button>
      </div>

      {mine.length === 0 ? (
        <button className="card empty-card own-empty" onClick={() => setEditing("new")}>
          עוד אין מקומות שלנו כאן. לחצו כדי להוסיף, או 📌 על הצעה מגוגל למטה.
        </button>
      ) : (
        <ul className="simple-list">
          {mine.map((d) => {
            const km = distanceOrNull(origin, d);
            return (
              <li key={d.id} className={`card own-item ${d.visited ? "visited" : ""}`}>
                <div className="own-row">
                  <div className="grow">
                    <strong className="own-name">{d.name}</strong>
                    <small className="muted block addr-line">
                      {[d.address, km != null ? formatDistance(km) : null].filter(Boolean).join(" · ")}
                    </small>
                    {(d.planned_date || d.notes) && (
                      <small className="muted block">
                        {d.planned_date && `🗓️ ${new Date(d.planned_date + "T00:00:00").toLocaleDateString("he-IL")} `}
                        {d.notes && `📝 ${d.notes}`}
                      </small>
                    )}
                  </div>
                  <button className="icon-btn" aria-label={`ערוך את ${d.name}`} onClick={() => setEditing(d)}>
                    ✏️
                  </button>
                </div>
                <div className="actions">
                  <NavButtons lat={d.lat} lng={d.lng} name={d.name} address={d.address} placeId={d.place_id} small />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <DestinationEditor
          initial={editing === "new" ? null : editing}
          defaultCategory={sub}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}
