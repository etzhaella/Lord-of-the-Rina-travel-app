"""Load the trip plan once, and refine its coordinates with Google Places."""

import json
import logging
from datetime import date
from pathlib import Path

from sqlalchemy import select

from . import places
from .db import SessionLocal
from .geo import haversine_km
from .models import AppMeta, Destination, Hotel

log = logging.getLogger("rina.seed")
SEED_FILE = Path(__file__).with_name("trip_seed.json")
SEED_KEY = "trip_seed_v1"


def _d(v: str | None) -> date | None:
    return date.fromisoformat(v) if v else None


def load_trip_plan() -> None:
    """Insert the hotel + destinations from trip_seed.json the first time only."""
    if not SEED_FILE.exists():
        return
    with SessionLocal() as db:
        if db.get(AppMeta, SEED_KEY):
            return
        data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
        has_hotel = db.scalar(select(Hotel.id).limit(1))
        h = data.get("hotel")
        if h and not has_hotel:
            db.add(
                Hotel(
                    name=h["name"],
                    address=h.get("address"),
                    lat=h["lat"],
                    lng=h["lng"],
                    check_in=_d(h.get("check_in")),
                    check_out=_d(h.get("check_out")),
                    notes=h.get("notes"),
                    is_active=True,
                )
            )
        for i, d in enumerate(data.get("destinations", [])):
            db.add(
                Destination(
                    name=d["name"],
                    address=d.get("address"),
                    lat=d["lat"],
                    lng=d["lng"],
                    category=d.get("category"),
                    planned_date=_d(d.get("planned_date")),
                    notes=d.get("notes"),
                    sort_order=i,
                )
            )
        db.add(AppMeta(key=SEED_KEY, value="done"))
        db.commit()
        log.info("trip plan loaded")


HOTEL_FIX_KEY = "hotel_fix_v2"
HOTEL = {
    "name": "Hôtel Maison Turenne",
    "address": "Hotel Turenne, 10 Rte de Bâle, 68000 Colmar, France",
    # official coordinates (France Vélo Tourisme / Alsace tourism data)
    "lat": 48.07187547,
    "lng": 7.36061587,
}


def fix_hotel_location() -> None:
    """One-time correction of the hotel's address/coordinates in existing databases."""
    with SessionLocal() as db:
        if db.get(AppMeta, HOTEL_FIX_KEY):
            return
        hotels = db.scalars(select(Hotel)).all()
        target = next((h for h in hotels if "turenne" in h.name.lower()), None)
        if target is None:
            target = next((h for h in hotels if h.is_active), None)
        if target is None:
            target = Hotel(is_active=True, check_in=date(2026, 11, 25), check_out=date(2026, 11, 29))
            db.add(target)
        target.name = HOTEL["name"]
        target.address = HOTEL["address"]
        target.lat = HOTEL["lat"]
        target.lng = HOTEL["lng"]
        # pinned manually: keep refine_locations() from moving it again
        target.place_id = "manual-hotel-turenne"
        db.add(AppMeta(key=HOTEL_FIX_KEY, value="done"))
        db.commit()
        log.info("hotel location corrected")


async def refine_locations() -> None:
    """With a Google key: snap places without a place_id to their exact Google location."""
    if places.MOCK:
        return
    with SessionLocal() as db:
        rows = list(db.scalars(select(Hotel).where(Hotel.place_id.is_(None))).all()) + list(
            db.scalars(select(Destination).where(Destination.place_id.is_(None))).all()
        )
        for row in rows:
            query = f"{row.name}, {row.address}" if row.address else row.name
            try:
                found = await places.text_search(query, row.lat, row.lng)  # bias only if known
            except Exception as e:  # network / quota: try again next startup
                log.warning("refine failed for %s: %s", row.name, e)
                continue
            if not found:
                continue
            best = found[0]
            # only accept a match close to where we expected it (when we know where that is)
            if row.lat is not None and row.lng is not None and haversine_km(row.lat, row.lng, best.lat, best.lng) > 5:
                log.info("skip refine for %s: best match too far (%s)", row.name, best.name)
                continue
            row.lat, row.lng, row.place_id = best.lat, best.lng, best.place_id
            if not row.address and best.address:
                row.address = best.address
            if isinstance(row, Destination):
                row.photo_name = row.photo_name or best.photo_name
                row.rating = row.rating or best.rating
            log.info("refined %s -> %.5f,%.5f", row.name, best.lat, best.lng)
        db.commit()
