# AI Engine Infrastructure — Completion Report

## 1. AI Microservice Structure

The AI engine is a separate Python microservice under `backend/ai-engine/` with the following layout:

```
ai-engine/
├── api/
│   └── ai_server.py          # FastAPI: POST /analyze, POST /chat/guard
├── pipelines/
│   └── skin_analysis_pipeline.py  # Orchestrates full pipeline
├── vision/
│   ├── face_detector.py      # OpenCV Haar cascade, face bbox
│   ├── face_landmarks.py     # MediaPipe Face Mesh, 468 landmarks, region masks
│   ├── acne_detector.py      # Blob + color + texture → acne_score, acne_severity
│   └── redness_detector.py   # HSV redness → redness_score, inflammation_level
├── validation/
│   └── face_validator.py     # Format, size, resolution, face, single face, blur, lighting
├── classifiers/
│   └── skin_classifier.py   # Rule-based condition + recommended_routine (future: CNN)
├── recommendations/
│   ├── product_recommender.py      # Match conditions to products, Supabase, sort by rating/relevance
│   └── dermatologist_recommender.py # City/lat/lng, distance, rating, specialization
├── chatbot/
│   └── ai_chatbot_guard.py  # Blocked keywords, rate/query limits, 5 warnings → 30 min block
├── workers/
│   └── analysis_worker.py    # Redis queue consumer, pipeline, Supabase writes, progress updates
├── utils/
│   ├── image_loader.py     # Load URL, resize 512px, normalize, denoise
│   ├── logger.py           # Structured logging
│   └── config.py           # REDIS_URL, SUPABASE_*, RESIZE_SIZE, queue/progress keys
├── models/
│   └── model_registry.py   # Placeholder for future CNN models
├── requirements.txt
└── README.md
```

- **api**: HTTP interface for optional sync `/analyze` and for backend-callable `/chat/guard`.
- **pipelines**: Single entry that runs validation → face detection → landmarks → feature extraction → classification → recommendations.
- **vision**: All computer-vision steps (face, landmarks, acne, redness).
- **validation**: Ensures image quality before analysis; returns a single user-facing error message on failure.
- **classifiers**: Current rule-based logic; designed to be swapped for a CNN later.
- **recommendations**: Product and dermatologist matching using Supabase data.
- **chatbot**: Guardrails (keywords, limits, warnings, block); state in Redis; logs to `ai_usage_logs`.
- **workers**: Consumes the same Redis list the backend pushes to; updates progress in Redis and writes reports/products/dermatologists in Supabase.

---

## 2. Computer Vision Pipeline

Processing order in `skin_analysis_pipeline.py`:

1. **Image validation** — Load each URL via `image_loader`, then `face_validator.validate_image`: format/size, resolution, face presence, single face, blur (Laplacian variance), lighting. On failure: `ValueError` with message *"Invalid face image detected. Please upload clear facial photos."*

2. **Face detection** — OpenCV Haar cascade on the primary (front) image; face bbox `(x, y, w, h)`. Reject if no face.

3. **Landmark detection** — MediaPipe Face Mesh on primary image; 468 landmarks; optional region masks (forehead, cheeks, nose, jawline, eye area) for future use.

4. **Feature extraction** — `acne_detector`: blob detection, reddish color mask, texture variance → `acne_score`, `acne_severity`. `redness_detector`: HSV red regions → `redness_score`, `inflammation_level`.

5. **Skin classification** — Rule-based: e.g. `acne_score > 0.6` → acne; `redness_score > 0.5` → inflammation; combined label and `recommended_routine` text.

6. **Recommendation generation** — In the worker: product recommender (condition → products from DB); dermatologist recommender (city/lat/lng → dermatologists). Results written to `recommended_products` and `recommended_dermatologists` in Supabase.

Progress stages exposed to the backend progress API: `image_validation`, `face_detection`, `landmark_detection`, `feature_extraction`, `skin_classification`, `recommendation_generation`, `completed` (and `failed` with optional `error`).

---

## 3. Skin Classification Logic

- **Rule-based rules** (in `skin_classifier.py`):
  - `acne_score > 0.6` → condition "acne"; `> 0.3` → "mild acne".
  - `redness_score > 0.5` → "inflammation"; `> 0.25` → "mild redness".
  - Otherwise "generally healthy".
  - Routine text: acne → salicylic/benzoyl peroxide, moisturizer, sunscreen, re-assess in 4 weeks; inflammation/redness → gentle, soothing, sunscreen; else simple maintenance routine.

- **Future CNN path**: `models/model_registry.py` is a placeholder. A trained CNN can be registered and called from `skin_classifier.py` (or a new module) to output condition + routine, with rule-based logic as fallback or post-processing.

