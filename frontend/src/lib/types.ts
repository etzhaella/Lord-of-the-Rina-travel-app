export type LatLng = { lat: number; lng: number };

export type Place = {
  place_id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  rating?: number | null;
  user_ratings_total?: number | null;
  price_level?: number | null;
  photo_name?: string | null;
  open_now?: boolean | null;
  types?: string[];
  distance_km?: number | null;
};

export type Member = { id: number; name: string; emoji: string; color: string };

export type Favorite = {
  id: number;
  member_id: number;
  place_id: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  rating?: number | null;
  user_ratings_total?: number | null;
  price_level?: number | null;
  photo_name?: string | null;
  category?: string | null;
};

export type Hotel = {
  id: number;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
  place_id?: string | null;
  phone?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  notes?: string | null;
  is_active: boolean;
};

export type Destination = {
  id: number;
  name: string;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  place_id?: string | null;
  photo_name?: string | null;
  rating?: number | null;
  category?: string | null;
  planned_date?: string | null;
  notes?: string | null;
  visited: boolean;
  sort_order: number;
  added_by?: number | null;
};

export type Expense = {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description?: string | null;
  place_name?: string | null;
  paid_by?: number | null;
  spent_on: string;
};

export type TotalRow = { key: string; currency: string; total: number; count: number };
export type ExpenseSummary = {
  by_currency: TotalRow[];
  by_member: TotalRow[];
  by_category: TotalRow[];
  by_day: TotalRow[];
};

export type AppConfig = { mock: boolean; expense_categories: string[]; default_currency: string };

export type HomeAddress = {
  id: number;
  label: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  place_id?: string | null;
  notes?: string | null;
  sort_order: number;
};
