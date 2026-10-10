from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo-root .env, written by scripts/gen-env.py.
ENV_FILE = Path(__file__).resolve().parents[4] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    # Kong gateway from docker-compose.yaml.
    supabase_url: str = "http://localhost:54321"
    supabase_jwt_secret: str
    supabase_anon_key: str
    supabase_service_role_key: str


@lru_cache
def get_settings() -> Settings:
    return Settings()
