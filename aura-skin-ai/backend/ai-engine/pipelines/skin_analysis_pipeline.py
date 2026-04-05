"""
Skin analysis pipeline: validate -> detect face -> landmarks -> features -> classify -> recommend.
Input: list of image URLs (or preloaded arrays). Output: predictions + recommendation payload.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import numpy as np
from utils.image_loader import load_and_preprocess
from validation.face_validator import validate_image, INVALID_MESSAGE
from vision.face_detector import detect_face
from vision.face_landmarks import get_landmarks, get_region_masks
from vision.acne_detector import detect_acne
from vision.redness_detector import detect_redness
from classifiers.skin_classifier import classify


def _clamp01(value: float) -> float:
    return float(max(0.0, min(1.0, value)))


def _estimate_oil_level(face_bgr: np.ndarray) -> float:
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    # Brighter highlights often correlate with oiliness in uncontrolled lighting.
    highlights = float(np.mean(gray > 210))
    variance = float(np.var(gray) / (255.0 * 255.0))
    return float(max(0.0, min(1.0, 0.6 * highlights + 0.4 * variance)))


def _estimate_pigmentation(face_bgr: np.ndarray) -> tuple[float, dict]:
    lab = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0].astype(np.float32)
    h, w = l_channel.shape[:2]
    half_h = max(1, h // 2)
    half_w = max(1, w // 2)
    zones = {
        "upper_left": float(np.std(l_channel[:half_h, :half_w]) / 64.0),
        "upper_right": float(np.std(l_channel[:half_h, half_w:]) / 64.0),
        "lower_left": float(np.std(l_channel[half_h:, :half_w]) / 64.0),
        "lower_right": float(np.std(l_channel[half_h:, half_w:]) / 64.0),
    }
    normalized_zones = {k: float(max(0.0, min(1.0, v))) for k, v in zones.items()}
    pigmentation = float(sum(normalized_zones.values()) / max(1, len(normalized_zones)))
    return pigmentation, normalized_zones


def _estimate_hydration(oil_level: float, redness_score: float, pigmentation_score: float) -> float:
    # Heuristic hydration estimate (0-1). Higher oil/redness generally correlates with lower hydration quality.
    hydration = 0.75 - (oil_level * 0.45) - (redness_score * 0.2) + ((1.0 - pigmentation_score) * 0.05)
    return _clamp01(hydration)

def run(
    image_urls: list[str],
    progress_callback: callable = None,
) -> dict:
    """
    image_urls: typically [front_face, left_profile, right_profile] (same order as Nest upload); additional angles optional.
    progress_callback(stage: str, progress: int) optional.
    Returns {"predictions": {...}, "recommendations": {"product_ids": [], "dermatologist_ids": []}}
    or raises ValueError(INVALID_MESSAGE) on validation failure.
    """
    def progress(stage: str, pct: int):
        if progress_callback:
            progress_callback(stage, pct)

    progress("image_validation", 5)
    images = []
    for url in image_urls:
        arr = load_and_preprocess(url)
        valid, err = validate_image(arr)
        if not valid:
            raise ValueError(err or INVALID_MESSAGE)
        images.append(arr)
    progress("face_detection", 15)
    processed_images = []
    for img in images:
        img_uint8 = (img * 255).astype(np.uint8) if img.dtype == np.float32 else img
        if img_uint8.shape[-1] == 3:
            bgr = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2BGR)
        else:
            bgr = img_uint8
        face_roi = detect_face(bgr)
        if face_roi is not None:
            processed_images.append((bgr, face_roi))
    if not processed_images:
        raise ValueError(INVALID_MESSAGE)

    # Keep first valid face as primary for best-effort landmark pass.
    primary_bgr, _ = processed_images[0]
    progress("landmark_detection", 25)
    primary_rgb = primary_bgr[:, :, ::-1] if len(primary_bgr.shape) == 3 else primary_bgr
    # Landmarks are not currently used downstream; keep best-effort to avoid hard dependency issues
    # across MediaPipe distributions/environments.
    try:
        _ = get_landmarks(primary_rgb)
    except Exception:
        _ = None
    progress("feature_extraction", 45)
    acne_samples: list[dict] = []
    redness_samples: list[dict] = []
    oil_samples: list[float] = []
    pigmentation_samples: list[float] = []
    zones_samples: list[dict] = []
    for bgr, face_roi in processed_images:
        acne_samples.append(detect_acne(bgr, face_roi))
        redness_samples.append(detect_redness(bgr, face_roi))
        oil_samples.append(_estimate_oil_level(face_roi))
        pig_score, pig_zones = _estimate_pigmentation(face_roi)
        pigmentation_samples.append(pig_score)
        zones_samples.append(pig_zones)

    acne_score = float(np.mean([s["acne_score"] for s in acne_samples])) if acne_samples else 0.0
    redness_score = float(np.mean([s["redness_score"] for s in redness_samples])) if redness_samples else 0.0
    oil_level = float(np.mean(oil_samples)) if oil_samples else 0.0
    pigmentation = float(np.mean(pigmentation_samples)) if pigmentation_samples else 0.0

    severity_rank = {"mild": 1, "moderate": 2, "severe": 3}
    acne_severity = max(
        (s.get("acne_severity", "mild") for s in acne_samples),
        key=lambda label: severity_rank.get(str(label).lower(), 1),
        default="mild",
    )
    inflammation_rank = {"low": 1, "medium": 2, "high": 3}
    inflammation_level = max(
        (s.get("inflammation_level", "low") for s in redness_samples),
        key=lambda label: inflammation_rank.get(str(label).lower(), 1),
        default="low",
    )

    zone_totals: dict[str, float] = {}
    zone_counts: dict[str, int] = {}
    for z in zones_samples:
        for key, value in z.items():
            zone_totals[key] = zone_totals.get(key, 0.0) + float(value)
            zone_counts[key] = zone_counts.get(key, 0) + 1
    zones = {k: _clamp01(zone_totals[k] / max(1, zone_counts[k])) for k in zone_totals}
    hydration_score = _estimate_hydration(oil_level, redness_score, pigmentation)
    progress("skin_classification", 65)
    class_out = classify(
        acne_score=acne_score,
        acne_severity=acne_severity,
        redness_score=redness_score,
        inflammation_level=inflammation_level,
    )
    progress("recommendation_generation", 85)
    predictions = {
        "skin_condition": class_out["skin_condition"],
        "recommended_routine": class_out["recommended_routine"],
        "acne_score": acne_score,
        "oil_level": oil_level,
        "pigmentation": pigmentation,
        "acne_severity": acne_severity,
        "redness_score": redness_score,
        "inflammation_level": inflammation_level,
        "pigmentation_score": pigmentation,
        "hydration_score": hydration_score,
        "confidence": _clamp01(1.0 - (acne_score * 0.35 + pigmentation * 0.35 + redness_score * 0.3)),
        "zones": zones,
    }
    # Placeholder; worker will fill from DB
    recommendations = {"product_ids": [], "dermatologist_ids": []}
    progress("completed", 100)
    return {"predictions": predictions, "recommendations": recommendations}
