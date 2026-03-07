import sys

from pydantic import ValidationError, computed_field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    postgres_user: str
    postgres_password: str
    postgres_db: str
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @computed_field  # type: ignore[prop-decorator]
    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

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


try:
    settings = Settings()
except ValidationError as exc:
    missing = [e["loc"][0] for e in exc.errors() if e["type"] == "missing"]
    if missing:
        env_vars = ", ".join(str(f).upper() for f in missing)
        print(f"\n  ERROR: Missing required environment variables: {env_vars}", file=sys.stderr)
        print("  Set them in your .env file or as environment variables.\n", file=sys.stderr)
    else:
        print(f"\n  ERROR: Invalid configuration:\n{exc}\n", file=sys.stderr)
    raise SystemExit(3) from None
