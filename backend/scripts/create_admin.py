"""CLI script to create an admin user interactively."""

import asyncio
import getpass
import sys

from sqlalchemy import select

from app.database import async_session_factory
from app.models.user import User
from app.schemas.user import MIN_PASSWORD_LENGTH
from app.utils.security import hash_password


async def create_admin() -> None:
    username = input("Admin username: ").strip()
    if not username:
        print("Error: username cannot be empty.")
        sys.exit(1)

    email = input(f"Admin email [{username}@localhost]: ").strip() or f"{username}@localhost"

    while True:
        password = getpass.getpass("Password: ")
        if len(password) < MIN_PASSWORD_LENGTH:
            print(f"Error: password must be at least {MIN_PASSWORD_LENGTH} characters.")
            continue
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Error: passwords do not match.")
            continue
        break

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.username == username))
        if result.scalar_one_or_none():
            print(f"Error: user '{username}' already exists.")
            sys.exit(1)

        session.add(
            User(
                username=username,
                email=email,
                hashed_password=hash_password(password),
                role="admin",
                is_active=True,
            )
        )
        await session.commit()

    print(f"Admin user '{username}' created successfully.")


if __name__ == "__main__":
    asyncio.run(create_admin())
