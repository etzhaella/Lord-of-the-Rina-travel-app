"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AppConfig, Destination, Favorite, Hotel, LatLng, Member, Place } from "@/lib/types";
import NavigateSheet from "./NavigateSheet";
import ExpenseSheet, { type ExpenseDraft } from "./ExpenseSheet";
import Toast from "./Toast";

type GeoStatus = "idle" | "locating" | "ok" | "denied" | "unavailable";
export type OriginMode = "me" | "hotel";

type Ctx = {
  config: AppConfig | null;
  // location
  location: (LatLng & { accuracy?: number }) | null;
  geoStatus: GeoStatus;
  requestLocation: () => void;
  // origin used for searches & distances
  originMode: OriginMode;
  setOriginMode: (m: OriginMode) => void;
  origin: LatLng | null;
  // family
  members: Member[];
  member: Member | null;
  setMemberId: (id: number) => void;
  reloadMembers: () => Promise<void>;
  // hotel
  hotel: Hotel | null;
  reloadHotel: () => Promise<void>;
  // favorites
  favorites: Favorite[];
  isFavorite: (placeId: string) => boolean;
  toggleFavorite: (p: Place, category?: string) => Promise<void>;
  // destinations
  destinations: Destination[];
  reloadDestinations: () => Promise<void>;
  isDestination: (placeId: string) => boolean;
  addDestination: (p: Place, category?: string) => Promise<void>;
  // actions
  navigateTo: (lat: number, lng: number, name: string) => void;
  openExpense: (draft?: Partial<ExpenseDraft>) => void;
  expenseVersion: number;
  toast: (msg: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [location, setLocation] = useState<Ctx["location"]>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [originMode, setOriginModeState] = useState<OriginMode>("me");
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberIdState] = useState<number | null>(null);
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [navTarget, setNavTarget] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<Partial<ExpenseDraft> | null>(null);
  const [expenseVersion, setExpenseVersion] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg((m) => (m === msg ? null : m)), 2600);
  }, []);

  // ---------- geolocation
  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus((s) => (s === "ok" ? s : "locating"));
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGeoStatus("ok");
      },
      (err) => setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [requestLocation]);

  // ---------- loaders
  const reloadMembers = useCallback(async () => {
    const ms = await api<Member[]>("/members");
    setMembers(ms);
    setMemberIdState((cur) => {
      const saved = Number(ls.get("rina.member"));
      const pick = [cur, saved].find((id) => id && ms.some((m) => m.id === id)) ?? ms[0]?.id ?? null;
      return pick ?? null;
    });
  }, []);

  const reloadHotel = useCallback(async () => {
    setHotel(await api<Hotel | null>("/hotels/active"));
  }, []);

  const reloadDestinations = useCallback(async () => {
    setDestinations(await api<Destination[]>("/destinations"));
  }, []);

  useEffect(() => {
    const m = ls.get("rina.origin");
    if (m === "hotel" || m === "me") setOriginModeState(m);
    api<AppConfig>("/config").then(setConfig).catch(() => {});
    reloadMembers().catch(() => toast("השרת לא זמין כרגע"));
    reloadHotel().catch(() => {});
    reloadDestinations().catch(() => {});
  }, [reloadMembers, reloadHotel, reloadDestinations, toast]);

  useEffect(() => {
    if (!memberId) return;
    ls.set("rina.member", String(memberId));
    api<Favorite[]>(`/favorites?member_id=${memberId}`).then(setFavorites).catch(() => {});
  }, [memberId]);

  const setOriginMode = (m: OriginMode) => {
    setOriginModeState(m);
    ls.set("rina.origin", m);
  };

  // fall back to the hotel when GPS isn't available
  const origin = useMemo<LatLng | null>(() => {
    const h = hotel ? { lat: hotel.lat, lng: hotel.lng } : null;
    const me = location ? { lat: location.lat, lng: location.lng } : null;
    return originMode === "hotel" ? h ?? me : me ?? h;
  }, [originMode, hotel, location]);

  // ---------- favorites
  const favByPlace = useMemo(() => new Map(favorites.map((f) => [f.place_id, f])), [favorites]);
  const isFavorite = useCallback((pid: string) => favByPlace.has(pid), [favByPlace]);

  const toggleFavorite = useCallback(
    async (p: Place, category?: string) => {
      if (!memberId) return;
      const existing = favByPlace.get(p.place_id);
      if (existing) {
        await api(`/favorites/${existing.id}`, { method: "DELETE" });
        setFavorites((fs) => fs.filter((f) => f.id !== existing.id));
        toast("הוסר מהמועדפים");
      } else {
        const f = await api<Favorite>("/favorites", {
          method: "POST",
          json: {
            member_id: memberId,
            place_id: p.place_id,
            name: p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            rating: p.rating,
            user_ratings_total: p.user_ratings_total,
            price_level: p.price_level,
            photo_name: p.photo_name,
            category,
          },
        });
        setFavorites((fs) => [f, ...fs]);
        toast("נשמר במועדפים ❤️");
      }
    },
    [memberId, favByPlace, toast]
  );

  // ---------- destinations
  const destPlaceIds = useMemo(
    () => new Set(destinations.map((d) => d.place_id).filter(Boolean) as string[]),
    [destinations]
  );
  const isDestination = useCallback((pid: string) => destPlaceIds.has(pid), [destPlaceIds]);

  const addDestination = useCallback(
    async (p: Place, category?: string) => {
      await api<Destination>("/destinations", {
        method: "POST",
        json: {
          name: p.name,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          place_id: p.place_id,
          photo_name: p.photo_name,
          rating: p.rating,
          category,
          added_by: memberId,
        },
      });
      await reloadDestinations();
      toast("נוסף ליעדים שלנו 📌");
    },
    [memberId, reloadDestinations, toast]
  );

  const member = members.find((m) => m.id === memberId) ?? null;

  const value: Ctx = {
    config,
    location,
    geoStatus,
    requestLocation,
    originMode,
    setOriginMode,
    origin,
    members,
    member,
    setMemberId: (id) => setMemberIdState(id),
    reloadMembers,
    hotel,
    reloadHotel,
    favorites,
    isFavorite,
    toggleFavorite,
    destinations,
    reloadDestinations,
    isDestination,
    addDestination,
    navigateTo: (lat, lng, name) => setNavTarget({ lat, lng, name }),
    openExpense: (draft) => setExpenseDraft(draft ?? {}),
    expenseVersion,
    toast,
  };

  return (
    <AppCtx.Provider value={value}>
      {children}
      {navTarget && <NavigateSheet target={navTarget} onClose={() => setNavTarget(null)} />}
      {expenseDraft && (
        <ExpenseSheet
          draft={expenseDraft}
          members={members}
          defaultMemberId={memberId}
          defaultCurrency={config?.default_currency ?? "EUR"}
          onClose={() => setExpenseDraft(null)}
          onSaved={() => {
            setExpenseDraft(null);
            setExpenseVersion((v) => v + 1);
            toast("ההוצאה נרשמה 💳");
          }}
        />
      )}
      {toastMsg && <Toast msg={toastMsg} />}
    </AppCtx.Provider>
  );
}
