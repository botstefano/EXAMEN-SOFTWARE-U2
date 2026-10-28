import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

engine = create_async_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    from app import models  # noqa
    last = None
    for _ in range(30):
        try:
            async with engine.begin() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                await conn.run_sync(Base.metadata.create_all)
                await conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS idx_ind_trgm ON indicators USING gin (value_normalized gin_trgm_ops)"))
            return
        except Exception as e:  # DB aun no lista
            last = e
            await asyncio.sleep(2)
    raise RuntimeError(f"No se pudo conectar a la BD: {last}")
