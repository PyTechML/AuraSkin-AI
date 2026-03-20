"""Structured logging; no sensitive data in logs. JSON format for aggregation."""
import json
import logging
import sys
import time

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "service": "ai-worker",
            "name": record.name,
            "level": record.levelname,
            "message": record.getMessage(),
        }
        if hasattr(record, "event_type"):
            payload["event_type"] = record.event_type
        if hasattr(record, "assessment_id"):
            payload["assessment_id"] = record.assessment_id
        if hasattr(record, "processing_stage"):
            payload["processing_stage"] = record.processing_stage
        if hasattr(record, "execution_time"):
            payload["execution_time"] = record.execution_time
        if hasattr(record, "success"):
            payload["success"] = record.success
        if hasattr(record, "report_id"):
            payload["report_id"] = record.report_id
        return json.dumps(payload)
