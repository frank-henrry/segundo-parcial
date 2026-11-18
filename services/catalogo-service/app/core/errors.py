"""Manejo centralizado de errores en formato estándar PRY-R07."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErrorApp(Exception):
    """Excepción de dominio/aplicación serializable según PRY-R07."""

    def __init__(self, codigo: str, mensaje: str, status_code: int = 400) -> None:
        self.codigo = codigo.upper()
        self.mensaje = mensaje
        self.status_code = status_code
        super().__init__(mensaje)


def _error_payload(codigo: str, mensaje: str) -> dict[str, dict[str, str]]:
    """Construye la estructura JSON estándar de error (PRY-R07)."""
    return {"error": {"codigo": codigo.upper(), "mensaje": mensaje}}


def _codigo_http_por_defecto(status_code: int) -> str:
    """Mapea códigos de estado HTTP estándar a códigos UPPERCASE."""
    mapeo = {
        400: "SOLICITUD_INVALIDA",
        401: "NO_AUTORIZADO",
        403: "PROHIBIDO",
        404: "NO_ENCONTRADO",
        405: "METODO_NO_PERMITIDO",
        409: "CONFLICTO",
        422: "VALIDACION_ERROR",
    }
    return mapeo.get(status_code, f"HTTP_{status_code}")


def registrar_error_handlers(app: FastAPI) -> None:
    """Registra los handlers globales de error en la instancia FastAPI."""

    @app.exception_handler(ErrorApp)
    async def manejar_error_app(_request: Request, exc: ErrorApp) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.codigo, exc.mensaje),
        )

    @app.exception_handler(RequestValidationError)
    async def manejar_validacion(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        detalles = "; ".join(
            f"{'.'.join(str(p) for p in err.get('loc', []))}: {err.get('msg', '')}"
            for err in exc.errors()
        )
        mensaje = detalles or "Datos de entrada inválidos"
        return JSONResponse(
            status_code=422,
            content=_error_payload("VALIDACION_ERROR", mensaje),
        )

    @app.exception_handler(StarletteHTTPException)
    async def manejar_http_exception(
        _request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        codigo = _codigo_http_por_defecto(exc.status_code)
        mensaje = str(exc.detail) if exc.detail else "Error HTTP"
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(codigo, mensaje),
        )

    @app.exception_handler(Exception)
    async def manejar_error_inesperado(
        _request: Request, _exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=_error_payload("ERROR_INTERNO", "Error interno del servidor"),
        )
