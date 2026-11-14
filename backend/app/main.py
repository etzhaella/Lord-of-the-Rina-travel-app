import asyncio
import logging
import os
import time
from collections import defaultdict
from datetime import date

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from . import places
from .db import Base, SessionLocal, engine, get_db
from .seed import fix_hotel_location, load_trip_plan, refine_locations
from .models import Destination, Expense, Favorite, HomeAddress, Hotel, Member
from .schemas import (
    EXPENSE_CATEGORIES,
    DestinationIn,
    DestinationOut,
    DestinationPatch,
    ExpenseIn,
    ExpenseOut,
    ExpensePatch,
    ExpenseSummary,
    FavoriteIn,
    HomeAddressIn,
    HomeAddressOut,
    HomeAddressPatch,
    FavoriteOut,
    HotelIn,
    HotelOut,
    HotelPatch,
    MemberIn,
    MemberOut,
    MemberPatch,
    Place,
    ReorderIn,
    TotalRow,
)

log = logging.getLogger("rina")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Lord of the Rina API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

DEFAULT_MEMBERS = [
    ("אני", "😎", "#C8553D"),
    ("אחותי", "🌸", "#E07A5F"),
    ("בן משפחה 1", "🧭", "#6B8F71"),
    ("בן משפחה 2", "🎒", "#F2A541"),
    ("בן משפחה 3", "📸", "#5B7DB1"),
]


@app.on_event("startup")
def startup() -> None:
    # Postgres may still be booting when the container starts
    for attempt in range(30):
        try:
            Base.metadata.create_all(engine)
            break
        except OperationalError:
            log.info("waiting for database... (%s)", attempt + 1)
            time.sleep(2)
    else:
        raise RuntimeError("database not reachable")
    with SessionLocal() as db:
        if not db.scalar(select(Member.id).limit(1)):
            db.add_all(Member(name=n, emoji=e, color=c) for n, e, c in DEFAULT_MEMBERS)
            db.commit()
    load_trip_plan()
    fix_hotel_location()
    log.info("ready. demo mode=%s", places.MOCK)


@app.on_event("startup")
async def refine_in_background() -> None:
    # exact coordinates + photos from Google, without delaying startup
    asyncio.create_task(refine_locations())


# ------------------------------------------------------------------ misc
@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/config")
def config():
    return {
        "mock": places.MOCK,
        "places_key_variable": places.KEY_SOURCE,
        "expense_categories": EXPENSE_CATEGORIES,
        "default_currency": os.getenv("DEFAULT_CURRENCY", "EUR"),
    }


# ------------------------------------------------------------------ places
@app.get("/api/places/nearby", response_model=list[Place])
async def places_nearby(
    category: str,
    lat: float,
    lng: float,
    radius_km: float = Query(5, gt=0, le=50),
    min_rating: float = 0,
    price: str = "",  # e.g. "1,2"
    sort: str = "distance",  # distance | rating
):
    try:
        result = await places.nearby(category, lat, lng, radius_km)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except httpx.HTTPStatusError as e:
        log.error("places error %s %s", e.response.status_code, e.response.text[:300])
        raise HTTPException(502, "Google Places error")
    prices = {int(p) for p in price.split(",") if p.strip().isdigit()}
    if min_rating:
        result = [p for p in result if (p.rating or 0) >= min_rating]
    if prices:
        result = [p for p in result if p.price_level in prices]
    if sort == "rating":
        result.sort(key=lambda p: (-(p.rating or 0), p.distance_km or 0))
    else:
        result.sort(key=lambda p: p.distance_km or 0)
    return result


@app.get("/api/places/check")
async def places_check():
    """Diagnostics: is a Google key loaded, and does Google accept it?"""
    return await places.check_key()


@app.get("/api/places/search", response_model=list[Place])
async def places_search(q: str = Query(min_length=2), lat: float | None = None, lng: float | None = None):
    try:
        return await places.text_search(q, lat, lng)
    except httpx.HTTPStatusError as e:
        log.error("places error %s %s", e.response.status_code, e.response.text[:300])
        raise HTTPException(502, "Google Places error")


@app.get("/api/places/photo")
async def places_photo(name: str, w: int = Query(600, ge=100, le=1600)):
    url = await places.photo_url(name, w)
    if not url:
        return Response(status_code=404)
    return RedirectResponse(url, status_code=302, headers={"Cache-Control": "public, max-age=3600"})


# ------------------------------------------------------------------ members
@app.get("/api/members", response_model=list[MemberOut])
def list_members(db: Session = Depends(get_db)):
    return db.scalars(select(Member).order_by(Member.id)).all()


