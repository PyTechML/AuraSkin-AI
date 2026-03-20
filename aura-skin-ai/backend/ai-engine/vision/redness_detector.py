"""Redness detection: HSV color analysis and region segmentation. Output redness_score, inflammation_level."""
import cv2
import numpy as np

def detect_redness(image: np.ndarray, face_roi: tuple[int, int, int, int] | None = None) -> dict:
    """
    image: BGR or RGB uint8 or float [0,1].
    Returns {"redness_score": float, "inflammation_level": str}.
    """
    if image.dtype in (np.float32, np.float64):
        image = (np.clip(image, 0, 1) * 255).astype(np.uint8)
    if image.ndim == 2:
        image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if face_roi:
        x, y, w, h = face_roi
        img = image[y : y + h, x : x + w]
    else:
        img = image
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    # Red hue in OpenCV: 0-10 and 170-180
    low1 = cv2.inRange(hsv, np.array([0, 40, 80]), np.array([12, 255, 255]))
    low2 = cv2.inRange(hsv, np.array([168, 40, 80]), np.array([180, 255, 255]))
    red_mask = cv2.bitwise_or(low1, low2)
    red_ratio = np.count_nonzero(red_mask) / red_mask.size if red_mask.size else 0
    # Mean saturation and value in red regions
    mean_sat = np.mean(hsv[:, :, 1][red_mask > 0]) if np.any(red_mask) else 0
    mean_val = np.mean(hsv[:, :, 2][red_mask > 0]) if np.any(red_mask) else 0
    redness_score = red_ratio * 3 + (mean_sat / 255.0) * 0.3 + (mean_val / 255.0) * 0.2
    redness_score = float(np.clip(redness_score, 0, 1))
    if redness_score >= 0.6:
        level = "high"
    elif redness_score >= 0.35:
        level = "moderate"
    elif redness_score >= 0.15:
        level = "mild"
    else:
        level = "low"
    return {"redness_score": round(redness_score, 4), "inflammation_level": level}
