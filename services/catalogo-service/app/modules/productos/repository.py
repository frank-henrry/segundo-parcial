"""Repositorio SQL parametrizado para productos sobre db-catalogo."""

from typing import Any

import psycopg

from app.core.db import get_connection
from app.core.errors import ErrorApp
from app.modules.productos.schemas import ProductoCreate

_COLUMNAS_PRODUCTO = "id, sku, nombre, categoria, precio, stock, activo"


def listar_productos(
    categoria: str | None = None,
    q: str | None = None,
    activo: bool = True,
) -> list[dict[str, Any]]:
    """Lista productos filtrando por activo, categoría exacta y búsqueda en nombre."""
    condiciones = ["activo = %s"]
    parametros: list[Any] = [activo]

    if categoria is not None and categoria.strip():
        condiciones.append("categoria = %s")
        parametros.append(categoria.strip())

    if q is not None and q.strip():
        condiciones.append("nombre ILIKE %s")
        parametros.append(f"%{q.strip()}%")

    where_sql = " AND ".join(condiciones)
    consulta = (
        f"SELECT {_COLUMNAS_PRODUCTO} FROM productos "
        f"WHERE {where_sql} ORDER BY id ASC"
    )
    with get_connection() as conn:
        return list(conn.execute(consulta, parametros).fetchall())


def obtener_producto_por_id(producto_id: int) -> dict[str, Any] | None:
    """Obtiene un producto por su ID o None si no existe."""
    consulta = f"SELECT {_COLUMNAS_PRODUCTO} FROM productos WHERE id = %s"
    with get_connection() as conn:
        return conn.execute(consulta, (producto_id,)).fetchone()


def crear_producto(data: ProductoCreate) -> dict[str, Any]:
    """Inserta un nuevo producto y traduce violación de SKU único a 409."""
    consulta = (
        "INSERT INTO productos (sku, nombre, categoria, precio, stock) "
        "VALUES (%s, %s, %s, %s, %s) "
        f"RETURNING {_COLUMNAS_PRODUCTO}"
    )
    parametros = (data.sku, data.nombre, data.categoria, data.precio, data.stock)
    try:
        with get_connection() as conn:
            fila = conn.execute(consulta, parametros).fetchone()
            conn.commit()
            if fila is None:
                raise ErrorApp(
                    codigo="ERROR_INTERNO",
                    mensaje="No se pudo recuperar el producto creado",
                    status_code=500,
                )
            return fila
    except psycopg.errors.UniqueViolation as exc:
        raise ErrorApp(
            codigo="SKU_DUPLICADO",
            mensaje=f"Ya existe un producto con SKU '{data.sku}'",
            status_code=409,
        ) from exc


def _error_producto_no_encontrado(producto_id: int) -> ErrorApp:
    """Construye el error estándar 404 cuando un producto no existe."""
    return ErrorApp(
        codigo="PRODUCTO_NO_ENCONTRADO",
        mensaje=f"Producto con id {producto_id} no encontrado",
        status_code=404,
    )


def actualizar_stock(producto_id: int, stock: int) -> dict[str, Any]:
    """Actualiza manualmente el stock de un producto o lanza 404 si no existe."""
    consulta = (
        "UPDATE productos SET stock = %s "
        "WHERE id = %s "
        f"RETURNING {_COLUMNAS_PRODUCTO}"
    )
    with get_connection() as conn:
        fila = conn.execute(consulta, (stock, producto_id)).fetchone()
        if fila is None:
            raise _error_producto_no_encontrado(producto_id)
        conn.commit()
        return fila


def reservar_stock(producto_id: int, cantidad: int) -> dict[str, Any]:
    """Descuenta stock de forma atómica en una sola sentencia SQL."""
    consulta_reserva = (
        "UPDATE productos SET stock = stock - %s "
        "WHERE id = %s AND stock >= %s "
        "RETURNING *"
    )
    with get_connection() as conn:
        fila = conn.execute(
            consulta_reserva, (cantidad, producto_id, cantidad)
        ).fetchone()
        if fila is not None:
            conn.commit()
            return fila
        existe = conn.execute(
            "SELECT 1 FROM productos WHERE id = %s",
            (producto_id,),
        ).fetchone()

    if existe is None:
        raise _error_producto_no_encontrado(producto_id)
    raise ErrorApp(
        codigo="STOCK_INSUFICIENTE",
        mensaje=f"Stock insuficiente para el producto con id {producto_id}",
        status_code=409,
    )
