export type Sub = { key: string; label: string; emoji: string };
export type Category = {
  slug: string;
  title: string;
  he: string;
  emoji: string;
  subs: Sub[];
  className: string;
};

export const CATEGORIES: Category[] = [
  {
    slug: "food",
    title: "Food",
    he: "אוכל",
    emoji: "🍽️",
    className: "tile-food",
    subs: [
      { key: "breakfast", label: "Breakfast", emoji: "🥐" },
      { key: "coffee", label: "Coffee", emoji: "☕" },
      { key: "dinner", label: "Dinner", emoji: "🍝" },
    ],
  },
  {
    slug: "entertainment",
    title: "Entertainment",
    he: "בילוי",
    emoji: "🎭",
    className: "tile-fun",
    subs: [
      { key: "attractions", label: "אטרקציות", emoji: "🎡" },
      { key: "museums", label: "מוזיאונים", emoji: "🏛️" },
      { key: "parks", label: "פארקים", emoji: "🌳" },
      { key: "viewpoints", label: "תצפיות", emoji: "🌄" },
    ],
  },
  {
    slug: "christmas",
    title: "Christmas Markets",
    he: "שווקי חג המולד",
    emoji: "🎄",
    className: "tile-xmas",
    subs: [{ key: "christmas", label: "שווקים", emoji: "🎄" }],
  },
];

export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export const subEmoji = (key?: string | null) => {
  for (const c of CATEGORIES) for (const s of c.subs) if (s.key === key) return s.emoji;
  return "📍";
};

export const EXPENSE_META: Record<string, { label: string; emoji: string }> = {
  food: { label: "אוכל", emoji: "🍽️" },
  transport: { label: "תחבורה", emoji: "🚕" },
  lodging: { label: "לינה", emoji: "🏨" },
  attractions: { label: "אטרקציות", emoji: "🎟️" },
  shopping: { label: "קניות", emoji: "🛍️" },
  other: { label: "אחר", emoji: "💳" },
};

export const CURRENCIES = ["EUR", "USD", "ILS", "GBP", "CHF", "CZK", "HUF", "PLN", "DKK", "SEK", "NOK", "JPY"];

export const currencySymbol = (c: string) =>
  ({ EUR: "€", USD: "$", ILS: "₪", GBP: "£", CHF: "CHF ", JPY: "¥" } as Record<string, string>)[c] ?? `${c} `;

export const formatMoney = (amount: number, currency: string) =>
  `${currencySymbol(currency)}${amount.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;

/** Every sub-category, for pickers. */
export const ALL_SUBS = CATEGORIES.flatMap((c) => c.subs.map((s) => ({ ...s, category: c.slug })));

export const subLabel = (key?: string | null) => ALL_SUBS.find((s) => s.key === key)?.label ?? "אחר";
