"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ALL_SUBS } from "@/lib/categories";
import { parseLatLng } from "@/lib/geo";
import type { Destination } from "@/lib/types";
import { useApp } from "./AppProvider";
import PlaceSearch from "./PlaceSearch";

type Form = {
  name: string;
  category: string;
  address: string;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  photo_name: string | null;
  rating: number | null;
  planned_date: string;
  notes: string;
};

/**
 * One form for adding or editing a place we chose (a "destination"), from any screen.
 * A name is enough; search, address, pasted coordinates or "I'm here" make it more precise.
 */
export default function DestinationEditor({
  initial,
  defaultCategory,
  onClose,
}: {
  initial?: Destination | null;
  defaultCategory?: string | null;
  onClose: () => void;
}) {
  const { location, member, reloadDestinations, toast } = useApp();
  const [f, setF] = useState<Form>({
    name: initial?.name ?? "",
    category: initial?.category ?? defaultCategory ?? "",
    address: initial?.address ?? "",
    lat: initial?.lat ?? null,
    lng: initial?.lng ?? null,
    place_id: initial?.place_id ?? null,
    photo_name: initial?.photo_name ?? null,
    rating: initial?.rating ?? null,
    planned_date: initial?.planned_date ?? "",
    notes: initial?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const clearPoint = { lat: null, lng: null, place_id: null } as const;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) {
      toast("צריך שם למקום");
      return;
    }
    setSaving(true);
    const body = {
      name: f.name.trim(),
      category: f.category || null,
      address: f.address.trim() || null,
      lat: f.lat,
      lng: f.lng,
      place_id: f.place_id,
      photo_name: f.photo_name,
      rating: f.rating,
      planned_date: f.planned_date || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (initial) await api(`/destinations/${initial.id}`, { method: "PATCH", json: body });
      else await api("/destinations", { method: "POST", json: { ...body, added_by: member?.id ?? null } });
      await reloadDestinations();
      toast(initial ? "המקום עודכן ✏️" : "המקום נוסף 📌");
      onClose();
    } catch {
      toast("השמירה נכשלה");
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial || !window.confirm(`להסיר את "${initial.name}"?`)) return;
    await api(`/destinations/${initial.id}`, { method: "DELETE" });
    await reloadDestinations();
    toast("המקום הוסר");
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="sheet-grip" />
        <h3>{initial ? "✏️ עריכת מקום" : "📌 הוספת מקום"}</h3>

        <PlaceSearch
          placeholder="🔎 חיפוש בגוגל (ממלא שם, כתובת ומיקום)"
          onPick={(p) =>
            setF((x) => ({
              ...x,
              name: x.name && initial ? x.name : p.name,
              address: p.address ?? x.address,
              lat: p.lat,
              lng: p.lng,
              place_id: p.place_id.startsWith("demo-") ? null : p.place_id,
              photo_name: p.photo_name ?? null,
              rating: p.rating ?? null,
            }))
          }
        />

        <label className="field">
          <span>שם *</span>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="למשל: Wistub Brenner" required />
        </label>

        <div className="field">
          <span>קטגוריה</span>
          <div className="chip-row wrap">
            {ALL_SUBS.map((s) => (
              <button
                type="button"
                key={s.key}
                className={`chip ${f.category === s.key ? "on" : ""}`}
                onClick={() => set("category", f.category === s.key ? "" : s.key)}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>כתובת</span>
          <input
            value={f.address}
            onChange={(e) => setF((x) => ({ ...x, address: e.target.value, ...clearPoint }))}
            placeholder="רחוב, מספר, עיר"
          />
        </label>

        <div className="loc-tools">
          <small className={f.lat != null ? "loc-ok" : "muted"}>
            {f.lat != null ? `📍 מיקום מדויק: ${f.lat.toFixed(5)}, ${f.lng!.toFixed(5)}` : "ללא מיקום מדויק – הניווט ייעשה לפי הכתובת"}
          </small>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-ghost sm"
              disabled={!location}
              onClick={() => location && setF((x) => ({ ...x, lat: location.lat, lng: location.lng, place_id: null }))}
            >
              📍 אני כאן עכשיו
            </button>
            {f.lat != null && (
              <button type="button" className="btn btn-text sm" onClick={() => setF((x) => ({ ...x, ...clearPoint }))}>
                נקה מיקום
              </button>
            )}
          </div>
          <input
            placeholder="או הדביקו קואורדינטות / קישור Google Maps"
            onChange={(e) => {
              const ll = parseLatLng(e.target.value);
              if (ll) setF((x) => ({ ...x, lat: ll.lat, lng: ll.lng, place_id: null }));
            }}
          />
        </div>

        <div className="grid2">
          <label className="field">
            <span>מתי?</span>
            <input type="date" value={f.planned_date} onChange={(e) => set("planned_date", e.target.value)} />
          </label>
          <label className="field">
            <span>הערות</span>
            <input value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="להזמין מראש…" />
          </label>
        </div>

        <div className="sheet-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "שומר…" : "שמור"}
          </button>
          {initial && (
            <button type="button" className="btn btn-ghost danger-outline" onClick={remove}>
              🗑️ הסר מקום
            </button>
          )}
          <button type="button" className="btn btn-text" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
