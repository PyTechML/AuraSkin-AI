"""
Generate skincare routine plan from skin type, concerns, and analysis scores.
Matches logic of backend NestJS routine-engine for consistency.
"""


def generate_routine(
    skin_type: str = "",
    concerns: list = None,
    acne_score: float = None,
    pigmentation_score: float = None,
    hydration_score: float = None,
):
    concerns = concerns or []
    skin_type = (skin_type or "").lower()
    concerns_lower = [c.lower() for c in concerns]

    morning = []
    night = []
    food_advice = []
    hydration = []
    sleep = []

    # Morning
    morning.append("Cleanse with a gentle, non-stripping cleanser")
    if "oily" in skin_type:
        morning.append("Use a lightweight, oil-control moisturizer")
    elif "dry" in skin_type:
        morning.append("Apply a rich, barrier-repair moisturizer")
    else:
        morning.append("Use a balanced moisturizer suited for normal/combination skin")
    morning.append("Apply broad-spectrum SPF 30+ every morning as the last step")
    if pigmentation_score is not None and pigmentation_score >= 0.6:
        morning.append("Use a brightening serum (vitamin C, niacinamide) to target dark spots")

    # Night
    night.append("Double cleanse in the evening if you wore sunscreen or makeup")
    night.append("Apply a hydrating serum to replenish moisture overnight")
    has_acne = any("acne" in c or "breakout" in c for c in concerns_lower) or (
        acne_score is not None and acne_score >= 0.6
    )
    if has_acne:
        night.append("Introduce a BHA (salicylic acid) treatment 2–3x per week for congestion")
    if pigmentation_score is not None and pigmentation_score >= 0.6:
        night.append("Use pigment-fading actives (azelaic acid, niacinamide) on alternate nights")
    night.append("Finish with a moisturizer appropriate for your skin type")
    has_dryness = "dry" in skin_type or any("dry" in c or "flaky" in c for c in concerns_lower) or (
        hydration_score is not None and hydration_score < 0.5
    )
    if has_dryness:
        night.append("Consider adding an overnight barrier-repair mask 2–3x per week")
    has_sensitivity = any(
        "sensitive" in c or "red" in c or "irritation" in c for c in concerns_lower
    )
    if has_sensitivity:
        night.append("Avoid harsh scrubs and high-percentage acids; patch test any new active.")

    # Lifestyle
    food_advice.append(
        "Prioritize whole foods rich in antioxidants (fruits, vegetables, healthy fats)"
    )
    if has_acne:
        food_advice.append(
            "Moderate high-glycemic foods and excessive dairy if they trigger breakouts for you."
        )
    hydration.append(
        "Aim for steady water intake across the day rather than large infrequent amounts."
    )
    hydration.append(
        "Limit extremely dehydrating habits (very high caffeine, smoking, heavy alcohol)."
    )
    sleep.append("Target 7–8 hours of consistent sleep where possible.")
    sleep.append("Maintain a regular wind-down routine and avoid blue light right before bed.")

    return {
        "morning_routine": morning,
        "night_routine": night,
        "lifestyle_food_advice": food_advice,
        "lifestyle_hydration": hydration,
        "lifestyle_sleep": sleep,
    }
