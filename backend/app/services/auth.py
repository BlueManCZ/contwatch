import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.refresh_token import RefreshToken
from app.models.user import User

bearer_scheme = HTTPBearer()

ROTATION_GRACE_SECONDS = 10


def create_access_token(user_id: int) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from err

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


# ---------------------------------------------------------------------------
# Refresh token helpers
# ---------------------------------------------------------------------------


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def _generate_raw_token(family: str) -> str:
    return f"{family}.{secrets.token_urlsafe(32)}"


def _extract_family(raw_token: str) -> str | None:
    parts = raw_token.split(".", 1)
    return parts[0] if len(parts) == 2 else None


async def create_refresh_token(
    db: AsyncSession,
    user_id: int,
    family: str | None = None,
) -> tuple[str, RefreshToken]:
    if family is None:
        family = secrets.token_urlsafe(32)
    raw_token = _generate_raw_token(family)
    now = datetime.now(UTC)
    row = RefreshToken(
        token_hash=_hash_token(raw_token),
        user_id=user_id,
        family=family,
        expires_at=now + timedelta(days=settings.jwt_refresh_token_expire_days),
        created_at=now,
    )
    db.add(row)
    await db.flush()
    return raw_token, row


async def rotate_refresh_token(
    db: AsyncSession,
    raw_token: str,
) -> tuple[str, User]:
    """Validate refresh token, rotate it, return (new_raw_token, user).

    Implements token family theft detection: if a rotated-away token is
    reused outside the grace period, the entire family is revoked.
    """
    token_hash = _hash_token(raw_token)
    now = datetime.now(UTC)

    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()

    if row is None:
        # Unknown token — possible theft. Revoke entire family.
        family = _extract_family(raw_token)
        if family:
            await db.execute(delete(RefreshToken).where(RefreshToken.family == family))
            await db.flush()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Expired?
    if row.expires_at < now:
        await db.delete(row)
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    # Already rotated — check grace period
    if row.rotated_at is not None:
        if (now - row.rotated_at).total_seconds() > ROTATION_GRACE_SECONDS:
            # Grace period exceeded — revoke family (theft detection)
            await db.execute(delete(RefreshToken).where(RefreshToken.family == row.family))
            await db.flush()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token already used",
            )
        # Within grace — return new access token but don't rotate again.
        # Load user.
        user_result = await db.execute(select(User).where(User.id == row.user_id))
        user = user_result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        # Return the same raw token (client already has the new cookie from the first rotation)
        return raw_token, user

    # Load user before rotating
    user_result = await db.execute(select(User).where(User.id == row.user_id))
    user = user_result.scalar_one_or_none()
    if not user or not user.is_active:
        await db.delete(row)
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Mark old token as rotated
    row.rotated_at = now

    # Create new token in the same family
    new_raw, _new_row = await create_refresh_token(db, user.id, family=row.family)
    await db.flush()
    return new_raw, user


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    token_hash = _hash_token(raw_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    row = result.scalar_one_or_none()
    if row:
        # Revoke entire family for clean logout
        await db.execute(delete(RefreshToken).where(RefreshToken.family == row.family))
        await db.flush()


async def revoke_all_user_tokens(db: AsyncSession, user_id: int) -> None:
    await db.execute(delete(RefreshToken).where(RefreshToken.user_id == user_id))
    await db.flush()


async def cleanup_expired_tokens(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    grace_cutoff = now - timedelta(seconds=ROTATION_GRACE_SECONDS * 2)
    await db.execute(
        delete(RefreshToken).where(
            (RefreshToken.expires_at < now)
            | ((RefreshToken.rotated_at.isnot(None)) & (RefreshToken.rotated_at < grace_cutoff))
        )
    )
    await db.flush()
