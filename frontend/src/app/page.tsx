"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import ColmarScene from "@/components/ColmarScene";
import HotelCard from "@/components/HotelCard";
import NavButtons from "@/components/NavButtons";
import LocationStrip from "@/components/LocationStrip";
import { BottomNav, TopBar } from "@/components/Shell";
import { CATEGORIES, subEmoji } from "@/lib/categories";
import { distanceOrNull, formatDistance } from "@/lib/geo";


const FACADE: Record<string, string> = {
  food: "facade-salmon",
  entertainment: "facade-teal",
  christmas: "facade-fir",
};

export default function Home() {
  const { member, favorites, destinations, origin } = useApp();
  const upcoming = destinations.filter((d) => !d.visited).slice(0, 3);

  return (
    <>
      <TopBar />
      <main className="page">
        <section className="hero">
          <ColmarScene />
          <div className="hero-text">
            <p className="hello">
              שלום {member?.name ?? ""} {member?.emoji}
            </p>
            <h1>לאן הולכים היום?</h1>
            <p className="bienvenue">Bienvenue à Colmar ✦</p>
          </div>
        </section>

        <LocationStrip />
        <HotelCard compact />

        <div className="tiles">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="tile-wrap">
              <div className={`tile ${FACADE[c.slug] ?? ""}`}>
                <span className="tile-window">{c.emoji}</span>
                <span className="tile-sign">
                  <strong>{c.title}</strong>
                  <small>{c.he}</small>
                </span>
              </div>
            </Link>
          ))}
          <Link href="/favorites" className="tile-wrap">
            <div className="tile facade-mustard">
              <span className="tile-window">❤️</span>
              <span className="tile-sign">
                <strong>Favorites</strong>
                <small>{favorites.length ? `${favorites.length} מקומות שמורים` : "מועדפים"}</small>
              </span>
            </div>
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
                      {distanceOrNull(origin, d) != null ? formatDistance(distanceOrNull(origin, d)) : ""}
                      {d.planned_date ? ` · ${new Date(d.planned_date + "T00:00:00").toLocaleDateString("he-IL")}` : ""}
                    </small>
                  </div>
                  <div className="mini-nav">
                    <NavButtons lat={d.lat} lng={d.lng} name={d.name} address={d.address} placeId={d.place_id} small />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Link href="/israel" className="israel-button">
          <span className="israel-flag">🇮🇱</span>
          <span className="grow">
            <strong>הבית שלנו בישראל</strong>
            <small>הכתובות שלנו בארץ, עם ניווט בלחיצה</small>
          </span>
          <span className="chev">‹</span>
        </Link>

        <footer className="dedication">
          <span className="ornament" aria-hidden>
            ❄ ✦ ❄
          </span>
          <span className="heart">🥨</span>
          <p>
            <b>ההלויז יוצאים לטייל בקולמר!</b>
            <br />
            צפויים: עצירות קפה במקומות מיוחדים, 700 תמונות
            <br />
            ואין ספור זיכרונות.
          </p>
          <small className="joyeux">Joyeux Noël · Bonne route</small>
        </footer>
      </main>
      <BottomNav />
    </>
  );
}
