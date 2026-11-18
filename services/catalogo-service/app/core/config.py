"""Configuración de entorno para catalogo-service."""

from dataclasses import dataclass
import os

DEFAULT_DATABASE_URL = (
    "postgresql://catalogo_user:catalogo_local_password@localhost:5433/catalogo"
)
DEFAULT_PORT = 8001
SERVICE_NAME = "catalogo-service"


@dataclass(frozen=True)
class Settings:
    """Parámetros de configuración cargados desde variables de entorno."""

    database_url: str
    port: int
    service_name: str = SERVICE_NAME


def get_settings() -> Settings:
    """Obtiene la configuración actual leyendo las variables de entorno."""
    database_url = os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL
    port_raw = os.environ.get("PORT", str(DEFAULT_PORT))
    try:
        port = int(port_raw)
    except ValueError:
        port = DEFAULT_PORT
    return Settings(database_url=database_url, port=port)
