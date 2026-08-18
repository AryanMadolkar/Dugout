from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.db.models import Base  # noqa: F401
from app.db.session import engine
from app.middleware.service_prefix import ServicePrefixMiddleware


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AI FPL Manager API",
    version="0.1.0",
    description="Data → ML predictions → optimization → AI explanation",
    lifespan=lifespan,
)

if settings.service_path_prefix:
    app.add_middleware(ServicePrefixMiddleware, prefix=settings.service_path_prefix)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
