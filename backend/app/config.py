import os

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "sqlite:///./aifpl.db"
    redis_url: str = "redis://localhost:6379/0"
    fpl_api_base: str = "https://fantasy.premierleague.com/api"
    cors_origins: str = "http://localhost:3000"
    service_path_prefix: str = ""
    gemini_api_key: str = ""
    gemini_vision_model: str = "gemini-2.5-flash"
    openai_api_key: str = ""
    openai_vision_model: str = "gpt-4o-mini"

    @model_validator(mode="after")
    def apply_vercel_defaults(self) -> "Settings":
        if not os.getenv("VERCEL"):
            return self
        if self.database_url in ("", "sqlite:///./aifpl.db"):
            self.database_url = "sqlite:////tmp/aifpl.db"
        if not self.service_path_prefix:
            self.service_path_prefix = "/api/backend"
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        vercel_url = os.getenv("VERCEL_URL")
        if vercel_url:
            origins.append(f"https://{vercel_url}")
        return origins


settings = Settings()
