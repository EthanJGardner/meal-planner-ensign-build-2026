from functools import lru_cache
from pathlib import Path
from typing import Literal

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

    # Mock stores (apps/storefront).
    storefront_url: str = "http://localhost:8100"

    # Recipes, loaded into Qdrant by scripts/ingest_recipes.py.
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "recipes"

    # Shopping agent. "scripted" runs offline with no model.
    llm_provider: Literal["scripted", "bedrock"] = "scripted"
    # Required for the bedrock provider. There is no default model.
    bedrock_model_id: str | None = None
    aws_region: str | None = None
    # A Bedrock API key. Optional: without it, the usual AWS credentials are used.
    aws_bearer_token_bedrock: str | None = None
    agent_max_steps: int = 25
    agent_tool_timeout_seconds: float = 10.0

    # Paying the stores through Stripe's Link CLI (its MCP server). Test mode is
    # forced in code. Needs Node, and `npx @stripe/link-cli auth login` done once.
    payments_enabled: bool = True
    # The version is pinned on purpose: this program can move money.
    link_mcp_command: str = "npx -y @stripe/link-cli@0.27.0 --mcp"
    # How long to wait for the user to approve a payment in the Link app.
    link_approval_timeout_seconds: float = 600.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