@app.post("/api/members", response_model=MemberOut, status_code=201)
def add_member(body: MemberIn, db: Session = Depends(get_db)):
    m = Member(**body.model_dump())
    db.add(m)
    db.commit()
    return m


@app.patch("/api/members/{mid}", response_model=MemberOut)
def edit_member(mid: int, body: MemberPatch, db: Session = Depends(get_db)):
    m = db.get(Member, mid) or _404()
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    return m


@app.delete("/api/members/{mid}", status_code=204)
def delete_member(mid: int, db: Session = Depends(get_db)):
    m = db.get(Member, mid) or _404()
    db.delete(m)
    db.commit()


# ------------------------------------------------------------------ favorites
@app.get("/api/favorites", response_model=list[FavoriteOut])
def list_favorites(member_id: int | None = None, db: Session = Depends(get_db)):
    q = select(Favorite).order_by(Favorite.created_at.desc())
    if member_id:
        q = q.where(Favorite.member_id == member_id)
    return db.scalars(q).all()


@app.post("/api/favorites", response_model=FavoriteOut, status_code=201)
def add_favorite(body: FavoriteIn, db: Session = Depends(get_db)):
    existing = db.scalar(
        select(Favorite).where(Favorite.member_id == body.member_id, Favorite.place_id == body.place_id)
    )
    if existing:
        return existing
    f = Favorite(**body.model_dump())
    db.add(f)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "invalid member")
    return f


@app.delete("/api/favorites/{fid}", status_code=204)
def delete_favorite(fid: int, db: Session = Depends(get_db)):
    f = db.get(Favorite, fid) or _404()
    db.delete(f)
    db.commit()


# ------------------------------------------------------------------ hotels
@app.get("/api/hotels", response_model=list[HotelOut])
def list_hotels(db: Session = Depends(get_db)):
    return db.scalars(select(Hotel).order_by(Hotel.is_active.desc(), Hotel.check_in, Hotel.id)).all()


@app.get("/api/hotels/active", response_model=HotelOut | None)
def active_hotel(db: Session = Depends(get_db)):
    return db.scalar(select(Hotel).where(Hotel.is_active.is_(True)).limit(1))


