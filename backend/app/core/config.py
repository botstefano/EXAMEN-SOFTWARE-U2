from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    secret_key: str = "dev-secret-change-me-dev-secret-change-me"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    database_url: str = "postgresql+asyncpg://phishguard:phishguard@localhost:5432/phishguard"
    cors_origins: str = "http://localhost:5173"
    auto_seed: bool = True
    enable_network_checks: bool = False
    llm_provider: str = "none"  # none | ollama
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    virustotal_api_key: str | None = None
    phishtank_url: str = "https://data.phishtank.com/data/online-valid.csv"
    openphish_url: str = "https://openphish.com/feed.txt"

    @property
    def cors_list(self):
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
