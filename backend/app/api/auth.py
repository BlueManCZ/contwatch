from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Cookie, Header, HTTPException, Request, Response, status
from sqlalchemy import select

from app.config import settings
from app.dependencies import CurrentUser, DbSession
from app.limiter import limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    revoke_all_user_tokens,
    revoke_refresh_token,
    rotate_refresh_token,
)
from app.socketio_app import sio
from app.utils.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_MAX_AGE = settings.jwt_refresh_token_expire_days * 86400


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        path="/api/auth",
        max_age=_COOKIE_MAX_AGE,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        path="/api/auth",
    )


_MAX_FAILED_ATTEMPTS = 10
_LOCKOUT_DURATION = timedelta(minutes=15)
# Pre-computed bcrypt hash used when user doesn't exist, so verify_password
# always runs and timing is constant regardless of username validity.
_DUMMY_HASH = "$2b$12$LJ3m4ys3Lg2HEkGFGOoiGe1IkmGCELmBU9a3MIBf4FPAzoJuvkPVe"

_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


async def _verify_turnstile(token: str | None, client_ip: str) -> None:
    """Verify Cloudflare Turnstile token. Skips if Turnstile is not configured."""
    if not settings.turnstile_secret_key:
        return
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing CAPTCHA token")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _TURNSTILE_VERIFY_URL,
            data={"secret": settings.turnstile_secret_key, "response": token, "remoteip": client_ip},
        )
    if not resp.json().get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CAPTCHA verification failed")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(body: LoginRequest, request: Request, response: Response, db: DbSession):
    await _verify_turnstile(body.turnstile_token, request.client.host)

    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    # Check account lockout before password verification
    if user and user.locked_until and user.locked_until > datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account temporarily locked")

    # Always run verify_password to equalize timing regardless of whether user exists
    password_ok = (
        verify_password(body.password, user.hashed_password) if user else verify_password(body.password, _DUMMY_HASH)
    )

    if not user or not password_ok or not user.is_active:
        # Increment failed attempts if user exists and password was wrong (not inactive)
        if user and not password_ok:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= _MAX_FAILED_ATTEMPTS:
                user.locked_until = datetime.now(UTC) + _LOCKOUT_DURATION
            await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    # Reset lockout state on successful login
    user.failed_login_attempts = 0
    user.locked_until = None

    access_token = create_access_token(user.id)
    raw_refresh, _ = await create_refresh_token(db, user.id)
    await db.commit()

    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: DbSession,
    refresh_token: str | None = Cookie(default=None),
    x_requested_with: str | None = Header(default=None),
):
    if not x_requested_with:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-Requested-With header",
        )
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    new_raw, user = await rotate_refresh_token(db, refresh_token)
    await db.commit()

    access_token = create_access_token(user.id)
    _set_refresh_cookie(response, new_raw)
    return TokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: DbSession,
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        await revoke_refresh_token(db, refresh_token)
        await db.commit()
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser):
    return current_user


@router.get("/users", response_model=list[UserRead])
async def list_users(db: DbSession, current_user: CurrentUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    result = await db.execute(select(User))
    return result.scalars().all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, db: DbSession, current_user: CurrentUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await sio.emit("mutate", {"entity": "auth"})
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(user_id: int, body: UserUpdate, db: DbSession, current_user: CurrentUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)

    password_changed = False
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            user.hashed_password = hash_password(password)
            password_changed = True

    deactivated = "is_active" in update_data and not update_data["is_active"]

    for field, value in update_data.items():
        setattr(user, field, value)

    if password_changed or deactivated:
        await revoke_all_user_tokens(db, user_id)

    await db.commit()
    await db.refresh(user)
    await sio.emit("mutate", {"entity": "auth"})
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int, db: DbSession, current_user: CurrentUser):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await revoke_all_user_tokens(db, user_id)
    await db.delete(user)
    await db.commit()
    await sio.emit("mutate", {"entity": "auth"})