@app.post("/api/hotels", response_model=HotelOut, status_code=201)
def add_hotel(body: HotelIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    make_active = data.pop("make_active")
    has_active = db.scalar(select(Hotel.id).where(Hotel.is_active.is_(True)).limit(1))
    if make_active or not has_active:
        db.execute(update(Hotel).values(is_active=False))
        data["is_active"] = True
    h = Hotel(**data)
    db.add(h)
    db.commit()
    return h


@app.patch("/api/hotels/{hid}", response_model=HotelOut)
def edit_hotel(hid: int, body: HotelPatch, db: Session = Depends(get_db)):
    h = db.get(Hotel, hid) or _404()
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    db.commit()
    return h


@app.post("/api/hotels/{hid}/activate", response_model=HotelOut)
def activate_hotel(hid: int, db: Session = Depends(get_db)):
    h = db.get(Hotel, hid) or _404()
    db.execute(update(Hotel).values(is_active=False))
    h.is_active = True
    db.commit()
    return h


@app.delete("/api/hotels/{hid}", status_code=204)
def delete_hotel(hid: int, db: Session = Depends(get_db)):
    h = db.get(Hotel, hid) or _404()
    was_active = h.is_active
    db.delete(h)
    db.flush()
    if was_active:
        nxt = db.scalar(select(Hotel).order_by(Hotel.id).limit(1))
        if nxt:
            nxt.is_active = True
    db.commit()


# ------------------------------------------------------------------ destinations
@app.get("/api/destinations", response_model=list[DestinationOut])
def list_destinations(db: Session = Depends(get_db)):
    return db.scalars(
        select(Destination).order_by(Destination.visited, Destination.sort_order, Destination.id)
    ).all()


@app.post("/api/destinations", response_model=DestinationOut, status_code=201)
def add_destination(body: DestinationIn, db: Session = Depends(get_db)):
    if body.place_id:
        dup = db.scalar(select(Destination).where(Destination.place_id == body.place_id))
        if dup:
            return dup
    last = db.scalar(select(Destination.sort_order).order_by(Destination.sort_order.desc()).limit(1))
    d = Destination(**body.model_dump(), sort_order=(last or 0) + 1)
    db.add(d)
    db.commit()
    return d


@app.patch("/api/destinations/{did}", response_model=DestinationOut)
def edit_destination(did: int, body: DestinationPatch, db: Session = Depends(get_db)):
    d = db.get(Destination, did) or _404()
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    return d


@app.post("/api/destinations/reorder", status_code=204)
def reorder_destinations(body: ReorderIn, db: Session = Depends(get_db)):
    for i, did in enumerate(body.ids):
        db.execute(update(Destination).where(Destination.id == did).values(sort_order=i))
    db.commit()


@app.delete("/api/destinations/{did}", status_code=204)
def delete_destination(did: int, db: Session = Depends(get_db)):
    d = db.get(Destination, did) or _404()
    db.delete(d)
    db.commit()


# ------------------------------------------------------------------ home in Israel
@app.get("/api/home-addresses", response_model=list[HomeAddressOut])
def list_home_addresses(db: Session = Depends(get_db)):
    return db.scalars(select(HomeAddress).order_by(HomeAddress.sort_order, HomeAddress.id)).all()


@app.post("/api/home-addresses", response_model=HomeAddressOut, status_code=201)
def add_home_address(body: HomeAddressIn, db: Session = Depends(get_db)):
    last = db.scalar(select(HomeAddress.sort_order).order_by(HomeAddress.sort_order.desc()).limit(1))
    h = HomeAddress(**body.model_dump(), sort_order=(last or 0) + 1)
    db.add(h)
    db.commit()
    return h


@app.patch("/api/home-addresses/{hid}", response_model=HomeAddressOut)
def edit_home_address(hid: int, body: HomeAddressPatch, db: Session = Depends(get_db)):
    h = db.get(HomeAddress, hid) or _404()
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    db.commit()
    return h


@app.delete("/api/home-addresses/{hid}", status_code=204)
def delete_home_address(hid: int, db: Session = Depends(get_db)):
    h = db.get(HomeAddress, hid) or _404()
    db.delete(h)
    db.commit()


# ------------------------------------------------------------------ expenses
def _expense_query(member_id: int | None, category: str | None, day: date | None):
    q = select(Expense)
    if member_id:
        q = q.where(Expense.paid_by == member_id)
    if category:
        q = q.where(Expense.category == category)
    if day:
        q = q.where(Expense.spent_on == day)
    return q


@app.get("/api/expenses", response_model=list[ExpenseOut])
def list_expenses(
    member_id: int | None = None,
    category: str | None = None,
    day: date | None = None,
    db: Session = Depends(get_db),
):
    q = _expense_query(member_id, category, day).order_by(Expense.spent_on.desc(), Expense.id.desc())
    return db.scalars(q).all()


@app.get("/api/expenses/summary", response_model=ExpenseSummary)
def expenses_summary(
    member_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    rows = db.scalars(_expense_query(member_id, category, None)).all()
    names = {m.id: m.name for m in db.scalars(select(Member)).all()}

    def group(keyfn) -> list[TotalRow]:
        acc: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0])
        for e in rows:
            a = acc[(keyfn(e), e.currency)]
            a[0] += e.amount
            a[1] += 1
        out = [TotalRow(key=k, currency=c, total=round(v[0], 2), count=int(v[1])) for (k, c), v in acc.items()]
        return sorted(out, key=lambda r: -r.total)

    by_day = group(lambda e: e.spent_on.isoformat())
    by_day.sort(key=lambda r: r.key, reverse=True)
    return ExpenseSummary(
        by_currency=group(lambda e: e.currency),
        by_member=group(lambda e: names.get(e.paid_by, "—") if e.paid_by else "—"),
        by_category=group(lambda e: e.category),
        by_day=by_day,
    )


@app.post("/api/expenses", response_model=ExpenseOut, status_code=201)
def add_expense(body: ExpenseIn, db: Session = Depends(get_db)):
    data = body.model_dump()
    data["currency"] = data["currency"].upper()
    if data["category"] not in EXPENSE_CATEGORIES:
        data["category"] = "other"
    if data["spent_on"] is None:
        data["spent_on"] = date.today()
    e = Expense(**data)
    db.add(e)
    db.commit()
    return e


@app.patch("/api/expenses/{eid}", response_model=ExpenseOut)
def edit_expense(eid: int, body: ExpensePatch, db: Session = Depends(get_db)):
    e = db.get(Expense, eid) or _404()
    for k, v in body.model_dump(exclude_unset=True).items():
        if k == "currency" and v:
            v = v.upper()
        setattr(e, k, v)
    db.commit()
    return e


@app.delete("/api/expenses/{eid}", status_code=204)
def delete_expense(eid: int, db: Session = Depends(get_db)):
    e = db.get(Expense, eid) or _404()
    db.delete(e)
    db.commit()


def _404():
    raise HTTPException(404, "not found")
