"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import NavButtons from "@/components/NavButtons";
import PlaceSearch from "@/components/PlaceSearch";
import { BottomNav, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";
import { googleMapsAddressUrl, wazeAddressUrl } from "@/lib/navigate";
import type { HomeAddress } from "@/lib/types";

type Form = {
  id?: number;
  label: string;
  address: string;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  notes: string;
};

const EMPTY: Form = { label: "", address: "", lat: null, lng: null, place_id: null, notes: "" };
const SUGGESTED = ["🏡 הבית שלנו", "👵 סבא וסבתא", "🌸 אחותי", "✈️ נתב״ג – חניון"];

export default function IsraelPage() {
  const { toast } = useApp();
  const [items, setItems] = useState<HomeAddress[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);

  const load = () =>
    api<HomeAddress[]>("/home-addresses")
      .then(setItems)
      .catch(() => setItems([]));

  useEffect(() => {
    load();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !form.label.trim() || form.address.trim().length < 2) {
      toast("צריך שם וכתובת");
      return;
    }
    const body = {
      label: form.label.trim(),
      address: form.address.trim(),
      lat: form.lat,
      lng: form.lng,
      place_id: form.place_id,
      notes: form.notes.trim() || null,
    };
    try {
      if (form.id) await api(`/home-addresses/${form.id}`, { method: "PATCH", json: body });
      else await api("/home-addresses", { method: "POST", json: body });
      setForm(null);
      await load();
      toast("הכתובת נשמרה 🇮🇱");
    } catch {
      toast("השמירה נכשלה");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("למחוק את הכתובת?")) return;
    await api(`/home-addresses/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <>
      <TopBar title="🇮🇱 הבית שלנו בישראל" back="/" />
      <main className="page home-il">
        <p className="muted small">הכתובות שלנו בארץ, משותפות לכל המשפחה, עם ניווט ב-Waze או ב-Google Maps.</p>

        {items === null ? (
          <div className="card skeleton" style={{ height: 120 }} />
        ) : items.length === 0 && !form ? (
          <div className="card empty-card">עוד אין כתובות. הוסיפו את הבית, את סבא וסבתא, או את החניון בנתב״ג.</div>
        ) : (
          <ul className="simple-list">
            {items.map((h) => (
              <li key={h.id} className="card dest">
                <div className="dest-top">
                  <div className="grow">
                    <strong>{h.label}</strong>
                    <small className="muted block addr-line">{h.address}</small>
                    {h.notes && <p className="small">📝 {h.notes}</p>}
                  </div>
                  <button
                    className="icon-btn"
                    aria-label="ערוך"
                    onClick={() =>
                      setForm({
                        id: h.id,
                        label: h.label,
                        address: h.address,
                        lat: h.lat ?? null,
                        lng: h.lng ?? null,
                        place_id: h.place_id ?? null,
                        notes: h.notes ?? "",
                      })
                    }
                  >
                    ✏️
                  </button>
                  <button className="icon-btn" aria-label="מחק" onClick={() => remove(h.id)}>
                    🗑️
                  </button>
                </div>
                <div className="actions">
                  {h.lat != null && h.lng != null ? (
                    <NavButtons lat={h.lat} lng={h.lng} name={h.label} placeId={h.place_id} small />
                  ) : (
                    <>
                      <a className="btn btn-waze sm" href={wazeAddressUrl(h.address)} target="_blank" rel="noopener">
                        🚗 Waze
                      </a>
                      <a
                        className="btn btn-gmaps sm"
                        href={googleMapsAddressUrl(h.address)}
                        target="_blank"
                        rel="noopener"
                      >
                        🗺️ Google Maps
                      </a>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {form ? (
          <form className="card form" onSubmit={save}>
            <h3>{form.id ? "עריכת כתובת" : "כתובת חדשה"}</h3>

            <div className="chip-row wrap">
              {SUGGESTED.map((s) => (
                <button type="button" key={s} className="chip" onClick={() => setForm({ ...form, label: s })}>
                  {s}
                </button>
              ))}
            </div>

            <label className="field">
              <span>שם *</span>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="למשל: הבית שלנו"
                required
              />
            </label>

            <PlaceSearch
              placeholder="🔎 חיפוש כתובת בגוגל (לא חובה)"
              onPick={(p) =>
                setForm({
                  ...form,
                  address: p.address ?? p.name,
                  lat: p.lat,
                  lng: p.lng,
                  place_id: p.place_id.startsWith("demo-") ? null : p.place_id,
                })
              }
            />

            <label className="field">
              <span>כתובת *</span>
              <input
                value={form.address}
                // typing by hand clears the coordinates; navigation then uses the address text
                onChange={(e) => setForm({ ...form, address: e.target.value, lat: null, lng: null, place_id: null })}
                placeholder="רחוב, מספר, עיר"
                required
              />
            </label>

            <label className="field">
              <span>הערות</span>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="קומה, קוד לבניין, חניה…"
              />
            </label>

            <div className="row-actions">
              <button className="btn btn-primary">שמור</button>
              <button type="button" className="btn btn-text" onClick={() => setForm(null)}>
                ביטול
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-primary big" onClick={() => setForm({ ...EMPTY })}>
            ＋ הוסף כתובת בישראל
          </button>
        )}
      </main>
      <BottomNav />
    </>
  );
}
