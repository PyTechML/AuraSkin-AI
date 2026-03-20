"""Find nearest dermatologists; sort by distance, rating, specialization."""
import os
import sys
import math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

def recommend_dermatologists(
    city: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    limit: int = 10,
) -> list[dict]:
    """Returns list of {dermatologist_id, distance_km (optional)}."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        query = client.table("dermatologists").select("id, city, latitude, longitude, rating, specialization").limit(limit * 3)
        if city and city.strip():
            query = query.ilike("city", f"%{city.strip()}%")
        data = query.execute()
        if not data.data:
            return []
        rows = data.data
        out = []
        for r in rows:
            dist = None
            if latitude is not None and longitude is not None and r.get("latitude") is not None and r.get("longitude") is not None:
                dist = math.sqrt((float(r["latitude"]) - latitude) ** 2 + (float(r["longitude"]) - longitude) ** 2) * 111  # approx km
                dist = round(dist, 2)
            out.append({"dermatologist_id": r["id"], "distance_km": dist, "rating": float(r.get("rating") or 0)})
        if latitude is not None and longitude is not None:
            out.sort(key=lambda x: (x["distance_km"] or 9999, -x["rating"]))
        else:
            out.sort(key=lambda x: -x["rating"])
        return [{"dermatologist_id": x["dermatologist_id"], "distance_km": x["distance_km"]} for x in out[:limit]]
    except Exception:
        return []
