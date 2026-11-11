"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import HotelCard from "@/components/HotelCard";
import LocationStrip from "@/components/LocationStrip";
import { BottomNav, TopBar } from "@/components/Shell";
import { CATEGORIES, subEmoji } from "@/lib/categories";
import { distanceKm, formatDistance } from "@/lib/geo";

export default function Home() {
  const { member, favorites, destinations, origin, navigateTo } = useApp();
  const upcoming = destinations.filter((d) => !d.visited).slice(0, 3);

  return (
    <>
      <TopBar />
      <main className="page">
        <section className="hero">
          <p className="hello">שלום {member?.name ?? ""} {member?.emoji}</p>
          <h1>לאן הולכים היום?</h1>
        </section>

        <LocationStrip />
        <HotelCard compact />

        <div className="tiles">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className={`tile ${c.className}`}>
              <span className="tile-emoji">{c.emoji}</span>
              <strong>{c.title}</strong>
              <small>{c.he}</small>
            </Link>
          ))}
          <Link href="/favorites" className="tile tile-fav">
            <span className="tile-emoji">❤️</span>
            <strong>Favorites</strong>
            <small>{favorites.length ? `${favorites.length} מקומות שמורים` : "מועדפים"}</small>
          </Link>
        </div>

        <section className="section">
          <div className="section-head">
            <h2>📌 היעדים שלנו</h2>
            <Link href="/destinations" className="link">
              הכל ({destinations.length}) ‹
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <Link href="/destinations" className="card empty-card">
              עוד לא בחרנו יעדים. הוסיפו מקומות שרוצים לבקר בהם בטיול ✨
            </Link>
          ) : (
            <ul className="dest-mini">
              {upcoming.map((d) => (
                <li key={d.id} className="card">
                  <span className="dest-emoji">{subEmoji(d.category)}</span>
                  <div className="grow">
                    <strong>{d.name}</strong>
                    <small className="muted">
                      {origin ? formatDistance(distanceKm(origin, d)) : ""}
                      {d.planned_date ? ` · ${new Date(d.planned_date + "T00:00:00").toLocaleDateString("he-IL")}` : ""}
                    </small>
                  </div>
                  <button className="btn btn-waze sm" onClick={() => navigateTo(d.lat, d.lng, d.name)}>
                    Waze
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="dedication">
          <span className="heart">❤</span>
          <p>
            האפליקציה נבנתה כמחווה לזכרה של <b>רינה</b>,<br />
            כדי לעזור למשפחה ליצור חוויות וזיכרונות משותפים בטיולים.
          </p>
        </footer>
      </main>
      <BottomNav />
    </>
  );
}
