"""
Chatbot guardrails: blocked keywords, rate/query limits, warning count. After 5 warnings, block 30 min.
Returns { allowed, warning_count, block_until, reason }. Admin reviews via ai_usage_logs.
"""
import os
import sys
import json
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from pydantic import BaseModel
from typing import Optional

WARNINGS_BEFORE_BLOCK = 5
BLOCK_MINUTES = 30
REDIS_GUARD_PREFIX = "chat_guard:"

def _get_supabase():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    except Exception:
        return None

def _get_redis():
    from utils.config import REDIS_URL
    if not REDIS_URL:
        return None
    try:
        import redis
        return redis.from_url(REDIS_URL)
    except Exception:
        return None

def _load_rules(supabase) -> dict:
    if not supabase:
        return {"blocked_keywords": [], "rate_limit": 20, "query_limit": 100}
    try:
        r = supabase.table("ai_chatbot_rules").select("rule_type, rule_value").execute()
        out = {"blocked_keywords": [], "rate_limit": 20, "query_limit": 100}
        for row in (r.data or []):
            t = row.get("rule_type")
            v = row.get("rule_value") or ""
            if t == "blocked_keywords":
                out["blocked_keywords"] = [x.strip() for x in v.replace(",", " ").split() if x.strip()]
            elif t == "rate_limit":
                try:
                    out["rate_limit"] = int(v)
                except ValueError:
                    pass
            elif t == "query_limit":
                try:
                    out["query_limit"] = int(v)
                except ValueError:
                    pass
        return out
    except Exception:
        return {"blocked_keywords": [], "rate_limit": 20, "query_limit": 100}

def _get_user_state(redis_client, user_id: str) -> dict:
    if not redis_client:
        return {"warnings": 0, "block_until": None}
    key = REDIS_GUARD_PREFIX + user_id
    try:
        raw = redis_client.get(key)
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return {"warnings": 0, "block_until": None}

def _set_user_state(redis_client, user_id: str, state: dict):
    if not redis_client:
        return
    key = REDIS_GUARD_PREFIX + user_id
    try:
        redis_client.setex(key, 86400 * 7, json.dumps(state))  # 7 day TTL
    except Exception:
        pass

def _log_usage(supabase, user_id: str, query: str, status: str):
    if not supabase:
        return
    try:
        supabase.table("ai_usage_logs").insert({
            "user_id": user_id if user_id and not user_id.startswith("rate:") else None,
            "query": (query or "")[:5000],
            "response_tokens": 0,
            "model_used": None,
            "status": status,
        }).execute()
    except Exception:
        pass

def check_guard(user_id: str, query: str) -> dict:
    """
    Returns dict: allowed (bool), warning_count (int), block_until (ISO str or None), reason (str or None).
    """
    supabase = _get_supabase()
    redis_client = _get_redis()
    rules = _load_rules(supabase)
    state = _get_user_state(redis_client, user_id)
    now = datetime.utcnow()
    if state.get("block_until"):
        try:
            block_until = datetime.fromisoformat(state["block_until"].replace("Z", "+00:00"))
            if block_until.tzinfo:
                block_until = block_until.replace(tzinfo=None)
            if now < block_until:
                _log_usage(supabase, user_id, query, "blocked")
                return {
                    "allowed": False,
                    "warning_count": state.get("warnings", 0),
                    "block_until": state["block_until"],
                    "reason": "You have been temporarily blocked from the assistant. Please try again later.",
                }
        except Exception:
            state["block_until"] = None
    q = (query or "").strip().lower()
    for kw in rules.get("blocked_keywords", []):
        if kw.strip().lower() in q:
            state["warnings"] = state.get("warnings", 0) + 1
            if state["warnings"] >= WARNINGS_BEFORE_BLOCK:
                state["block_until"] = (now + timedelta(minutes=BLOCK_MINUTES)).isoformat() + "Z"
            _set_user_state(redis_client, user_id, state)
            _log_usage(supabase, user_id, query, "refused_blocked_keyword")
            return {
                "allowed": False,
                "warning_count": state["warnings"],
                "block_until": state.get("block_until"),
                "reason": "This content is not permitted. Please keep the conversation appropriate.",
            }
    return {
        "allowed": True,
        "warning_count": state.get("warnings", 0),
        "block_until": None,
        "reason": None,
    }
