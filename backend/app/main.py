from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api
from app.core.config import get_settings
from app.db import init_db

s = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    if s.auto_seed:
        from app.seed import seed_if_empty
        await seed_if_empty()
    yield


app = FastAPI(title="PhishGuard Bank API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=s.cors_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(api, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
