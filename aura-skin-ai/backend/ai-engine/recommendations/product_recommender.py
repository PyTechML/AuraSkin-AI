"""Match detected conditions to product categories; fetch from Supabase; sort by rating, relevance, availability."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def _lower_list(values):
  return [str(v).lower() for v in values if v is not None]


def recommend_products(
    skin_condition: str,
    acne_score: float = 0,
    limit: int = 10,
    skin_type: str | None = None,
    concerns: list[str] | None = None,
) -> list[dict]:
    """
    Returns list of {product_id, confidence_score}.

    Filters products to those that are LIVE in the marketplace by requiring at least
    one approved inventory row. Scores based on skin_condition, optional skin_type
    and concerns, plus rating.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    try:
        from supabase import create_client

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        inv = client.table("inventory").select("product_id").eq("status", "approved").execute()
        if not inv.data:
            return []
        approved_ids = {row["product_id"] for row in inv.data if row.get("product_id")}
        if not approved_ids:
            return []

        cond_lower = (skin_condition or "").lower()
        user_skin_type = (skin_type or "").lower()
        user_concerns = _lower_list(concerns or [])

        data = (
            client.table("products")
            .select("id, name, category, concern, rating, skin_type")
            .in_("id", list(approved_ids))
            .limit(limit * 10)
            .execute()
        )
        if not data.data:
            return []

        products = data.data
        scored: list[dict] = []

        for p in products:
            concern_vals = p.get("concern") or []
            category = (p.get("category") or "").lower()
            product_skin_types = _lower_list(p.get("skin_type") or [])
            product_concerns = _lower_list(concern_vals if isinstance(concern_vals, list) else [concern_vals])

            score = 0.5

            if "acne" in cond_lower and (
                "acne" in category
                or any("acne" in c for c in product_concerns)
            ):
                score += 0.35

            if "inflammation" in cond_lower or "redness" in cond_lower:
                if (
                    "soothing" in category
                    or "sensitive" in category
                    or any("redness" in c or "sensitive" in c for c in product_concerns)
                ):
                    score += 0.35

            if user_skin_type and product_skin_types:
                if any(user_skin_type in st for st in product_skin_types):
                    score += 0.2

            if user_concerns and product_concerns:
                if any(uc in pc for uc in user_concerns for pc in product_concerns):
                    score += 0.25

            rating = p.get("rating") or 0
            try:
                score += min(0.15, (float(rating) or 0) / 5.0 * 0.15)
            except Exception:
                pass

            scored.append(
                {
                    "product_id": p["id"],
                    "confidence_score": round(min(0.99, max(0.0, score)), 4),
                }
            )

        scored.sort(key=lambda x: -x["confidence_score"])
        return scored[:limit]
    except Exception:
        return []
