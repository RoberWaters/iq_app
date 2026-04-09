from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool 
from typing import AsyncGenerator

from config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    poolclass=NullPool if "sqlite" in settings.DATABASE_URL else None,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that provides an async database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Create all database tables."""
    import models  # noqa: F401  -- ensure all models are loaded before creating tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "sqlite" in settings.DATABASE_URL:
            await conn.run_sync(_run_sqlite_migrations)


def _run_sqlite_migrations(sync_conn) -> None:
    inspector = inspect(sync_conn)

    def has_column(table_name: str, column_name: str) -> bool:
        return any(col["name"] == column_name for col in inspector.get_columns(table_name))

    column_updates = {
        "practice_sessions": [
            ("student_id", "ALTER TABLE practice_sessions ADD COLUMN student_id VARCHAR"),
            ("student_code", "ALTER TABLE practice_sessions ADD COLUMN student_code VARCHAR"),
            ("section_id", "ALTER TABLE practice_sessions ADD COLUMN section_id VARCHAR"),
            ("section_code", "ALTER TABLE practice_sessions ADD COLUMN section_code VARCHAR"),
        ],
        "section_practices": [
            ("name", "ALTER TABLE section_practices ADD COLUMN name VARCHAR"),
            ("unit", "ALTER TABLE section_practices ADD COLUMN unit VARCHAR"),
        ],
        "grades": [
            ("auto_score", "ALTER TABLE grades ADD COLUMN auto_score FLOAT"),
            ("manual_score", "ALTER TABLE grades ADD COLUMN manual_score FLOAT"),
            ("last_session_id", "ALTER TABLE grades ADD COLUMN last_session_id VARCHAR"),
            ("updated_at", "ALTER TABLE grades ADD COLUMN updated_at DATETIME"),
        ],
        "sections": [
            ("description", "ALTER TABLE sections ADD COLUMN description VARCHAR"),
            ("academic_year", "ALTER TABLE sections ADD COLUMN academic_year VARCHAR"),
            ("academic_period", "ALTER TABLE sections ADD COLUMN academic_period VARCHAR"),
        ],
    }

    for table_name, statements in column_updates.items():
        if table_name not in inspector.get_table_names():
            continue
        for column_name, sql in statements:
            if not has_column(table_name, column_name):
                sync_conn.execute(text(sql))
