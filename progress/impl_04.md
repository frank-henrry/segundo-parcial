# Informe de Implementación — SPEC-04 (`catalogo-stock-reservas`)

- **Feature:** `4 — catalogo-stock-reservas` (`prefijo: CATS`)
- **Spec:** `services/catalogo-service/specs/productos/02-stock-reservas.md`
- **Agente:** `desarrolladorback`
- **Estado dejado:** `in_progress` (pendiente de pruebas `CATS-T01` a `CATS-T04` por `tester` y revisión por `revisor`)

## 1. Archivos creados y modificados (todos del §2)

- `[MODIFICAR]` `services/catalogo-service/app/modules/productos/schemas.py` — agregados los esquemas Pydantic v2 `StockUpdate` (`stock >= 0`) y `ReservaRequest` (`cantidad >= 1`), reutilizando el helper `_validar_entero_no_booleano` para rechazar valores booleanos.
- `[MODIFICAR]` `services/catalogo-service/app/modules/productos/repository.py` — agregadas las funciones `actualizar_stock` y `reservar_stock` con SQL parametrizado (`%s`) sobre `db-catalogo` y el helper `_error_producto_no_encontrado`.
- `[MODIFICAR]` `services/catalogo-service/app/modules/productos/router.py` — agregados los endpoints `PATCH /productos/{producto_id}/stock` y `POST /productos/{producto_id}/reservar` montados bajo `/api/catalogo`.

## 2. Cumplimiento de reglas (`CATS-R01` .. `CATS-R03` y `PRY-R01` .. `PRY-R07`)

- **CATS-R01 (`stock >= 0` y `cantidad >= 1` -> `422 VALIDACION_ERROR`):** `StockUpdate` exige `stock: int = Field(..., ge=0, le=2_147_483_647)` y `ReservaRequest` exige `cantidad: int = Field(..., ge=1, le=2_147_483_647)`, ambos rechazando booleanos mediante `_validar_entero_no_booleano`. El handler de `RequestValidationError` en `app/core/errors.py` retorna `422` con código `VALIDACION_ERROR`.
- **CATS-R02 (descuento atómico en una sola sentencia SQL):** `reservar_stock` en `repository.py` ejecuta la sentencia atómica `UPDATE productos SET stock = stock - %s WHERE id = %s AND stock >= %s RETURNING *` con parámetros `(cantidad, producto_id, cantidad)`.
- **CATS-R03 (manejo cuando no hay filas afectadas):** si el `UPDATE` atómico no retorna fila, `reservar_stock` consulta `SELECT 1 FROM productos WHERE id = %s`. Si no existe el producto lanza `ErrorApp(codigo="PRODUCTO_NO_ENCONTRADO", ..., status_code=404)`; si existe lanza `ErrorApp(codigo="STOCK_INSUFICIENTE", ..., status_code=409)`. En `actualizar_stock`, si el `UPDATE ... WHERE id = %s` no retorna fila, lanza `404 PRODUCTO_NO_ENCONTRADO`.
- **PRY-R01, PRY-R04, PRY-R05 y PRY-R07:** Toda consulta opera exclusivamente sobre `db-catalogo` (`app/core/db.py`) con marcadores `%s`, las respuestas retornan `ProductoOut` (`precio` como string con 2 decimales) y los errores siguen el formato `{ "error": { "codigo", "mensaje" } }`.
- **Contrato §5 (`01-proyecto-contratos.md`):**
  - `PATCH /api/catalogo/productos/{id}/stock` (`{ stock }`) → `200 ProductoOut` | `404 PRODUCTO_NO_ENCONTRADO` | `422 VALIDACION_ERROR`
  - `POST /api/catalogo/productos/{id}/reservar` (`{ cantidad }`) → `200 ProductoOut` | `404 PRODUCTO_NO_ENCONTRADO` | `409 STOCK_INSUFICIENTE` | `422 VALIDACION_ERROR`

## 3. Decisiones técnicas

- Se extrajo `_validar_entero_no_booleano(valor, campo)` en `schemas.py` para compartir la validación contra booleanos entre `ProductoCreate`, `StockUpdate` y `ReservaRequest` sin duplicar lógica.
- Se extrajo `_error_producto_no_encontrado(producto_id)` en `repository.py` para unificar la construcción del `ErrorApp` 404 entre `actualizar_stock` y `reservar_stock`.
- En `reservar_stock` se usó literalmente `UPDATE productos SET stock = stock - %s WHERE id = %s AND stock >= %s RETURNING *` según SPEC-04 §3/§4, manteniendo `ProductoOut.model_validate(fila)` (que ignora `created_at`) y haciendo `conn.commit()` únicamente cuando la fila fue actualizada.

## 4. Verificación ejecutada

- `python -m py_compile` sobre los 3 archivos modificados: **OK (exit 0)**.
- Import `from app.main import app` e inspección de rutas: registradas `PATCH /api/catalogo/productos/{producto_id}/stock` y `POST /api/catalogo/productos/{producto_id}/reservar`.
- Smoke check con `TestClient` contra `db-catalogo`: `PATCH .../stock` (`200`), `POST .../reservar` válido (`200`), `POST .../reservar` con stock insuficiente (`409 STOCK_INSUFICIENTE`), `POST .../reservar` y `PATCH .../stock` sobre ID inexistente (`404 PRODUCTO_NO_ENCONTRADO`), y payloads inválidos `stock=-1` / `cantidad=0` (`422 VALIDACION_ERROR`), con limpieza del registro temporal (`SMOKE_CATS_OK`).
- `& "C:\Program Files\Git\bin\bash.exe" init.sh --rapido`:

```text
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.12.0
[OK]    npm -> 11.6.2
[OK]    python -> Python 3.14.2
[OK]    docker -> Docker version 29.9.1

── 2. Verificando archivos base del arnés ──────────────
[OK]    Archivos base del arnés presentes (6 subagentes)

── 3. Specs, estado y alcance ──────────────────────────
[OK]    Specs intactas y conformes (<= 150 líneas, 6 secciones, 16 archivos)
[OK]    feature_list.json válido (12 features: pending=7 in_progress=1 done=4 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    SPEC-03: todos sus casos tienen prueba
[OK]    SPEC-04: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (78 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
7 passed in 0.57s
[OK]    catalogo-service (pytest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
