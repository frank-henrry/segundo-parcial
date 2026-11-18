"""Punto de entrada FastAPI de catalogo-service."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.core.config import SERVICE_NAME
from app.core.db import check_db, close_pool, init_pool
from app.core.errors import registrar_error_handlers
from app.modules.productos import router as productos_router


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Gestiona el ciclo de vida del pool de conexiones a db-catalogo."""
    init_pool()
    try:
        yield
    finally:
        close_pool()


def _estado_salud() -> JSONResponse:
    """Evalúa conectividad a db-catalogo y responde 200 o 503 (PRY-R03)."""
    if check_db():
        return JSONResponse(
            status_code=200,
            content={"status": "ok", "service": SERVICE_NAME, "db": "up"},
        )
    return JSONResponse(
        status_code=503,
        content={"status": "error", "service": SERVICE_NAME, "db": "down"},
    )


def create_app() -> FastAPI:
    """Construye y configura la aplicación FastAPI de catalogo-service."""
    application = FastAPI(
        title=SERVICE_NAME,
        version="1.0.0",
        lifespan=lifespan,
    )
    registrar_error_handlers(application)

    @application.get("/health", tags=["health"])
    def health() -> JSONResponse:
        return _estado_salud()

    @application.get("/api/catalogo/health", tags=["health"])
    def api_catalogo_health() -> JSONResponse:
        return _estado_salud()

    application.include_router(productos_router, prefix="/api/catalogo")

    return application


app = create_app()
