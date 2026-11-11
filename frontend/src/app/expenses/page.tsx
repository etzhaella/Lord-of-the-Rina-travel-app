"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { BottomNav, TopBar } from "@/components/Shell";
import { api } from "@/lib/api";
import { EXPENSE_META, formatMoney } from "@/lib/categories";
import type { Expense, ExpenseSummary } from "@/lib/types";

export default function ExpensesPage() {
  const { members, openExpense, expenseVersion, toast } = useApp();
  const [memberFilter, setMemberFilter] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [tab, setTab] = useState<"list" | "summary">("list");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const p = new URLSearchParams();
    if (memberFilter) p.set("member_id", String(memberFilter));
    if (catFilter) p.set("category", catFilter);
    api<Expense[]>(`/expenses?${p}`).then(setExpenses).catch(() => setExpenses([]));
    api<ExpenseSummary>(`/expenses/summary?${p}`).then(setSummary).catch(() => {});
  }, [memberFilter, catFilter, expenseVersion, version]);

  const memberById = new Map(members.map((m) => [m.id, m]));

  const remove = async (id: number) => {
    if (!window.confirm("למחוק את ההוצאה?")) return;
    await api(`/expenses/${id}`, { method: "DELETE" });
    setVersion((v) => v + 1);
    toast("ההוצאה נמחקה");
  };

  // group list by day
  const days = new Map<string, Expense[]>();
  for (const e of expenses ?? []) days.set(e.spent_on, [...(days.get(e.spent_on) || []), e]);

  const maxCat = Math.max(1, ...(summary?.by_category.map((r) => r.total) ?? [1]));

  return (
    <>
      <TopBar title="💳 הוצאות הטיול" back="/" />
      <main className="page">
        <section className="card totals">
          <small className="eyebrow">סה״כ הוצאות{memberFilter ? ` · ${memberById.get(memberFilter)?.name}` : ""}</small>
          {summary && summary.by_currency.length > 0 ? (
            <div className="total-amounts">
              {summary.by_currency.map((r) => (
                <b key={r.currency}>{formatMoney(r.total, r.currency)}</b>
              ))}
            </div>
          ) : (
            <b className="total-amounts">0</b>
          )}
          <button className="btn btn-primary big" onClick={() => openExpense()}>
            ＋ רישום הוצאה
          </button>
        </section>

        <div className="chip-row scroll">
          <button className={`chip ${memberFilter === null ? "on" : ""}`} onClick={() => setMemberFilter(null)}>
            כולם
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              className={`chip ${memberFilter === m.id ? "on" : ""}`}
              onClick={() => setMemberFilter(m.id)}
            >
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
        <div className="chip-row scroll">
          <button className={`chip ${catFilter === null ? "on" : ""}`} onClick={() => setCatFilter(null)}>
            כל הקטגוריות
          </button>
          {Object.entries(EXPENSE_META).map(([k, m]) => (
            <button key={k} className={`chip ${catFilter === k ? "on" : ""}`} onClick={() => setCatFilter(k)}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <div className="segmented">
          <button className={tab === "list" ? "on" : ""} onClick={() => setTab("list")}>
            רשימה
          </button>
          <button className={tab === "summary" ? "on" : ""} onClick={() => setTab("summary")}>
            סיכום
          </button>
        </div>

        {tab === "list" ? (
          expenses === null ? (
            <div className="card skeleton" />
          ) : expenses.length === 0 ? (
            <div className="card empty-card">עוד לא נרשמו הוצאות. לחצו ＋ כדי לרשום את הראשונה.</div>
          ) : (
            Array.from(days.entries()).map(([day, list]) => (
              <section key={day} className="expense-day">
                <h3 className="day-head">
                  {new Date(day + "T00:00:00").toLocaleDateString("he-IL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <ul className="simple-list">
                  {list.map((e) => {
                    const m = e.paid_by ? memberById.get(e.paid_by) : null;
                    const meta = EXPENSE_META[e.category] ?? EXPENSE_META.other;
                    return (
                      <li key={e.id} className="card expense">
                        <span className="exp-icon">{meta.emoji}</span>
                        <button
                          className="grow exp-main"
                          onClick={() =>
                            openExpense({
                              id: e.id,
                              amount: String(e.amount),
                              currency: e.currency,
                              category: e.category,
                              description: e.description ?? "",
                              place_name: e.place_name ?? "",
                              paid_by: e.paid_by ?? null,
                              spent_on: e.spent_on,
                            })
                          }
                        >
                          <strong>{e.description || meta.label}</strong>
                          <small className="muted">
                            {e.place_name ? `${e.place_name} · ` : ""}
                            {m ? `${m.emoji} ${m.name}` : ""}
                          </small>
                        </button>
                        <b className="exp-amount">{formatMoney(e.amount, e.currency)}</b>
                        <button className="icon-btn" aria-label="מחק" onClick={() => remove(e.id)}>
                          🗑️
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )
        ) : (
          summary && (
            <div className="summary">
              <section className="card">
                <h3>לפי קטגוריה</h3>
                {summary.by_category.length === 0 && <p className="muted">אין נתונים</p>}
                {summary.by_category.map((r) => {
                  const meta = EXPENSE_META[r.key] ?? EXPENSE_META.other;
                  return (
                    <div key={r.key + r.currency} className="bar-row">
                      <span className="bar-label">
                        {meta.emoji} {meta.label}
                      </span>
                      <div className="bar">
                        <div style={{ width: `${(r.total / maxCat) * 100}%` }} />
                      </div>
                      <b>{formatMoney(r.total, r.currency)}</b>
                    </div>
                  );
                })}
              </section>
              <section className="card">
                <h3>מי שילם</h3>
                {summary.by_member.map((r) => (
                  <div key={r.key + r.currency} className="kv">
                    <span>{r.key}</span>
                    <b>
                      {formatMoney(r.total, r.currency)} <small className="muted">({r.count})</small>
                    </b>
                  </div>
                ))}
              </section>
              <section className="card">
                <h3>לפי יום</h3>
                {summary.by_day.map((r) => (
                  <div key={r.key + r.currency} className="kv">
                    <span>{new Date(r.key + "T00:00:00").toLocaleDateString("he-IL")}</span>
                    <b>{formatMoney(r.total, r.currency)}</b>
                  </div>
                ))}
              </section>
            </div>
          )
        )}
      </main>
      <BottomNav />
    </>
  );
}
