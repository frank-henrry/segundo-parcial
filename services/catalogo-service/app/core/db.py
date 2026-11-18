"""Gestión de conexiones y verificación de salud para db-catalogo."""

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import get_settings

_pool: ConnectionPool | None = None
_pool_dsn: str | None = None


def init_pool() -> ConnectionPool:
    """Inicializa el pool de conexiones hacia db-catalogo."""
    global _pool, _pool_dsn
    dsn = get_settings().database_url
    if _pool is not None and _pool_dsn == dsn:
        return _pool
    close_pool()
    pool = ConnectionPool(
        conninfo=dsn,
        min_size=1,
        max_size=10,
        timeout=3.0,
        open=False,
        kwargs={"row_factory": dict_row, "connect_timeout": 3},
    )
    pool.open(wait=False)
    _pool = pool
    _pool_dsn = dsn
    return pool


def close_pool() -> None:
    """Cierra el pool de conexiones si está activo."""
    global _pool, _pool_dsn
    if _pool is not None:
        _pool.close()
        _pool = None
        _pool_dsn = None


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    """Entrega una conexión psycopg v3 hacia db-catalogo."""
    dsn = get_settings().database_url
    if _pool is not None and _pool_dsn == dsn:
        with _pool.connection(timeout=3.0) as conn:
            yield conn
        return

    with psycopg.connect(dsn, row_factory=dict_row, connect_timeout=3) as conn:
        yield conn


def check_db() -> bool:
    """Verifica conectividad ejecutando SELECT 1 contra db-catalogo."""
    try:
        with get_connection() as conn:
            row = conn.execute("SELECT 1 AS ok").fetchone()
            return bool(row)
    except Exception:
        return False
