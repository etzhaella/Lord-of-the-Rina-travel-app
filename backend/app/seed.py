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
                found = await places.text_search(query, row.lat, row.lng)
            except Exception as e:  # network / quota: try again next startup
                log.warning("refine failed for %s: %s", row.name, e)
                continue
            if not found:
                continue
            best = found[0]
            # only accept a match close to where we expected it
            if haversine_km(row.lat, row.lng, best.lat, best.lng) > 5:
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
