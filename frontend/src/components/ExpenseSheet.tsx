"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { CURRENCIES, EXPENSE_META } from "@/lib/categories";
import type { Expense, Member } from "@/lib/types";

export type ExpenseDraft = {
  id?: number;
  amount: string;
  currency: string;
  category: string;
  description: string;
  place_name: string;
  paid_by: number | null;
  spent_on: string;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function ExpenseSheet({
  draft,
  members,
  defaultMemberId,
  defaultCurrency,
  onClose,
  onSaved,
}: {
  draft: Partial<ExpenseDraft>;
  members: Member[];
  defaultMemberId: number | null;
  defaultCurrency: string;
  onClose: () => void;
  onSaved: (e: Expense) => void;
}) {
  const lastCurrency = (() => {
    try {
      return localStorage.getItem("rina.currency");
    } catch {
      return null;
    }
  })();

  const [f, setF] = useState<ExpenseDraft>({
    amount: "",
    currency: lastCurrency || defaultCurrency,
    category: "food",
    description: "",
    place_name: "",
    paid_by: defaultMemberId,
    spent_on: today(),
    ...draft,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const set = <K extends keyof ExpenseDraft>(k: K, v: ExpenseDraft[K]) => setF((x) => ({ ...x, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(f.amount.replace(",", "."));
    if (!amount || amount <= 0) {
      setErr("נא להזין סכום");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const body = {
        amount,
        currency: f.currency,
        category: f.category,
        description: f.description || null,
        place_name: f.place_name || null,
        paid_by: f.paid_by,
        spent_on: f.spent_on || null,
      };
      const saved = f.id
        ? await api<Expense>(`/expenses/${f.id}`, { method: "PATCH", json: body })
        : await api<Expense>("/expenses", { method: "POST", json: body });
      try {
        localStorage.setItem("rina.currency", f.currency);
      } catch {}
      onSaved(saved);
    } catch (e) {
      setErr("השמירה נכשלה, נסו שוב");
      setSaving(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="sheet-grip" />
        <h3>{f.id ? "עריכת הוצאה" : "💳 רישום הוצאה"}</h3>

        <div className="amount-row">
          <input
            ref={amountRef}
            className="amount-input"
            inputMode="decimal"
            placeholder="0"
            value={f.amount}
            onChange={(e) => set("amount", e.target.value)}
            aria-label="סכום"
          />
          <select value={f.currency} onChange={(e) => set("currency", e.target.value)} aria-label="מטבע">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="chip-row wrap">
          {Object.entries(EXPENSE_META).map(([k, m]) => (
            <button
              type="button"
              key={k}
              className={`chip ${f.category === k ? "on" : ""}`}
              onClick={() => set("category", k)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>תיאור</span>
          <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="למשל: ארוחת ערב" />
        </label>
        <label className="field">
          <span>מקום</span>
          <input value={f.place_name} onChange={(e) => set("place_name", e.target.value)} placeholder="אופציונלי" />
        </label>

        <div className="field">
          <span>מי שילם</span>
          <div className="chip-row wrap">
            {members.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`chip ${f.paid_by === m.id ? "on" : ""}`}
                onClick={() => set("paid_by", m.id)}
              >
                {m.emoji} {m.name}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>תאריך</span>
          <input type="date" value={f.spent_on} onChange={(e) => set("spent_on", e.target.value)} />
        </label>

        {err && <p className="error">{err}</p>}
        <div className="sheet-actions">
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "שומר…" : "שמור הוצאה"}
          </button>
          <button type="button" className="btn btn-text" onClick={onClose}>
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
