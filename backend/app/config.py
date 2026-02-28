from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://contwatch:contwatch@localhost:5432/contwatch"

    jwt_secret_key: str = "change-me-to-a-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    backend_cors_origins: list[str] = ["http://localhost:5173"]

    debug: bool = False

    default_admin_username: str = "admin"
    default_admin_password: str = "admin"


settings = Settings()