---

## 4. Recommendation Engines

- **Product recommender** (`product_recommender.py`): Reads `products` from Supabase; matches detected `skin_condition` (e.g. acne, inflammation) to category/concern; scores by relevance and rating; returns up to 10 `product_id` + `confidence_score`. Worker inserts into `recommended_products`.

- **Dermatologist recommender** (`dermatologist_recommender.py`): Reads `dermatologists`; filters by optional `city`; sorts by distance (if lat/lng provided) and rating; returns up to 10 `dermatologist_id` + `distance_km`. Worker inserts into `recommended_dermatologists`.

---

## 5. Chatbot Guardrails

- **Blocked topics**: Keywords from Supabase `ai_chatbot_rules` (rule_type `blocked_keywords`). If query contains a blocked keyword → `allowed: false`, warning count incremented, logged to `ai_usage_logs`.

- **Limits**: Rate and query limits read from `ai_chatbot_rules` (`rate_limit`, `query_limit`). Guard state (warnings, block_until) stored in Redis per user.

- **Violation policy**: User receives a generic refusal message. After **5 warnings**, chatbot access is blocked for **30 minutes** (`block_until` in Redis). Admin can review `ai_usage_logs` for statuses such as `refused_blocked_keyword`, `blocked`.

- **API**: Backend calls `POST /chat/guard` with `user_id` and `query`; AI engine returns `{ allowed, warning_count, block_until, reason }`. If the guard service is down, backend fails open (allows request) so the app does not break.

---

## 6. Security Architecture

- **AI server only internal**: FastAPI is intended to bind to `127.0.0.1` (or an internal network). Only the backend (and optionally other internal services) should call `/analyze` and `/chat/guard`; no direct exposure to the internet.

- **Images**: Stored in Supabase Storage (bucket `assessment-images`). Backend generates **signed URLs** (e.g. 1-hour expiry) when enqueueing jobs; worker fetches images via these URLs and does not persist them.

- **Error handling**: API responses never expose stack traces or internal paths. On pipeline or server errors, the client receives a generic message (e.g. "Analysis failed. Please try again." or "Invalid face image detected. Please upload clear facial photos."). Worker logs errors internally only.

- **Secrets**: Supabase service role key and Redis URL are provided via environment variables and are not logged or returned in responses.

---

## 7. Performance Optimizations

- **Image preprocessing** (in `utils/image_loader.py`): Resize to **512px** (configurable via `AI_RESIZE_SIZE`), normalize to [0, 1], and optional denoising (e.g. `fastNlMeansDenoisingColored`) to reduce noise and speed up feature extraction.

- **Workers**: Multiple worker processes can run on the same or different machines, all consuming from the same Redis list (`ai:assessment:queue`), enabling horizontal scaling.

- **Progress**: Progress is written to Redis with a TTL (e.g. 24h) so keys do not accumulate.

---

## 8. Future ML Training Pipeline

- **Data collection**: Store consented assessment images and labels (e.g. condition, severity) in a dedicated store or table; optionally link to `reports` and `ai_predictions` for auditability.

- **Labeling**: Use existing or new admin tooling to label conditions (acne, redness, etc.) and severity; export datasets for training.

- **Training**: Train a CNN (e.g. lightweight classifier) on labeled face/skin crops; validate on a held-out set; version and store models (e.g. in `models/` or a registry).

- **Deployment**: Register the trained model in `model_registry.py`; from `skin_classifier.py` (or a new classifier module), load the model and run inference; keep rule-based logic as fallback when the model is unavailable or confidence is low.

- **Iteration**: Retrain periodically with new labeled data; A/B test rule-based vs CNN in production; monitor metrics (e.g. user feedback, dermatologist overrides) to improve thresholds and labels.

---

## Summary

The AI engine infrastructure is implemented as a **separate Python microservice** with a FastAPI server and a Redis-based worker. The **computer vision pipeline** validates images, detects faces and landmarks, extracts acne and redness features, and uses a **rule-based skin classifier** to produce a condition and recommended routine. **Product and dermatologist recommenders** query Supabase and are used by the worker to populate `recommended_products` and `recommended_dermatologists`. **Chatbot guardrails** enforce blocked keywords and warning/block policy with state in Redis and logs in `ai_usage_logs`. **Security** is addressed via internal-only API, signed URLs for images, and no leakage of internal errors. **Performance** is improved by image resizing/normalization/denoising and by horizontally scalable workers. The design allows a **future ML training pipeline** to replace or augment the rule-based classifier with a CNN while keeping the rest of the system unchanged.
