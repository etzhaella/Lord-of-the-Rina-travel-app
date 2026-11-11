"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import HotelCard from "@/components/HotelCard";
import PlaceSearch from "@/components/PlaceSearch";
import { BottomNav, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";
import { parseLatLng } from "@/lib/geo";
import type { Hotel } from "@/lib/types";

type Form = {
  id?: number;
  name: string;
  address: string;
  lat: string;
  lng: string;
  place_id?: string | null;
  phone: string;
  check_in: string;
  check_out: string;
  notes: string;
};

const EMPTY: Form = { name: "", address: "", lat: "", lng: "", phone: "", check_in: "", check_out: "", notes: "" };

const toForm = (h: Hotel): Form => ({
  id: h.id,
  name: h.name,
  address: h.address ?? "",
  lat: String(h.lat),
  lng: String(h.lng),
  place_id: h.place_id,
  phone: h.phone ?? "",
  check_in: h.check_in ?? "",
  check_out: h.check_out ?? "",
  notes: h.notes ?? "",
});

export default function HotelPage() {
  const { hotel, reloadHotel, location, toast } = useApp();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [paste, setPaste] = useState("");

  const load = () => api<Hotel[]>("/hotels").then(setHotels).catch(() => {});
  useEffect(() => {
    load();
  }, [hotel]);

  const set = (k: keyof Form, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (!form.name.trim() || isNaN(lat) || isNaN(lng)) {
      toast("צריך שם ומיקום למלון");
      return;
    }
    const body = {
      name: form.name.trim(),
      address: form.address || null,
      lat,
      lng,
      place_id: form.place_id || null,
      phone: form.phone || null,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      notes: form.notes || null,
    };
    try {
      if (form.id) await api(`/hotels/${form.id}`, { method: "PATCH", json: body });
      else await api("/hotels", { method: "POST", json: { ...body, make_active: true } });
      setForm(null);
      await reloadHotel();
      await load();
      toast("המלון נשמר 🏨");
    } catch {
      toast("השמירה נכשלה");
    }
  };

  const activate = async (id: number) => {
    await api(`/hotels/${id}/activate`, { method: "POST" });
    await reloadHotel();
    toast("עודכן המלון הפעיל");
  };

  const remove = async (id: number) => {
    if (!window.confirm("למחוק את המלון?")) return;
    await api(`/hotels/${id}`, { method: "DELETE" });
    await reloadHotel();
    await load();
  };

  return (
    <>
      <TopBar title="🏨 המלון שלנו" back="/" />
      <main className="page">
        <HotelCard />
        {hotel?.notes && <div className="card notes">📝 {hotel.notes}</div>}

        {!form && (
          <div className="row-actions">
            {hotel && (
              <button className="btn btn-ghost" onClick={() => setForm(toForm(hotel))}>
                ✏️ ערוך מלון
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setForm({ ...EMPTY })}>
              ＋ {hotel ? "מלון נוסף (עיר הבאה)" : "הוסף מלון"}
            </button>
          </div>
        )}

        {form && (
          <form className="card form" onSubmit={save}>
            <h3>{form.id ? "עריכת מלון" : "מלון חדש"}</h3>

            <PlaceSearch
              placeholder="🔎 חפשו את המלון לפי שם…"
              onPick={(p) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        name: p.name,
                        address: p.address ?? "",
                        lat: String(p.lat),
                        lng: String(p.lng),
                        place_id: p.place_id,
                      }
                    : f
                )
              }
            />

            <div className="or">או</div>
            <div className="row-actions">
              <button
                type="button"
                className="btn btn-ghost sm"
                disabled={!location}
                onClick={() =>
                  location && setForm((f) => (f ? { ...f, lat: String(location.lat), lng: String(location.lng) } : f))
                }
              >
                📍 אני נמצא/ת במלון עכשיו
              </button>
            </div>
            <label className="field">
              <span>הדבקת קואורדינטות / קישור Google Maps</span>
              <input
                value={paste}
                placeholder="48.2082, 16.3738"
                onChange={(e) => {
                  setPaste(e.target.value);
                  const ll = parseLatLng(e.target.value);
                  if (ll) setForm((f) => (f ? { ...f, lat: String(ll.lat), lng: String(ll.lng) } : f));
                }}
              />
            </label>

            <label className="field">
              <span>שם המלון *</span>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </label>
            <label className="field">
              <span>כתובת</span>
              <input value={form.address} onChange={(e) => set("address", e.target.value)} />
            </label>
            <div className="grid2">
              <label className="field">
                <span>Lat</span>
                <input inputMode="decimal" value={form.lat} onChange={(e) => set("lat", e.target.value)} required />
              </label>
              <label className="field">
                <span>Lng</span>
                <input inputMode="decimal" value={form.lng} onChange={(e) => set("lng", e.target.value)} required />
              </label>
            </div>
            <div className="grid2">
              <label className="field">
                <span>צ׳ק-אין</span>
                <input type="date" value={form.check_in} onChange={(e) => set("check_in", e.target.value)} />
              </label>
              <label className="field">
                <span>צ׳ק-אאוט</span>
                <input type="date" value={form.check_out} onChange={(e) => set("check_out", e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>טלפון</span>
              <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            <label className="field">
              <span>הערות (מספר חדר, קוד לחניה…)</span>
              <textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </label>

            <div className="row-actions">
              <button className="btn btn-primary">שמור</button>
              <button type="button" className="btn btn-text" onClick={() => setForm(null)}>
                ביטול
              </button>
            </div>
          </form>
        )}

        {hotels.length > 1 && (
          <section className="section">
            <h2>כל המלונות בטיול</h2>
            <ul className="simple-list">
              {hotels.map((h) => (
                <li key={h.id} className={`card ${h.is_active ? "active" : ""}`}>
                  <div className="grow">
                    <strong>{h.name}</strong>
                    <small className="muted">
                      {h.check_in ?? ""} {h.check_out ? `– ${h.check_out}` : ""}
                    </small>
                  </div>
                  {h.is_active ? (
                    <span className="pill">פעיל</span>
                  ) : (
                    <button className="btn btn-ghost sm" onClick={() => activate(h.id)}>
                      הפוך לפעיל
                    </button>
                  )}
                  <button className="icon-btn" aria-label="מחק" onClick={() => remove(h.id)}>
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {hotels.length === 1 && hotel && (
          <button className="btn btn-text danger" onClick={() => remove(hotel.id)}>
            מחק מלון
          </button>
        )}
      </main>
      <BottomNav />
    </>
  );
}
