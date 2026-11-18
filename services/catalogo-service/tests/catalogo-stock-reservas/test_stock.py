"""Pruebas de integración para SPEC-04 (catalogo-service / stock y reservas) contra db-catalogo."""

from concurrent.futures import ThreadPoolExecutor
import os
import re

from fastapi.testclient import TestClient
import psycopg

from app.core.config import DEFAULT_DATABASE_URL


def _database_url() -> str:
    """Devuelve la URL de conexión real a db-catalogo."""
    return os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL


def _assert_error_pry_r07(payload: dict, codigo_esperado: str) -> None:
    """Valida el formato estándar de error PRY-R07."""
    assert set(payload.keys()) == {"error"}
    error = payload["error"]
    assert isinstance(error, dict)
    assert set(error.keys()) == {"codigo", "mensaje"}
    assert error["codigo"] == codigo_esperado
    assert isinstance(error["mensaje"], str)
    assert error["mensaje"].strip() != ""


def _crear_producto_prueba(client: TestClient, sku: str, stock: int) -> dict:
    """Crea un producto auxiliar mediante el endpoint REST para pruebas de stock."""
    resp = client.post(
        "/api/catalogo/productos",
        json={
            "sku": sku,
            "nombre": f"Producto {sku}",
            "categoria": "Pruebas",
            "precio": "25.50",
            "stock": stock,
        },
    )
    assert resp.status_code == 201
    return resp.json()


def test_cats_t01_actualizar_stock_200(client: TestClient) -> None:
    """CATS-T01: PATCH /api/catalogo/productos/{id}/stock actualiza el stock y retorna 200."""
    producto = _crear_producto_prueba(client, "SKU-CATS-01", stock=10)
    producto_id = producto["id"]

    resp = client.patch(
        f"/api/catalogo/productos/{producto_id}/stock",
        json={"stock": 42},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == producto_id
    assert body["sku"] == "SKU-CATS-01"
    assert body["stock"] == 42
    assert isinstance(body["precio"], str)
    assert re.fullmatch(r"\d+\.\d{2}", body["precio"])
    assert body["precio"] == "25.50"
    assert body["activo"] is True

    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        fila = conn.execute(
            "SELECT stock FROM productos WHERE id = %s",
            (producto_id,),
        ).fetchone()
    assert fila == (42,)

    # CATS-R01: stock == 0 es válido; stock < 0 retorna 422 VALIDACION_ERROR sin alterar BD.
    resp_cero = client.patch(
        f"/api/catalogo/productos/{producto_id}/stock",
        json={"stock": 0},
    )
    assert resp_cero.status_code == 200
    assert resp_cero.json()["stock"] == 0

    resp_invalido = client.patch(
        f"/api/catalogo/productos/{producto_id}/stock",
        json={"stock": -1},
    )
    assert resp_invalido.status_code == 422
    _assert_error_pry_r07(resp_invalido.json(), "VALIDACION_ERROR")

    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        fila_final = conn.execute(
            "SELECT stock FROM productos WHERE id = %s",
            (producto_id,),
        ).fetchone()
    assert fila_final == (0,)


def test_cats_t02_reservar_stock_atomico_200(client: TestClient) -> None:
    """CATS-T02: POST /api/catalogo/productos/{id}/reservar descuenta stock atómicamente."""
    producto = _crear_producto_prueba(client, "SKU-CATS-02", stock=10)
    producto_id = producto["id"]

    resp = client.post(
        f"/api/catalogo/productos/{producto_id}/reservar",
        json={"cantidad": 4},
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == producto_id
    assert body["stock"] == 6
    assert body["precio"] == "25.50"

    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        fila = conn.execute(
            "SELECT stock FROM productos WHERE id = %s",
            (producto_id,),
        ).fetchone()
    assert fila == (6,)

    # Verifica atomicidad bajo concurrencia real: stock=5 con 2 reservas simultáneas de 3.
    producto_conc = _crear_producto_prueba(client, "SKU-CATS-02C", stock=5)
    conc_id = producto_conc["id"]

    def _intentar_reserva() -> int:
        r = client.post(
            f"/api/catalogo/productos/{conc_id}/reservar",
            json={"cantidad": 3},
        )
        return r.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        futuros = [pool.submit(_intentar_reserva), pool.submit(_intentar_reserva)]
        codigos = sorted(f.result() for f in futuros)

    assert codigos == [200, 409]

    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        fila_conc = conn.execute(
            "SELECT stock FROM productos WHERE id = %s",
            (conc_id,),
        ).fetchone()
    assert fila_conc == (2,)


def test_cats_t03_stock_insuficiente_409(client: TestClient) -> None:
    """CATS-T03: POST /api/catalogo/productos/{id}/reservar con stock insuficiente retorna 409."""
    producto = _crear_producto_prueba(client, "SKU-CATS-03", stock=5)
    producto_id = producto["id"]

    resp = client.post(
        f"/api/catalogo/productos/{producto_id}/reservar",
        json={"cantidad": 6},
    )

    assert resp.status_code == 409
    _assert_error_pry_r07(resp.json(), "STOCK_INSUFICIENTE")

    # CATS-R01: cantidad < 1 retorna 422 VALIDACION_ERROR.
    resp_invalido = client.post(
        f"/api/catalogo/productos/{producto_id}/reservar",
        json={"cantidad": 0},
    )
    assert resp_invalido.status_code == 422
    _assert_error_pry_r07(resp_invalido.json(), "VALIDACION_ERROR")

    # El stock permanece intacto en db-catalogo y en consulta GET.
    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        fila = conn.execute(
            "SELECT stock FROM productos WHERE id = %s",
            (producto_id,),
        ).fetchone()
    assert fila == (5,)

    detalle = client.get(f"/api/catalogo/productos/{producto_id}")
    assert detalle.status_code == 200
    assert detalle.json()["stock"] == 5


def test_cats_t04_reservar_inexistente_404(client: TestClient) -> None:
    """CATS-T04: POST /api/catalogo/productos/{id}/reservar sobre producto inexistente retorna 404."""
    resp = client.post(
        "/api/catalogo/productos/999999/reservar",
        json={"cantidad": 1},
    )

    assert resp.status_code == 404
    _assert_error_pry_r07(resp.json(), "PRODUCTO_NO_ENCONTRADO")

    resp_patch = client.patch(
        "/api/catalogo/productos/999999/stock",
        json={"stock": 10},
    )
    assert resp_patch.status_code == 404
    _assert_error_pry_r07(resp_patch.json(), "PRODUCTO_NO_ENCONTRADO")
