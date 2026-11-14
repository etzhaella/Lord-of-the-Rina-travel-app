"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./AppProvider";

const NAV = [
  { href: "/", label: "בית", icon: "🏠" },
  { href: "/destinations", label: "יעדים", icon: "📌" },
  { href: "/hotel", label: "מלון", icon: "🏨" },
  { href: "/expenses", label: "הוצאות", icon: "💳" },
  { href: "/family", label: "משפחה", icon: "👨‍👩‍👧" },
  { href: "/israel", label: "בית בישראל", icon: "🇮🇱" },
];

export function TopBar({ title, back }: { title?: string; back?: string }) {
  const { member } = useApp();
  return (
    <>
      <header className="topbar">
        {back ? (
          <Link href={back} className="icon-btn" aria-label="חזרה">
            →
          </Link>
        ) : (
          <span className="icon-btn" aria-hidden>
            🧭
          </span>
        )}
        <div className="topbar-title">
          {title ? (
            <strong>{title}</strong>
          ) : (
            <>
              <strong className="brand">Lord of the Rina</strong>
              <small>Family Travel Companion</small>
            </>
          )}
        </div>
        <Link href="/family" className="member-chip" style={{ background: member?.color }}>
          <span>{member?.emoji ?? "🙂"}</span>
        </Link>
      </header>
      <div className="garland" aria-hidden />
    </>
  );
}

export function BottomNav() {
  const path = usePathname();
  const { openExpense } = useApp();
  return (
    <>
      <button className="fab" onClick={() => openExpense()} aria-label="רישום הוצאה">
        <span>＋</span>
        <small>הוצאה</small>
      </button>
      <nav className="bottomnav">
        {NAV.map((n) => {
          const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} className={on ? "on" : ""}>
              <span>{n.icon}</span>
              <small>{n.label}</small>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function OriginToggle() {
  const { originMode, setOriginMode, hotel, geoStatus } = useApp();
  return (
    <div className="segmented" role="tablist" aria-label="חיפוש ליד">
      <button className={originMode === "me" ? "on" : ""} onClick={() => setOriginMode("me")}>
        📍 לידי{geoStatus !== "ok" ? " (אין GPS)" : ""}
      </button>
      <button
        className={originMode === "hotel" ? "on" : ""}
        onClick={() => setOriginMode("hotel")}
        disabled={!hotel}
        title={hotel ? hotel.name : "הוסיפו מלון קודם"}
      >
        🏨 ליד המלון
      </button>
    </div>
  );
}
