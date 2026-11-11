"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { BottomNav, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";

const EMOJIS = ["😎", "🌸", "🧭", "🎒", "📸", "🦄", "🐻", "⚽", "🎨", "🍦", "✈️", "🌟"];
const COLORS = ["#C8553D", "#E07A5F", "#6B8F71", "#F2A541", "#5B7DB1", "#9C6ADE", "#2A9D8F"];

export default function FamilyPage() {
  const { members, member, setMemberId, reloadMembers, toast } = useApp();
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");

  const rename = async (id: number, body: Record<string, string>) => {
    await api(`/members/${id}`, { method: "PATCH", json: body });
    await reloadMembers();
  };

  const add = async () => {
    const n = window.prompt("שם בן/בת המשפחה");
    if (!n?.trim()) return;
    await api("/members", {
      method: "POST",
      json: {
        name: n.trim(),
        emoji: EMOJIS[members.length % EMOJIS.length],
        color: COLORS[members.length % COLORS.length],
      },
    });
    await reloadMembers();
  };

  const remove = async (id: number) => {
    if (members.length <= 1) return;
    if (!window.confirm("למחוק את בן המשפחה? המועדפים שלו יימחקו.")) return;
    await api(`/members/${id}`, { method: "DELETE" });
    await reloadMembers();
  };

  return (
    <>
      <TopBar title="👨‍👩‍👧 המשפחה בטיול" back="/" />
      <main className="page">
        <p className="muted small">בחרו מי משתמש/ת עכשיו בטלפון – המועדפים וההוצאות יירשמו על שמו/ה.</p>
        <ul className="members">
          {members.map((m) => (
            <li key={m.id} className={`card member ${member?.id === m.id ? "on" : ""}`}>
              <button
                className="avatar"
                style={{ background: m.color }}
                onClick={() => {
                  setMemberId(m.id);
                  toast(`שלום ${m.name}!`);
                }}
                aria-label={`בחר ${m.name}`}
              >
                {m.emoji}
              </button>
              {editing === m.id ? (
                <form
                  className="grow member-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await rename(m.id, { name });
                    setEditing(null);
                  }}
                >
                  <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                  <div className="chip-row wrap">
                    {EMOJIS.map((em) => (
                      <button type="button" key={em} className="chip" onClick={() => rename(m.id, { emoji: em })}>
                        {em}
                      </button>
                    ))}
                  </div>
                  <div className="chip-row wrap">
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className="swatch"
                        style={{ background: c }}
                        onClick={() => rename(m.id, { color: c })}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <button className="btn btn-primary sm">שמור</button>
                </form>
              ) : (
                <button className="grow member-name" onClick={() => setMemberId(m.id)}>
                  <strong>{m.name}</strong>
                  {member?.id === m.id && <small className="pill">זה/זו אני</small>}
                </button>
              )}
              {editing !== m.id && (
                <>
                  <button
                    className="icon-btn"
                    aria-label="ערוך"
                    onClick={() => {
                      setEditing(m.id);
                      setName(m.name);
                    }}
                  >
                    ✏️
                  </button>
                  <button className="icon-btn" aria-label="מחק" onClick={() => remove(m.id)}>
                    🗑️
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <button className="btn btn-ghost" onClick={add}>
          ＋ הוסף בן/בת משפחה
        </button>

        <section className="card soon">
          <h3>🔜 בקרוב</h3>
          <ul>
            <li>מיקום בני המשפחה בזמן אמת</li>
            <li>שיתוף מועדפים</li>
            <li>שיתוף מסלול</li>
            <li>חלוקת הוצאות – מי חייב למי</li>
          </ul>
        </section>
      </main>
      <BottomNav />
    </>
  );
}
