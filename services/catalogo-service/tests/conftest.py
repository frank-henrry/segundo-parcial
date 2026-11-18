"""Fixtures compartidas de pytest para catalogo-service (aisladas en db-catalogo)."""

from collections.abc import Iterator
import os
from pathlib import Path
import sys

from fastapi.testclient import TestClient
import psycopg
import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.core.config import DEFAULT_DATABASE_URL  # noqa: E402
from app.main import create_app  # noqa: E402

INIT_SQL_PATH = SERVICE_ROOT / "db" / "init.sql"


def _database_url() -> str:
    """Devuelve la URL de conexión exclusiva para db-catalogo."""
    return os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL


def _aplicar_init_sql(conn: psycopg.Connection) -> None:
    """Ejecuta db/init.sql sobre db-catalogo."""
    sql = INIT_SQL_PATH.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


@pytest.fixture(scope="session", autouse=True)
def inicializar_db_catalogo() -> None:
    """Aplica el esquema e inventario semilla en db-catalogo al iniciar pruebas."""
    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        _aplicar_init_sql(conn)


@pytest.fixture(autouse=True)
def limpiar_y_resemillar_db() -> Iterator[None]:
    """Restablece la tabla productos antes de cada prueba para garantizar aislamiento."""
    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE productos RESTART IDENTITY CASCADE;")
        conn.commit()
        _aplicar_init_sql(conn)
    yield


@pytest.fixture()
def client() -> Iterator[TestClient]:
    """Cliente HTTP de pruebas contra la instancia FastAPI de catalogo-service."""
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
