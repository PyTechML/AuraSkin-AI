"""Load configuration from environment."""
import os

# Load .env from ai-engine root when this module is imported (e.g. by worker or API)
_ai_engine_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_env_path = os.path.join(_ai_engine_root, ".env")
if os.path.isfile(_env_path):
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass

def get_env(key: str, default: str = "") -> str:
    return os.environ.get(key, default) or default

REDIS_URL = get_env("REDIS_URL", "redis://localhost:6379")
SUPABASE_URL = get_env("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = get_env("SUPABASE_SERVICE_ROLE_KEY", "")
RESIZE_SIZE = int(get_env("AI_RESIZE_SIZE", "512"))
PROGRESS_KEY_PREFIX = "assessment:progress:"
QUEUE_KEY = "ai:assessment:queue"
