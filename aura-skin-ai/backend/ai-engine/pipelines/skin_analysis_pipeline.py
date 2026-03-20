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

def run(
    image_urls: list[str],
    progress_callback: callable = None,
) -> dict:
    """
    image_urls: order [front_face, left_profile, right_profile, upward_angle, downward_angle].
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
    # Use first (front) image for main analysis
    primary = (images[0] * 255).astype(np.uint8) if images[0].dtype == np.float32 else images[0]
    if primary.shape[-1] == 3:
        primary_bgr = cv2.cvtColor(primary, cv2.COLOR_RGB2BGR)
    else:
        primary_bgr = primary
    face_roi = detect_face(primary_bgr)
    if face_roi is None:
        raise ValueError(INVALID_MESSAGE)
    progress("landmark_detection", 25)
    primary_rgb = primary_bgr[:, :, ::-1] if len(primary_bgr.shape) == 3 else primary_bgr
    # Landmarks are not currently used downstream; keep best-effort to avoid hard dependency issues
    # across MediaPipe distributions/environments.
    try:
        _ = get_landmarks(primary_rgb)
    except Exception:
        _ = None
    progress("feature_extraction", 45)
    acne_out = detect_acne(primary_bgr, face_roi)
    redness_out = detect_redness(primary_bgr, face_roi)
    oil_level = _estimate_oil_level(face_roi)
    pigmentation, zones = _estimate_pigmentation(face_roi)
    progress("skin_classification", 65)
    class_out = classify(
        acne_score=acne_out["acne_score"],
        acne_severity=acne_out["acne_severity"],
        redness_score=redness_out["redness_score"],
        inflammation_level=redness_out["inflammation_level"],
    )
    progress("recommendation_generation", 85)
    predictions = {
        "skin_condition": class_out["skin_condition"],
        "recommended_routine": class_out["recommended_routine"],
        "acne_score": acne_out["acne_score"],
        "oil_level": oil_level,
        "pigmentation": pigmentation,
        "acne_severity": acne_out["acne_severity"],
        "redness_score": redness_out["redness_score"],
        "inflammation_level": redness_out["inflammation_level"],
        "pigmentation_score": pigmentation,
        "hydration_score": 0.5,
        "confidence": float(max(0.0, min(1.0, 1.0 - (acne_out["acne_score"] * 0.35 + pigmentation * 0.35 + redness_out["redness_score"] * 0.3)))),
        "zones": zones,
    }
    # Placeholder; worker will fill from DB
    recommendations = {"product_ids": [], "dermatologist_ids": []}
    progress("completed", 100)
    return {"predictions": predictions, "recommendations": recommendations}
