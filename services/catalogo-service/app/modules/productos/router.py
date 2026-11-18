"""Router FastAPI del módulo productos de catalogo-service."""

from fastapi import APIRouter, Query, status

from app.core.errors import ErrorApp
from app.modules.productos import repository
from app.modules.productos.schemas import (
    ProductoCreate,
    ProductoListOut,
    ProductoOut,
    ReservaRequest,
    StockUpdate,
)

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("", response_model=ProductoListOut)
def listar_productos(
    categoria: str | None = Query(default=None),
    q: str | None = Query(default=None),
    activo: bool = Query(default=True),
) -> ProductoListOut:
    """Lista productos filtrando por activo=TRUE, categoría exacta y nombre ILIKE."""
    filas = repository.listar_productos(categoria=categoria, q=q, activo=activo)
    items = [ProductoOut.model_validate(fila) for fila in filas]
    return ProductoListOut(items=items, total=len(items))


@router.get("/{producto_id}", response_model=ProductoOut)
def obtener_producto(producto_id: int) -> ProductoOut:
    """Retorna el detalle de un producto por ID o 404 PRODUCTO_NO_ENCONTRADO."""
    fila = repository.obtener_producto_por_id(producto_id)
    if fila is None:
        raise ErrorApp(
            codigo="PRODUCTO_NO_ENCONTRADO",
            mensaje=f"Producto con id {producto_id} no encontrado",
            status_code=404,
        )
    return ProductoOut.model_validate(fila)


@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear_producto(payload: ProductoCreate) -> ProductoOut:
    """Registra un nuevo producto en db-catalogo."""
    fila = repository.crear_producto(payload)
    return ProductoOut.model_validate(fila)


@router.patch("/{producto_id}/stock", response_model=ProductoOut)
def actualizar_stock(producto_id: int, payload: StockUpdate) -> ProductoOut:
    """Actualiza manualmente el stock de un producto en db-catalogo."""
    fila = repository.actualizar_stock(producto_id, payload.stock)
    return ProductoOut.model_validate(fila)


@router.post("/{producto_id}/reservar", response_model=ProductoOut)
def reservar_stock(producto_id: int, payload: ReservaRequest) -> ProductoOut:
    """Descuenta stock de un producto de forma atómica."""
    fila = repository.reservar_stock(producto_id, payload.cantidad)
    return ProductoOut.model_validate(fila)
