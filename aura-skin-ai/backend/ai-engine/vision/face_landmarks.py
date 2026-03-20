"""Facial landmark detection via MediaPipe Face Mesh. 468 landmarks; region masks for forehead, cheeks, nose, jawline, eye area."""
import numpy as np

try:
    import mediapipe as mp
except ImportError:
    mp = None

_FACE_MESH = None

def _get_face_mesh():
    global _FACE_MESH
    if _FACE_MESH is None and mp is not None:
        _FACE_MESH = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
        )
    return _FACE_MESH

def get_landmarks(image: np.ndarray) -> np.ndarray | None:
    """
    image: RGB uint8 (H, W, 3). Returns (468, 3) normalized x,y,z or None.
    """
    mesh = _get_face_mesh()
    if mesh is None:
        return None
    if image.dtype == np.float32 or image.dtype == np.float64:
        image = (np.clip(image, 0, 1) * 255).astype(np.uint8)
    if image.shape[-1] == 3:
        pass  # assume RGB
    else:
        return None
    h, w = image.shape[:2]
    results = mesh.process(image)
    if not results.multi_face_landmarks or len(results.multi_face_landmarks) == 0:
        return None
    lm = results.multi_face_landmarks[0]
    out = np.array([[p.x * w, p.y * h, p.z] for p in lm.landmark], dtype=np.float32)
    return out

# MediaPipe face mesh indices (approximate regions)
# https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
FOREHEAD_INDICES = list(range(10, 67)) + list(range(297, 332))  # approximate
CHEEK_LEFT = list(range(234, 254)) + list(range(205, 215))
CHEEK_RIGHT = list(range(454, 474)) + list(range(425, 435))
NOSE_INDICES = list(range(94, 150)) + list(range(168, 192))
JAWLINE_INDICES = list(range(152, 377))  # lower face contour
EYE_LEFT = list(range(33, 133))
EYE_RIGHT = list(range(362, 263))

def get_region_masks(landmarks: np.ndarray, height: int, width: int) -> dict[str, np.ndarray]:
    """Return binary masks (H, W) for forehead, cheeks, nose, jawline, eye_area (combined)."""
    import cv2
    masks = {}
    if landmarks is None or len(landmarks) < 300:
        return masks
    all_indices = {
        "forehead": FOREHEAD_INDICES,
        "cheek_left": CHEEK_LEFT,
        "cheek_right": CHEEK_RIGHT,
        "nose": NOSE_INDICES,
        "jawline": JAWLINE_INDICES,
        "eye_area": EYE_LEFT + EYE_RIGHT,
    }
    for name, indices in all_indices.items():
        idx = [i for i in indices if i < len(landmarks)]
        if not idx:
            continue
        pts = landmarks[idx]
        xs = (pts[:, 0].clip(0, width - 1)).astype(np.int32)
        ys = (pts[:, 1].clip(0, height - 1)).astype(np.int32)
        pts_xy = np.column_stack((xs, ys))
        mask = np.zeros((height, width), dtype=np.uint8)
        try:
            hull = cv2.convexHull(pts_xy)
            cv2.fillConvexPoly(mask, hull, 1)
        except Exception:
            for x, y in zip(xs, ys):
                if 0 <= x < width and 0 <= y < height:
                    mask[int(y), int(x)] = 1
        masks[name] = mask
    return masks
