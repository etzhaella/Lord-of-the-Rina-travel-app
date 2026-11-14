"""Google Places API (New) client + demo-mode fallback.

The API key stays on the server; the browser only ever talks to /api/*.
If GOOGLE_PLACES_API_KEY is empty the app runs in demo mode with
generated places, so the whole stack can be tried without a key.
"""

import hashlib
import math
import os
import random
import time

import httpx

from .geo import haversine_km
from .schemas import Place

KEY_VARS = ("GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", "GOOGLE_API_KEY", "PLACES_API_KEY")


def _read_key() -> tuple[str, str | None]:
    """First non-empty key among the accepted variable names (quotes/whitespace stripped)."""
    for name in KEY_VARS:
        value = os.getenv(name, "").strip().strip('"').strip("'").strip()
        if value:
            return value, name
    return "", None


GOOGLE_KEY, KEY_SOURCE = _read_key()
LANGUAGE = os.getenv("PLACES_LANGUAGE", "en")
BASE = "https://places.googleapis.com/v1"

FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.photos",
        "places.types",
        "places.currentOpeningHours.openNow",
    ]
)

PRICE_MAP = {
    "PRICE_LEVEL_FREE": 0,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}

# sub-category -> how to query Google
CATEGORY_CONFIG: dict[str, dict] = {
    "breakfast": {"types": ["breakfast_restaurant", "brunch_restaurant"]},
    "coffee": {"types": ["cafe", "coffee_shop"]},
    "dinner": {"types": ["restaurant"]},
    "attractions": {"types": ["tourist_attraction"]},
    "museums": {"types": ["museum", "art_gallery"]},
    "parks": {"types": ["park", "national_park"]},
    "viewpoints": {"text": "scenic viewpoint observation deck"},
    "christmas": {"text": "Christmas market"},
}

MOCK = not GOOGLE_KEY


async def check_key() -> dict:
    """Live check of the key against Places API (New). Never returns the key itself."""
    if MOCK:
        return {
            "ok": False,
            "mode": "demo",
            "reason": "No key reached the server. Set one of these environment variables and restart the backend.",
            "accepted_variables": list(KEY_VARS),
        }
    body = {"textQuery": "Colmar Christmas market", "pageSize": 1}
    headers = {**_headers(), "X-Goog-FieldMask": "places.id,places.displayName"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"{BASE}/places:searchText", json=body, headers=headers)
    except httpx.HTTPError as e:
        return {"ok": False, "mode": "live", "key_variable": KEY_SOURCE, "reason": f"network error: {e}"}
    if r.status_code == 200:
        found = (r.json().get("places") or [{}])[0].get("displayName", {}).get("text")
        return {"ok": True, "mode": "live", "key_variable": KEY_SOURCE, "sample_result": found}
    try:
        err = r.json().get("error", {})
        msg = err.get("message", r.text[:300])
        status = err.get("status")
    except ValueError:
        msg, status = r.text[:300], None
    hint = {
        "PERMISSION_DENIED": "Enable 'Places API (New)' in the key's project, and check the key's API restrictions allow it.",
        "INVALID_ARGUMENT": "The key looks invalid - copy it again (starts with AIza).",
        "RESOURCE_EXHAUSTED": "Quota exceeded or billing not enabled on the project.",
    }.get(status or "", "See the message from Google.")
    return {
        "ok": False,
        "mode": "live",
        "key_variable": KEY_SOURCE,
        "http_status": r.status_code,
        "google_status": status,
        "google_message": msg,
        "hint": hint,
    }


def _headers() -> dict:
    return {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
    }


def _parse(p: dict, lat: float | None, lng: float | None) -> Place:
    loc = p.get("location", {})
    plat, plng = loc.get("latitude", 0.0), loc.get("longitude", 0.0)
    photos = p.get("photos") or []
    return Place(
        place_id=p["id"],
        name=(p.get("displayName") or {}).get("text", "?"),
        address=p.get("formattedAddress"),
        lat=plat,
        lng=plng,
        rating=p.get("rating"),
        user_ratings_total=p.get("userRatingCount"),
        price_level=PRICE_MAP.get(p.get("priceLevel", ""), None),
        photo_name=photos[0]["name"] if photos else None,
        open_now=(p.get("currentOpeningHours") or {}).get("openNow"),
        types=p.get("types", []),
        distance_km=round(haversine_km(lat, lng, plat, plng), 2)
        if lat is not None and lng is not None
        else None,
    )


async def nearby(category: str, lat: float, lng: float, radius_km: float) -> list[Place]:
    cfg = CATEGORY_CONFIG.get(category)
    if cfg is None:
        raise ValueError(f"unknown category {category}")
    if MOCK:
        return _mock_places(category, lat, lng, radius_km)

    radius_m = min(max(radius_km, 0.2) * 1000, 50000)
    circle = {"circle": {"center": {"latitude": lat, "longitude": lng}, "radius": radius_m}}
    async with httpx.AsyncClient(timeout=15) as client:
        if "types" in cfg:
            body = {
                "includedTypes": cfg["types"],
                "maxResultCount": 20,
                "rankPreference": "POPULARITY",
                "languageCode": LANGUAGE,
                "locationRestriction": circle,
            }
            r = await client.post(f"{BASE}/places:searchNearby", json=body, headers=_headers())
        else:
            body = {
                "textQuery": cfg["text"],
                "pageSize": 20,
                "languageCode": LANGUAGE,
                "locationBias": circle,
            }
            r = await client.post(f"{BASE}/places:searchText", json=body, headers=_headers())
    r.raise_for_status()
    places = [_parse(p, lat, lng) for p in r.json().get("places", [])]
    # text search only *biases* to the circle -> enforce radius ourselves
    return [p for p in places if p.distance_km is None or p.distance_km <= radius_km]


