"""Face bounding box detection using OpenCV Haar Cascade. Reject if no face."""
import cv2
import numpy as np

_CASCADE = None

def _get_cascade():
    global _CASCADE
    if _CASCADE is None:
        path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _CASCADE = cv2.CascadeClassifier(path)
    return _CASCADE

def detect_face(image: np.ndarray) -> tuple[int, int, int, int] | None:
    """
    Return (x, y, w, h) of first face or None if no face.
    image: BGR or grayscale numpy array (uint8 or float in [0,1]).
    """
    if image.dtype == np.float32 or image.dtype == np.float64:
        image = (np.clip(image, 0, 1) * 255).astype(np.uint8)
    if image.ndim == 3 and image.shape[-1] == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image if image.ndim == 2 else image[:, :, 0]
    cascade = _get_cascade()
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    if len(faces) == 0:
        return None
    x, y, w, h = faces[0]
    return (int(x), int(y), int(w), int(h))
