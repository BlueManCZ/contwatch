from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://contwatch:contwatch@localhost:5432/contwatch"

    jwt_secret_key: str

    @field_validator("jwt_secret_key")
    @classmethod
    def _reject_weak_jwt_secret(cls, v: str) -> str:
        if v == "change-me-to-a-random-secret":
            raise ValueError("JWT_SECRET_KEY must be changed from the placeholder value")
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v

    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 30

    turnstile_site_key: str = ""
    turnstile_secret_key: str = ""

    backend_cors_origins: list[str] = ["http://localhost:5173"]

    debug: bool = False


settings = Settings()
