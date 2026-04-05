"""
FastAPI AI server: POST /analyze, POST /chat/guard.
Never expose internal errors. Bind to localhost for internal use only.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="AuraSkin AI Engine", docs_url=None, redoc_url=None)

class AnalyzeRequest(BaseModel):
    assessment_id: str
    image_urls: list[str]

class AnalyzeResponse(BaseModel):
    status: str  # "ok" | "error"
    predictions: Optional[dict] = None
    recommendations: Optional[dict] = None
    message: Optional[str] = None

class ChatGuardRequest(BaseModel):
    user_id: str
    query: str

class ChatGuardResponse(BaseModel):
    allowed: bool
    warning_count: Optional[int] = None
    block_until: Optional[str] = None
    reason: Optional[str] = None

@app.get("/health")
def health():
    """Liveness probe for Nest submit-health and load balancers."""
    return {"status": "ok"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    try:
        from pipelines.skin_analysis_pipeline import run
        result = run(req.image_urls)
        return AnalyzeResponse(
            status="ok",
            predictions=result.get("predictions"),
            recommendations=result.get("recommendations"),
        )
    except ValueError as e:
        return AnalyzeResponse(status="error", message="Invalid face image detected. Please upload clear facial photos.")
    except Exception:
        return AnalyzeResponse(status="error", message="Analysis failed. Please try again.")

@app.post("/chat/guard", response_model=ChatGuardResponse)
def chat_guard(req: ChatGuardRequest):
    try:
        from chatbot.ai_chatbot_guard import check_guard
        out = check_guard(req.user_id, req.query)
        return ChatGuardResponse(
            allowed=out.get("allowed", True),
            warning_count=out.get("warning_count"),
            block_until=out.get("block_until"),
            reason=out.get("reason"),
        )
    except Exception:
        return ChatGuardResponse(allowed=True, reason="Guard unavailable")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
