"""
Rule-based skin condition classifier. Future: replace with CNN classifier.
Input: scores from acne/redness detectors. Output: skin_condition label and recommended_routine.
"""
from typing import Any

def classify(
    acne_score: float = 0,
    acne_severity: str = "",
    redness_score: float = 0,
    inflammation_level: str = "",
    **kwargs: Any,
) -> dict[str, str]:
    """
    Returns {"skin_condition": str, "recommended_routine": str}.
    """
    conditions = []
    if acne_score > 0.6:
        conditions.append("acne")
    elif acne_score > 0.3:
        conditions.append("mild acne")
    if redness_score > 0.5:
        conditions.append("inflammation")
    elif redness_score > 0.25:
        conditions.append("mild redness")
    if not conditions:
        conditions.append("generally healthy")
    skin_condition = ", ".join(conditions)
    # Simple routine suggestions
    if "acne" in skin_condition:
        routine = (
            "Cleanse twice daily with a gentle salicylic acid or benzoyl peroxide product. "
            "Apply a non-comedogenic moisturizer and use sunscreen. Avoid touching the face. "
            "Re-assess in 4 weeks; consider a dermatologist if severe."
        )
    elif "inflammation" in skin_condition or "redness" in skin_condition:
        routine = (
            "Use a gentle, fragrance-free cleanser and moisturizer. Apply a soothing product "
            "with niacinamide or centella. Use broad-spectrum sunscreen. Avoid harsh actives. "
            "Re-assess in 2–4 weeks."
        )
    else:
        routine = (
            "Maintain a simple routine: gentle cleanse, moisturize, and sunscreen. "
            "Re-assess periodically."
        )
    return {"skin_condition": skin_condition, "recommended_routine": routine}
