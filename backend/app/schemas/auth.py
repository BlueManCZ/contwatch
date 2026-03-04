from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str
    turnstile_token: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
