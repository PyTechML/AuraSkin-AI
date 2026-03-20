"""
Face image validation: format, size, resolution, face presence, single face, blur, lighting.
Returns (True, None) or (False, "Invalid face image detected. Please upload clear facial photos.").
"""
import cv2
import numpy as np

INVALID_MESSAGE = "Please upload a clear face image."

MIN_SIDE = 200
MAX_PIXELS = 16_000_000
MIN_FACE_SIZE_RATIO = 0.15
MAX_FACES = 1
LAPVAR_BLUR_THRESHOLD = 80  # below this consider blurry
BRIGHTNESS_MEAN_LOW = 30
BRIGHTNESS_MEAN_HIGH = 240

def validate_buffer(data: bytes, mime: str = "image/jpeg") -> tuple[bool, str | None]:
    """Validate from bytes. Returns (valid, error_message)."""
    if mime not in ("image/jpeg", "image/png", "image/jpg"):
        return False, INVALID_MESSAGE
    if len(data) > 5 * 1024 * 1024:
        return False, INVALID_MESSAGE
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return False, INVALID_MESSAGE
    return validate_image(img)

def validate_image(image: np.ndarray) -> tuple[bool, str | None]:
    """Validate numpy BGR image. Returns (valid, error_message)."""
    # Pipeline may provide float32 RGB in [0,1]; normalize to uint8 for OpenCV detectors.
    if image is None:
        return False, INVALID_MESSAGE
    if image.dtype != np.uint8:
        try:
            if image.dtype == np.float32 or image.dtype == np.float64:
                image = np.clip(image * 255.0, 0, 255).astype(np.uint8)
            else:
                image = np.clip(image, 0, 255).astype(np.uint8)
        except Exception:
            return False, INVALID_MESSAGE
    h, w = image.shape[:2]
    if w < MIN_SIDE or h < MIN_SIDE:
        return False, INVALID_MESSAGE
    if w * h > MAX_PIXELS:
        return False, INVALID_MESSAGE
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    if gray.dtype != np.uint8:
        gray = np.clip(gray, 0, 255).astype(np.uint8)
    # Face presence + single face
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(MIN_SIDE // 2, MIN_SIDE // 2))
    if len(faces) == 0:
        return False, INVALID_MESSAGE
    if len(faces) > MAX_FACES:
        return False, INVALID_MESSAGE
    x, y, fw, fh = faces[0]
    if fw < w * MIN_FACE_SIZE_RATIO or fh < h * MIN_FACE_SIZE_RATIO:
        return False, INVALID_MESSAGE
    # Blur (Laplacian variance)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    var = lap.var()
    if var < LAPVAR_BLUR_THRESHOLD:
        return False, INVALID_MESSAGE
    # Lighting
    mean_bright = np.mean(gray)
    if mean_bright < BRIGHTNESS_MEAN_LOW or mean_bright > BRIGHTNESS_MEAN_HIGH:
        return False, INVALID_MESSAGE
    return True, None
