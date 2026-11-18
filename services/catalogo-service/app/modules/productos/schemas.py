"""Esquemas Pydantic v2 para el módulo de productos."""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import math

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _cuantizar_precio(valor: Decimal | int | float | str) -> Decimal:
    """Convierte y redondea un precio a 2 decimales evitando artefactos binarios."""
    if isinstance(valor, bool):
        raise ValueError("El precio no puede ser booleano")
    if isinstance(valor, float):
        if not math.isfinite(valor):
            raise ValueError("El precio debe ser un número finito")
        valor = Decimal(str(valor))
    elif isinstance(valor, Decimal):
        if not valor.is_finite():
            raise ValueError("El precio debe ser un número finito")
    else:
        try:
            valor = Decimal(str(valor))
        except InvalidOperation as exc:
            raise ValueError("Formato de precio inválido") from exc
        if not valor.is_finite():
            raise ValueError("El precio debe ser un número finito")
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _validar_entero_no_booleano(valor: object, campo: str) -> object:
    """Rechaza valores booleanos que Python convertiría a 0 o 1."""
    if isinstance(valor, bool):
        raise ValueError(f"El campo {campo} debe ser un entero")
    return valor


class ProductoCreate(BaseModel):
    """Payload de entrada para registrar un nuevo producto."""

    sku: str = Field(..., min_length=1, max_length=40)
    nombre: str = Field(..., min_length=1, max_length=160)
    categoria: str = Field(..., min_length=1, max_length=80)
    precio: Decimal = Field(..., gt=Decimal("0"), le=Decimal("9999999999.99"))
    stock: int = Field(..., ge=0, le=2_147_483_647)

    @field_validator("sku", "nombre", "categoria", mode="before")
    @classmethod
    def limpiar_texto(cls, valor: object) -> object:
        """Elimina espacios externos para rechazar cadenas vacías o en blanco."""
        if isinstance(valor, str):
            return valor.strip()
        return valor

    @field_validator("precio", mode="before")
    @classmethod
    def validar_precio_entrada(cls, valor: object) -> Decimal:
        """Convierte a Decimal finito con escala de 2 decimales."""
        if not isinstance(valor, (Decimal, int, float, str)):
            raise ValueError("El precio debe ser numérico")
        return _cuantizar_precio(valor)

    @field_validator("stock", mode="before")
    @classmethod
    def validar_stock_no_booleano(cls, valor: object) -> object:
        """Rechaza valores booleanos que Python convertiría a 0 o 1."""
        return _validar_entero_no_booleano(valor, "stock")


class StockUpdate(BaseModel):
    """Payload de entrada para actualización manual de stock."""

    stock: int = Field(..., ge=0, le=2_147_483_647)

    @field_validator("stock", mode="before")
    @classmethod
    def validar_stock_no_booleano(cls, valor: object) -> object:
        """Rechaza valores booleanos que Python convertiría a 0 o 1."""
        return _validar_entero_no_booleano(valor, "stock")


class ReservaRequest(BaseModel):
    """Payload de entrada para reserva atómica de inventario."""

    cantidad: int = Field(..., ge=1, le=2_147_483_647)

    @field_validator("cantidad", mode="before")
    @classmethod
    def validar_cantidad_no_booleano(cls, valor: object) -> object:
        """Rechaza valores booleanos que Python convertiría a 0 o 1."""
        return _validar_entero_no_booleano(valor, "cantidad")


class ProductoOut(BaseModel):
    """Representación pública de un producto según contrato REST."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    nombre: str
    categoria: str
    precio: str
    stock: int
    activo: bool

    @field_validator("precio", mode="before")
    @classmethod
    def formatear_precio(cls, valor: Decimal | int | float | str) -> str:
        """Serializa el precio como string exacto con 2 decimales (PRY-R04)."""
        return f"{_cuantizar_precio(valor):.2f}"


class ProductoListOut(BaseModel):
    """Respuesta paginada/listado de productos según contrato REST."""

    items: list[ProductoOut]
    total: int