async def text_search(q: str, lat: float | None, lng: float | None) -> list[Place]:
    if MOCK:
        base_lat, base_lng = (lat, lng) if lat is not None and lng is not None else (48.2082, 16.3738)
        return _mock_search(q, base_lat, base_lng)
    body: dict = {"textQuery": q, "pageSize": 10, "languageCode": LANGUAGE}
    if lat is not None and lng is not None:
        body["locationBias"] = {
            "circle": {"center": {"latitude": lat, "longitude": lng}, "radius": 50000}
        }
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.post(f"{BASE}/places:searchText", json=body, headers=_headers())
    r.raise_for_status()
    return [_parse(p, lat, lng) for p in r.json().get("places", [])]


_photo_cache: dict[str, tuple[float, str]] = {}


async def photo_url(name: str, width: int = 600) -> str | None:
    """Resolve a Places photo resource name to a public googleusercontent URL."""
    if MOCK or not name.startswith("places/"):
        return None
    key = f"{name}|{width}"
    hit = _photo_cache.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{BASE}/{name}/media",
            params={"maxWidthPx": width, "skipHttpRedirect": "true", "key": GOOGLE_KEY},
        )
    if r.status_code != 200:
        return None
    uri = r.json().get("photoUri")
    if uri:
        _photo_cache[key] = (time.time() + 3600, uri)
    return uri


# ---------------------------------------------------------------- demo mode
_MOCK_NAMES = {
    "breakfast": ["Sunny Side Café", "Morning Bakery", "Brunch & Co", "Rina's Table", "The Egg House", "Golden Croissant"],
    "coffee": ["Little Bean", "Kaffeehaus Central", "Roast Lab", "Café am Platz", "Espresso Corner", "Milk & Foam"],
    "dinner": ["Old Town Bistro", "Trattoria Nonna", "Riverside Grill", "Schnitzel Haus", "Olive & Thyme", "The Lantern"],
    "attractions": ["Old Clock Tower", "Royal Palace", "Cathedral Square", "City Zoo", "Giant Ferris Wheel", "Castle Hill"],
    "museums": ["Museum of Art", "Natural History Museum", "Toy Museum", "Science Center", "Modern Gallery", "City Museum"],
    "parks": ["Central Park", "Rose Garden", "Lakeside Park", "Botanical Garden", "Forest Trail", "Palace Gardens"],
    "viewpoints": ["Sunset Lookout", "Hilltop View", "Tower Observation Deck", "Bridge Panorama", "Castle Terrace"],
    "christmas": ["Old Town Christmas Market", "Christkindlmarkt am Rathaus", "Winter Wonderland", "Palace Xmas Village", "Advent Market Square"],
}


def _rng(*parts) -> random.Random:
    seed = int(hashlib.md5("|".join(map(str, parts)).encode()).hexdigest()[:8], 16)
    return random.Random(seed)


def _offset(lat: float, lng: float, km: float, bearing: float) -> tuple[float, float]:
    dlat = (km / 111.0) * math.cos(bearing)
    dlng = (km / (111.0 * max(math.cos(math.radians(lat)), 0.01))) * math.sin(bearing)
    return lat + dlat, lng + dlng


def _mock_places(category: str, lat: float, lng: float, radius_km: float) -> list[Place]:
    # anchor to a ~1km grid so results stay stable while the user walks around
    alat, alng = round(lat, 2), round(lng, 2)
    rnd = _rng(category, alat, alng)
    out = []
    for i, name in enumerate(_MOCK_NAMES[category]):
        km = rnd.uniform(0.15, 18)
        plat, plng = _offset(alat, alng, km, rnd.uniform(0, 2 * math.pi))
        d = round(haversine_km(lat, lng, plat, plng), 2)
        if d > radius_km:
            continue
        out.append(
            Place(
                place_id=f"demo-{category}-{i}-{alat}-{alng}",
                name=name,
                address=f"{rnd.randint(1, 120)} Demo Street",
                lat=plat,
                lng=plng,
                rating=round(rnd.uniform(3.9, 4.95), 1),
                user_ratings_total=rnd.randint(40, 9000),
                price_level=None if category in ("parks", "viewpoints") else rnd.randint(1, 4),
                photo_name=None,
                open_now=rnd.random() > 0.25,
                types=[category],
                distance_km=d,
            )
        )
    return out


def _mock_search(q: str, lat: float, lng: float) -> list[Place]:
    rnd = _rng("search", q.lower())
    out = []
    for i in range(5):
        plat, plng = _offset(lat, lng, rnd.uniform(0.3, 8), rnd.uniform(0, 2 * math.pi))
        out.append(
            Place(
                place_id=f"demo-search-{hashlib.md5(q.encode()).hexdigest()[:6]}-{i}",
                name=f"{q.title()}" + ("" if i == 0 else f" #{i + 1}"),
                address=f"{rnd.randint(1, 120)} Demo Avenue",
                lat=plat,
                lng=plng,
                rating=round(rnd.uniform(3.8, 4.9), 1),
                user_ratings_total=rnd.randint(20, 3000),
                types=["point_of_interest"],
                distance_km=round(haversine_km(lat, lng, plat, plng), 2),
            )
        )
    return out
