"""Pruebas de integración para SPEC-03 (catalogo-service / productos CRUD) contra db-catalogo."""

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


def test_catp_t01_crear_producto_201(client: TestClient) -> None:
    """CATP-T01: POST /api/catalogo/productos válido retorna 201 y precio string con 2 decimales."""
    nuevo = {
        "sku": "SKU-9001",
        "nombre": "Cable USB-C 2m",
        "categoria": "Cables",
        "precio": "19.9",
        "stock": 15,
    }

    response = client.post("/api/catalogo/productos", json=nuevo)

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["id"], int)
    assert body["sku"] == "SKU-9001"
    assert body["nombre"] == "Cable USB-C 2m"
    assert body["categoria"] == "Cables"
    assert isinstance(body["precio"], str)
    assert body["precio"] == "19.90"
    assert re.fullmatch(r"\d+\.\d{2}", body["precio"])
    assert body["stock"] == 15
    assert body["activo"] is True

    # Verifica persistencia real en db-catalogo y consulta GET por ID.
    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        fila = conn.execute(
            "SELECT id, sku, nombre, categoria, precio, stock, activo FROM productos WHERE sku = %s",
            ("SKU-9001",),
        ).fetchone()
    assert fila is not None
    assert fila[0] == body["id"]
    assert str(fila[4]) == "19.90"

    detalle = client.get(f"/api/catalogo/productos/{body['id']}")
    assert detalle.status_code == 200
    assert detalle.json() == body


def test_catp_t02_sku_duplicado_409(client: TestClient) -> None:
    """CATP-T02: POST /api/catalogo/productos con SKU duplicado retorna 409 SKU_DUPLICADO."""
    payload = {
        "sku": "SKU-9002",
        "nombre": "Hub USB 4 Puertos",
        "categoria": "Accesorios",
        "precio": "35.50",
        "stock": 10,
    }
    creado = client.post("/api/catalogo/productos", json=payload)
    assert creado.status_code == 201

    duplicado = client.post(
        "/api/catalogo/productos",
        json={
            "sku": "SKU-9002",
            "nombre": "Otro Producto Mismo SKU",
            "categoria": "Accesorios",
            "precio": "40.00",
            "stock": 5,
        },
    )

    assert duplicado.status_code == 409
    _assert_error_pry_r07(duplicado.json(), "SKU_DUPLICADO")

    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        total = conn.execute(
            "SELECT COUNT(*) FROM productos WHERE sku = %s",
            ("SKU-9002",),
        ).fetchone()
    assert total == (1,)


def test_catp_t03_precio_o_stock_invalido_422(client: TestClient) -> None:
    """CATP-T03: POST /api/catalogo/productos con precio 0 o stock negativo retorna 422."""
    resp_precio_cero = client.post(
        "/api/catalogo/productos",
        json={
            "sku": "SKU-9003",
            "nombre": "Producto Precio Cero",
            "categoria": "Varios",
            "precio": 0,
            "stock": 5,
        },
    )
    assert resp_precio_cero.status_code == 422
    _assert_error_pry_r07(resp_precio_cero.json(), "VALIDACION_ERROR")

    resp_stock_negativo = client.post(
        "/api/catalogo/productos",
        json={
            "sku": "SKU-9004",
            "nombre": "Producto Stock Negativo",
            "categoria": "Varios",
            "precio": "12.50",
            "stock": -1,
        },
    )
    assert resp_stock_negativo.status_code == 422
    _assert_error_pry_r07(resp_stock_negativo.json(), "VALIDACION_ERROR")

    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        filas = conn.execute(
            "SELECT COUNT(*) FROM productos WHERE sku IN (%s, %s)",
            ("SKU-9003", "SKU-9004"),
        ).fetchone()
    assert filas == (0,)


def test_catp_t04_listar_filtra_categoria_y_q(client: TestClient) -> None:
    """CATP-T04: GET /api/catalogo/productos filtra por activo=TRUE, categoria y q (ILIKE)."""
    # Inserta un producto inactivo en db-catalogo para verificar CATP-R03 (activo=TRUE por defecto).
    with psycopg.connect(_database_url(), connect_timeout=5) as conn:
        conn.execute(
            "INSERT INTO productos (sku, nombre, categoria, precio, stock, activo) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            ("SKU-INACT", "Teclado Descontinuado", "Periféricos", "15.00", 3, False),
        )
        conn.commit()

    resp_todos = client.get("/api/catalogo/productos")
    assert resp_todos.status_code == 200
    body_todos = resp_todos.json()
    assert body_todos["total"] == 4
    assert len(body_todos["items"]) == 4
    assert all(item["activo"] is True for item in body_todos["items"])
    assert all(
        isinstance(item["precio"], str) and re.fullmatch(r"\d+\.\d{2}", item["precio"])
        for item in body_todos["items"]
    )

    resp_cat = client.get("/api/catalogo/productos", params={"categoria": "Periféricos"})
    assert resp_cat.status_code == 200
    body_cat = resp_cat.json()
    assert body_cat["total"] == 2
    assert {item["sku"] for item in body_cat["items"]} == {"SKU-1001", "SKU-1002"}

    resp_q = client.get("/api/catalogo/productos", params={"q": "teclado"})
    assert resp_q.status_code == 200
    body_q = resp_q.json()
    assert body_q["total"] == 1
    assert body_q["items"][0]["sku"] == "SKU-1001"

    resp_ambos = client.get(
        "/api/catalogo/productos",
        params={"categoria": "Periféricos", "q": "mouse"},
    )
    assert resp_ambos.status_code == 200
    body_ambos = resp_ambos.json()
    assert body_ambos["total"] == 1
    assert body_ambos["items"][0]["sku"] == "SKU-1002"


def test_catp_t05_detalle_inexistente_404(client: TestClient) -> None:
    """CATP-T05: GET /api/catalogo/productos/{id} inexistente retorna 404 PRODUCTO_NO_ENCONTRADO."""
    response = client.get("/api/catalogo/productos/999999")

    assert response.status_code == 404
    _assert_error_pry_r07(response.json(), "PRODUCTO_NO_ENCONTRADO")
