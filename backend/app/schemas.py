from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Places ----------
class Place(BaseModel):
    place_id: str
    name: str
    address: str | None = None
    lat: float
    lng: float
    rating: float | None = None
    user_ratings_total: int | None = None
    price_level: int | None = None  # 0..4
    photo_name: str | None = None
    open_now: bool | None = None
    types: list[str] = []
    distance_km: float | None = None


# ---------- Members ----------
class MemberIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    emoji: str = "🙂"
    color: str = "#C8553D"


class MemberPatch(BaseModel):
    name: str | None = None
    emoji: str | None = None
    color: str | None = None


class MemberOut(ORM):
    id: int
    name: str
    emoji: str
    color: str


# ---------- Favorites ----------
class FavoriteIn(BaseModel):
    member_id: int
    place_id: str
    name: str
    address: str | None = None
    lat: float
    lng: float
    rating: float | None = None
    user_ratings_total: int | None = None
    price_level: int | None = None
    photo_name: str | None = None
    category: str | None = None


class FavoriteOut(ORM, FavoriteIn):
    id: int


# ---------- Hotels ----------
class HotelIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str | None = None
    lat: float
    lng: float
    place_id: str | None = None
    phone: str | None = None
    check_in: date | None = None
    check_out: date | None = None
    notes: str | None = None
    make_active: bool = True


class HotelPatch(BaseModel):
    name: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    place_id: str | None = None
    phone: str | None = None
    check_in: date | None = None
    check_out: date | None = None
    notes: str | None = None


class HotelOut(ORM):
    id: int
    name: str
    address: str | None
    lat: float
    lng: float
    place_id: str | None
    phone: str | None
    check_in: date | None
    check_out: date | None
    notes: str | None
    is_active: bool


# ---------- Destinations ----------
class DestinationIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str | None = None
    lat: float
    lng: float
    place_id: str | None = None
    photo_name: str | None = None
    rating: float | None = None
    category: str | None = None
    planned_date: date | None = None
    notes: str | None = None
    added_by: int | None = None


class DestinationPatch(BaseModel):
    name: str | None = None
    planned_date: date | None = None
    notes: str | None = None
    visited: bool | None = None


class DestinationOut(ORM):
    id: int
    name: str
    address: str | None
    lat: float
    lng: float
    place_id: str | None
    photo_name: str | None
    rating: float | None
    category: str | None
    planned_date: date | None
    notes: str | None
    visited: bool
    sort_order: int
    added_by: int | None


class ReorderIn(BaseModel):
    ids: list[int]


# ---------- Home addresses (Israel) ----------
class HomeAddressIn(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    address: str = Field(min_length=2, max_length=500)
    lat: float | None = None
    lng: float | None = None
    place_id: str | None = None
    notes: str | None = None


class HomeAddressPatch(BaseModel):
    label: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    place_id: str | None = None
    notes: str | None = None


class HomeAddressOut(ORM):
    id: int
    label: str
    address: str
    lat: float | None
    lng: float | None
    place_id: str | None
    notes: str | None
    sort_order: int


# ---------- Expenses ----------
EXPENSE_CATEGORIES = ["food", "transport", "lodging", "attractions", "shopping", "other"]


class ExpenseIn(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    category: str = "other"
    description: str | None = None
    place_name: str | None = None
    paid_by: int | None = None
    spent_on: date | None = None


class ExpensePatch(BaseModel):
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = None
    category: str | None = None
    description: str | None = None
    place_name: str | None = None
    paid_by: int | None = None
    spent_on: date | None = None


class ExpenseOut(ORM):
    id: int
    amount: float
    currency: str
    category: str
    description: str | None
    place_name: str | None
    paid_by: int | None
    spent_on: date


class TotalRow(BaseModel):
    key: str
    currency: str
    total: float
    count: int


class ExpenseSummary(BaseModel):
    by_currency: list[TotalRow]
    by_member: list[TotalRow]
    by_category: list[TotalRow]
    by_day: list[TotalRow]
