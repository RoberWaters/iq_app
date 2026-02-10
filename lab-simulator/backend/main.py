from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialise DB on startup."""
    await init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers -- import dynamically so the app still starts even when individual
# router modules are not yet implemented.
# ---------------------------------------------------------------------------
_router_modules = [
    ("routers.practices", "router", "/api"),
    ("routers.sessions", "router", "/api"),
    ("routers.calculations", "router", "/api"),
]

for module_path, attr_name, prefix in _router_modules:
    try:
        import importlib
        mod = importlib.import_module(module_path)
        app.include_router(getattr(mod, attr_name), prefix=prefix)
    except (ModuleNotFoundError, AttributeError):
        # Router not implemented yet -- skip silently
        pass


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API"}


@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
