# AuraSkin AI Engine

Python microservice for skin analysis: computer vision pipeline, job worker, and chatbot guardrails. **Internal use only**; do not expose publicly.

## Structure

- **api/ai_server.py** — FastAPI server: `POST /analyze`, `POST /chat/guard`
- **pipelines/skin_analysis_pipeline.py** — Orchestrates validate → face → landmarks → features → classify → recommend
- **vision/** — Face detection (Haar), landmarks (MediaPipe), acne and redness detectors
- **validation/face_validator.py** — Format, size, resolution, face presence, single face, blur, lighting
- **classifiers/skin_classifier.py** — Rule-based skin condition and routine (future: CNN)
- **recommendations/** — Product and dermatologist recommenders (Supabase)
- **chatbot/ai_chatbot_guard.py** — Blocked keywords, rate/query limits, 5-warning then 30-min block
- **workers/analysis_worker.py** — Consumes Redis queue, runs pipeline, writes reports to Supabase and progress to Redis

## Environment

- `REDIS_URL` — Redis connection (required for worker and guard state)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key for DB and storage
- `AI_RESIZE_SIZE` — Optional; default 512 (image resize for pipeline)

## Run

From `backend/ai-engine`:

```bash
# Install
pip install -r requirements.txt

# API server (localhost only)
uvicorn api.ai_server:app --host 127.0.0.1 --port 8000

# Worker (consumes queue ai:assessment:queue)
python -m workers.analysis_worker
```

Backend (NestJS) enqueues jobs to the same Redis list; worker pops and processes. Progress is written to Redis key `assessment:progress:{assessmentId}`; backend progress endpoint reads it.
