"""Acne detection: blob detection, color segmentation, texture. Output acne_score, acne_severity."""
import cv2
import numpy as np

def detect_acne(image: np.ndarray, face_roi: tuple[int, int, int, int] | None = None) -> dict:
    """
    image: BGR or RGB uint8 or float [0,1]. Optional face_roi (x,y,w,h).
    Returns {"acne_score": float, "acne_severity": str}.
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
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Blob detection (dark spots / lesions)
    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.minArea = 15
    params.maxArea = 500
    params.filterByCircularity = False
    det = cv2.SimpleBlobDetector_create(params)
    keypoints = det.detect(gray)
    # Color: reddish/brownish in RGB for lesions
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    lower = np.array([0, 20, 60])
    upper = np.array([25, 255, 255])
    mask_red = cv2.inRange(hsv, lower, upper)
    lesion_pixels = np.count_nonzero(mask_red)
    total = mask_red.size
    color_ratio = lesion_pixels / total if total else 0
    # Texture: high local variance can indicate bumps
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    diff = cv2.absdiff(gray, blur)
    texture_score = np.mean(diff) / 255.0 if gray.size else 0
    # Combine: more blobs + more reddish + texture -> higher score
    blob_score = min(1.0, len(keypoints) / 30.0)
    acne_score = 0.4 * blob_score + 0.4 * min(1.0, color_ratio * 10) + 0.2 * min(1.0, texture_score * 2)
    acne_score = float(np.clip(acne_score, 0, 1))
    if acne_score >= 0.7:
        severity = "severe"
    elif acne_score >= 0.4:
        severity = "moderate"
    elif acne_score >= 0.2:
        severity = "mild"
    else:
        severity = "minimal"
    return {"acne_score": round(acne_score, 4), "acne_severity": severity}
