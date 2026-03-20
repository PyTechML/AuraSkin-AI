"""Load image from URL, resize to 512px, normalize, reduce noise."""
import io
import numpy as np
import httpx
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

from utils.config import RESIZE_SIZE

def load_from_url(url: str, timeout: int = 30) -> np.ndarray:
    """Fetch image from URL and return as RGB numpy array (H, W, 3)."""
    with httpx.Client(timeout=timeout) as client:
        resp = client.get(url)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content))
        arr = np.array(img)
        if arr.ndim == 2:
            arr = np.stack([arr] * 3, axis=-1)
        elif arr.shape[-1] == 4:
            arr = arr[:, :, :3]
        return arr

def resize_and_normalize(arr: np.ndarray, size: int = None) -> np.ndarray:
    """Resize to size x size (default from config), normalize to [0,1], optional denoise."""
    size = size or RESIZE_SIZE
    if cv2 is not None:
        arr = cv2.resize(arr, (size, size), interpolation=cv2.INTER_LINEAR)
        arr = cv2.fastNlMeansDenoisingColored(arr, None, 4, 4, 7, 21)
    else:
        img = Image.fromarray(arr)
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        arr = np.array(img)
    arr = arr.astype(np.float32) / 255.0
    return arr

def load_and_preprocess(url: str) -> np.ndarray:
    """Load from URL, resize, normalize, denoise. Returns float32 [0,1]."""
    arr = load_from_url(url)
    return resize_and_normalize(arr)
