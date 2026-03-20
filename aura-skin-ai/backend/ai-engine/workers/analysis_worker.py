"""
Consume AI assessment jobs from Redis, run pipeline, write results to Supabase and progress to Redis.
Run from ai-engine dir: python -m workers.analysis_worker
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROGRESS_KEY_PREFIX, QUEUE_KEY
from utils.logger import get_logger

logger = get_logger("worker")
PROGRESS_TTL = 86400  # 24h
AI_WORKER_RUNNING_KEY = "ai:worker:running"
AI_WORKER_FAILED_KEY = "ai:worker:failed"
AI_WORKER_HEARTBEAT_KEY = "ai:worker:last_heartbeat"
HEARTBEAT_TTL_SEC = 120
PROCESSING_TIMEOUT_SEC = 600  # 10 minutes

def set_heartbeat(redis_client):
    try:
        redis_client.setex(
            AI_WORKER_HEARTBEAT_KEY,
            HEARTBEAT_TTL_SEC,
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        )
    except Exception:
        pass

def set_progress(redis_client, assessment_id: str, progress: int, stage: str, report_id: str = None, error: str = None):
    key = PROGRESS_KEY_PREFIX + assessment_id
    payload = {"progress": progress, "stage": stage}
    if report_id:
        payload["report_id"] = report_id
    if error:
        payload["error"] = error
    redis_client.setex(key, PROGRESS_TTL, json.dumps(payload))

def run_job(payload: dict, redis_client, supabase):
    assessment_id = payload.get("assessmentId")
    user_id = payload.get("userId")
    image_urls = payload.get("imageUrls") or []
    city = payload.get("city")
    lat = payload.get("latitude")
    lng = payload.get("longitude")
    if not assessment_id or not user_id or len(image_urls) < 5:
        set_progress(redis_client, assessment_id or "unknown", 0, "failed", error="Invalid job payload.")
        return
    start_time = time.time()
    incr_done = False
    set_heartbeat(redis_client)
    try:
        redis_client.incr(AI_WORKER_RUNNING_KEY)
        incr_done = True
        logger.info(
            "AI job started",
            extra={"event_type": "ai_processing", "assessment_id": assessment_id, "processing_stage": "started"}
        )
    except Exception:
        pass

    class ProcessingTimeoutError(Exception):
        pass

    try:
        from pipelines.skin_analysis_pipeline import run as run_pipeline
        from recommendations.product_recommender import recommend_products
        from recommendations.dermatologist_recommender import recommend_dermatologists

        def progress_cb(stage: str, pct: int):
            set_heartbeat(redis_client)
            if time.time() - start_time > PROCESSING_TIMEOUT_SEC:
                set_progress(
                    redis_client, assessment_id, 0, "failed",
                    error="Processing timeout (over 10 minutes). Please try again.",
                )
                raise ProcessingTimeoutError("Processing timeout")
            set_progress(redis_client, assessment_id, pct, stage)

        set_progress(redis_client, assessment_id, 0, "image_validation")
        result = run_pipeline(image_urls, progress_callback=progress_cb)
        predictions = result["predictions"]
        skin_condition = predictions.get("skin_condition") or "Unknown"
        recommended_routine = predictions.get("recommended_routine") or ""
        acne_score = predictions.get("acne_score")
        oil_level = predictions.get("oil_level")
        pigmentation = predictions.get("pigmentation")
        confidence = predictions.get("confidence")
        zones = predictions.get("zones")
        pigmentation_score = predictions.get("pigmentation_score")
        hydration_score = predictions.get("hydration_score")
        redness_score = predictions.get("redness_score")
        inflammation_level = predictions.get("inflammation_level")

        assessment_row = supabase.table("assessments").select("skin_type, primary_concern, secondary_concern").eq("id", assessment_id).execute()
        assessment_for_products = (assessment_row.data or [{}])[0] if assessment_row.data else {}
        product_skin_type = assessment_for_products.get("skin_type") or ""
        product_concerns = [
            c
            for c in [
                assessment_for_products.get("primary_concern"),
                assessment_for_products.get("secondary_concern"),
            ]
            if c
        ]

        product_rows = recommend_products(
            skin_condition,
            predictions.get("acne_score", 0),
            limit=5,
            skin_type=product_skin_type,
            concerns=product_concerns,
        )
        derm_rows = recommend_dermatologists(city=city, latitude=lat, longitude=lng, limit=5)

        # Skin health index 0-100 from sub-scores (same formula as dashboard-metrics fallback)
        ac = float(acne_score) if acne_score is not None else 0.0
        pig = float(pigmentation_score) if pigmentation_score is not None else 0.0
        hyd = float(hydration_score) if hydration_score is not None else 0.5
        skin_score_val = round((1 - ac) * 33 + (1 - pig) * 33 + min(1.0, hyd) * 34)
        skin_score_val = max(0, min(100, skin_score_val))

        report_data = {
            "user_id": user_id,
            "assessment_id": assessment_id,
            "skin_condition": skin_condition,
            "recommended_routine": recommended_routine,
            "skin_score": skin_score_val,
            "acne_score": float(acne_score) if acne_score is not None else None,
            "pigmentation_score": float(pigmentation_score) if pigmentation_score is not None else None,
            "hydration_score": float(hydration_score) if hydration_score is not None else None,
            "redness_score": float(redness_score) if redness_score is not None else None,
            "inflammation_level": inflammation_level,
        }
        # Keep extended analysis fields for observability without schema change.
        logger.info(
            "Extended analysis metrics",
            extra={
                "event_type": "ai_processing",
                "assessment_id": assessment_id,
                "oil_level": oil_level,
                "pigmentation": pigmentation,
                "confidence": confidence,
                "zones": zones if isinstance(zones, dict) else {},
            },
        )
        r = supabase.table("reports").insert(report_data).execute()
        if not r.data or len(r.data) == 0:
            set_progress(redis_client, assessment_id, 0, "failed", error="Failed to create report.")
            return
        report_id = r.data[0]["id"]
        for row in product_rows:
            supabase.table("recommended_products").insert({
                "report_id": report_id,
                "product_id": row["product_id"],
                "confidence_score": row.get("confidence_score"),
            }).execute()
        for row in derm_rows:
            supabase.table("recommended_dermatologists").insert({
                "report_id": report_id,
                "dermatologist_id": row["dermatologist_id"],
                "distance_km": row.get("distance_km"),
            }).execute()

        # Generate and store routine plan from assessment + report
        try:
            from routine_generator import generate_routine
            assessment_row = supabase.table("assessments").select("skin_type, primary_concern, secondary_concern").eq("id", assessment_id).execute()
            assessment = (assessment_row.data or [{}])[0] if assessment_row.data else {}
            skin_type = assessment.get("skin_type") or ""
            concerns = [c for c in [assessment.get("primary_concern"), assessment.get("secondary_concern")] if c]
            routine = generate_routine(
                skin_type=skin_type,
                concerns=concerns,
                acne_score=float(acne_score) if acne_score is not None else None,
                pigmentation_score=float(pigmentation_score) if pigmentation_score is not None else None,
                hydration_score=float(hydration_score) if hydration_score is not None else None,
            )
            supabase.table("routine_plans").insert({
                "user_id": user_id,
                "report_id": report_id,
                "morning_routine": routine["morning_routine"],
                "night_routine": routine["night_routine"],
                "lifestyle_food_advice": routine["lifestyle_food_advice"],
                "lifestyle_hydration": routine["lifestyle_hydration"],
                "lifestyle_sleep": routine["lifestyle_sleep"],
            }).execute()
        except Exception as routine_err:
            logger.warning("Routine plan creation failed: %s", routine_err)

        set_progress(redis_client, assessment_id, 100, "completed", report_id=report_id)
        execution_time = time.time() - start_time
        logger.info(
            "Assessment completed",
            extra={
                "event_type": "ai_processing",
                "assessment_id": assessment_id,
                "processing_stage": "completed",
                "execution_time": round(execution_time, 2),
                "success": True,
                "report_id": report_id,
            }
        )
    except ProcessingTimeoutError:
        try:
            redis_client.incr(AI_WORKER_FAILED_KEY)
        except Exception:
            pass
        logger.warning(
            "Assessment processing timeout",
            extra={
                "event_type": "ai_processing",
                "assessment_id": assessment_id,
                "processing_stage": "failed",
                "success": False,
            }
        )
    except ValueError as e:
        set_progress(redis_client, assessment_id, 0, "failed", error=str(e))
        try:
            redis_client.incr(AI_WORKER_FAILED_KEY)
        except Exception:
            pass
        execution_time = time.time() - start_time
        logger.warning(
            "Assessment validation failed",
            extra={
                "event_type": "ai_processing",
                "assessment_id": assessment_id,
                "processing_stage": "failed",
                "execution_time": round(execution_time, 2),
                "success": False,
            }
        )
    except Exception as e:
        set_progress(redis_client, assessment_id, 0, "failed", error="Analysis failed. Please try again.")
        try:
            redis_client.incr(AI_WORKER_FAILED_KEY)
        except Exception:
            pass
        execution_time = time.time() - start_time
        logger.exception(
            "Assessment pipeline error: %s",
            e,
            extra={
                "event_type": "ai_processing",
                "assessment_id": assessment_id,
                "processing_stage": "failed",
                "execution_time": round(execution_time, 2),
                "success": False,
            }
        )
    finally:
        if incr_done:
            try:
                redis_client.decr(AI_WORKER_RUNNING_KEY)
            except Exception:
                pass

def main():
    import redis
    from supabase import create_client
    if not REDIS_URL:
        logger.error("REDIS_URL not set")
        return
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
        return
    redis_client = redis.from_url(REDIS_URL)
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    logger.info("Worker started, listening on queue %s", QUEUE_KEY)
    while True:
        try:
            set_heartbeat(redis_client)
            raw = redis_client.brpop(QUEUE_KEY, timeout=30)
            if not raw:
                continue
            _, job_str = raw
            payload = json.loads(job_str)
            run_job(payload, redis_client, supabase)
        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.exception("Worker loop error: %s", e)

if __name__ == "__main__":
    main()
