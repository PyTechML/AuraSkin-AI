"""Match detected conditions to product categories; fetch from Supabase; sort by rating, relevance, availability."""
import hashlib
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


def _lower_list(values):
    return [str(v).lower() for v in values if v is not None]


_CHUNK = 120

# Baseline match score; products need meaningful lift (not rating-only) to be recommended.
_BASELINE = 0.5
_MIN_SIGNAL = 0.03  # minimum relevance lift (excluding baseline and rating) to qualify


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", (text or "").lower()))


def _stable_tie_key(product_id: str, seed: str) -> int:
    h = hashlib.sha256(f"{seed}|{product_id}".encode()).hexdigest()
    return int(h[:15], 16)


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def recommend_products(
    skin_condition: str,
    acne_score: float = 0,
    limit: int = 10,
    skin_type: str | None = None,
    concerns: list[str] | None = None,
    *,
    pigmentation_score: float | None = None,
    hydration_score: float | None = None,
    assessment_id: str | None = None,
) -> list[dict]:
    """
    Returns list of {product_id, confidence_score}.

    Filters products to those that are LIVE in the marketplace by requiring at least
    one approved inventory row. Scores use skin_condition text, numeric analysis scores,
    skin_type, concerns, product metadata, and rating.

    Returns [] when no product has enough signal above baseline (avoids always showing
    the same pair due to rating-only tie-breaks).
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return []
    try:
        from supabase import create_client

        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        inv = client.table("inventory").select("product_id").eq("status", "approved").execute()
        if not inv.data:
            return []
        approved_ids = sorted({row["product_id"] for row in inv.data if row.get("product_id")})
        if not approved_ids:
            return []

        cond_lower = (skin_condition or "").lower()
        user_skin_type = (skin_type or "").lower()
        user_concerns = _lower_list(concerns or [])

        try:
            ac = _clamp01(float(acne_score)) if acne_score is not None else 0.0
        except (TypeError, ValueError):
            ac = 0.0
        try:
            pig = _clamp01(float(pigmentation_score)) if pigmentation_score is not None else None
        except (TypeError, ValueError):
            pig = None
        try:
            hyd = _clamp01(float(hydration_score)) if hydration_score is not None else None
        except (TypeError, ValueError):
            hyd = None

        user_text = " ".join([cond_lower, " ".join(user_concerns)])
        user_tokens = _tokenize(user_text)

        products: list[dict] = []
        for i in range(0, len(approved_ids), _CHUNK):
            chunk = approved_ids[i : i + _CHUNK]
            chunk_res = (
                client.table("products")
                .select("id, name, category, concern, rating, skin_type, key_ingredients")
                .in_("id", chunk)
                .eq("approval_status", "LIVE")
                .execute()
            )
            if chunk_res.data:
                products.extend(chunk_res.data)

        if not products:
            return []

        tie_seed = (assessment_id or "") + "|" + cond_lower + "|" + ",".join(sorted(user_concerns))

        scored: list[dict] = []

        for p in products:
            concern_vals = p.get("concern") or []
            name_lower = (p.get("name") or "").lower()
            category = (p.get("category") or "").lower()
            product_skin_types = _lower_list(p.get("skin_type") or [])
            product_concerns = _lower_list(concern_vals if isinstance(concern_vals, list) else [concern_vals])
            ing = p.get("key_ingredients") or []
            if isinstance(ing, list):
                ing_text = " ".join(str(x) for x in ing).lower()
            else:
                ing_text = str(ing).lower()

            product_blob = " ".join([name_lower, category, " ".join(product_concerns), ing_text])
            product_tokens = _tokenize(product_blob)

            # Signal = relevance lift only (excludes baseline 0.5 and rating).
            signal = 0.0

            if "acne" in cond_lower and (
                "acne" in category
                or "acne" in name_lower
                or any("acne" in c for c in product_concerns)
            ):
                signal += 0.2 + 0.15 * ac

            if ac >= 0.35 and (
                "salicylic" in product_blob
                or "bha" in product_blob
                or "benzoyl" in product_blob
            ):
                signal += 0.12 + 0.08 * ac

            if "inflammation" in cond_lower or "redness" in cond_lower:
                if (
                    "soothing" in category
                    or "sensitive" in category
                    or "soothing" in name_lower
                    or any("redness" in c or "sensitive" in c for c in product_concerns)
                ):
                    signal += 0.22

            if pig is not None and pig >= 0.35:
                if (
                    "bright" in product_blob
                    or "vitamin c" in product_blob
                    or "niacinamide" in product_blob
                    or "pigment" in product_blob
                    or "dark spot" in product_blob
                ):
                    signal += 0.1 + 0.12 * pig

            if hyd is not None and hyd < 0.5:
                if (
                    "hydrat" in product_blob
                    or "moistur" in product_blob
                    or "ceramide" in product_blob
                    or "hyaluronic" in product_blob
                    or "barrier" in product_blob
                ):
                    signal += 0.1 + 0.12 * (0.5 - hyd)

            if user_skin_type and product_skin_types:
                if any(user_skin_type in st for st in product_skin_types):
                    signal += 0.18

            if user_concerns and product_concerns:
                overlap_uc = sum(1 for uc in user_concerns for pc in product_concerns if uc in pc or pc in uc)
                if overlap_uc:
                    signal += min(0.28, 0.14 + 0.07 * overlap_uc)

            # Token overlap between user context and product text
            if user_tokens and product_tokens:
                inter = user_tokens & product_tokens
                # drop very short tokens
                inter = {t for t in inter if len(t) >= 3}
                if inter:
                    signal += min(0.2, 0.04 * len(inter))

            rating = p.get("rating") or 0
            try:
                rating_bonus = min(0.12, (float(rating) or 0) / 5.0 * 0.12)
            except Exception:
                rating_bonus = 0.0

            final = _BASELINE + signal + rating_bonus
            final = round(min(0.99, max(0.0, final)), 4)

            scored.append(
                {
                    "product_id": p["id"],
                    "confidence_score": final,
                    "_signal": signal,
                    "_tie": _stable_tie_key(str(p["id"]), tie_seed),
                }
            )

        if not scored:
            return []

        signals = [row["_signal"] for row in scored]
        max_sig = max(signals)

        if max_sig < _MIN_SIGNAL:
            return []

        qualified = [row for row in scored if row["_signal"] >= _MIN_SIGNAL]
        if not qualified:
            return []

        qualified.sort(
            key=lambda x: (-x["confidence_score"], -x["_signal"], x["_tie"])
        )

        out = []
        for row in qualified[:limit]:
            out.append(
                {
                    "product_id": row["product_id"],
                    "confidence_score": row["confidence_score"],
                }
            )
        return out
    except Exception:
        return []
