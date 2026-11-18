# Review — SPEC-04 catalogo-stock-reservas

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — `services/catalogo-service/app/` opera exclusivamente contra `db-catalogo` (`app/core/db.py`); grep sin referencias a `db-ordenes` ni `ordenes`.
- [x] PRY-R02 — Capas limpias: `router.py` valida entrada con Pydantic y delega persistencia a `repository.py`.
- [x] PRY-R04 — Precios serializados como string con 2 decimales mediante `Decimal` (`schemas.py:9-27,106-110`); sin uso de `float` en el módulo.
- [x] PRY-R05 — Todas las consultas SQL en `repository.py:85-115` usan parámetros `%s` en `psycopg`.
- [x] PRY-R06 / PRY-R07 — Sin credenciales hardcodeadas; errores en formato `{ "error": { "codigo", "mensaje" } }` (`app/core/errors.py:19-60`).
- [x] PRY-R08 / §2 — Solo se modificaron `schemas.py`, `repository.py` y `router.py` en `services/catalogo-service/app/modules/productos/`, además de `tests/catalogo-stock-reservas/test_stock.py`.
- [x] Contrato §5 (`specs-v2/01-proyecto-contratos.md`) — `PATCH /api/catalogo/productos/{id}/stock` (`200 Producto`) y `POST /api/catalogo/productos/{id}/reservar` (`200 Producto` | `409 STOCK_INSUFICIENTE` | `404 PRODUCTO_NO_ENCONTRADO`) implementados según contrato.
- [x] CATS-R01 — `StockUpdate` (`stock >= 0`, `schemas.py:69-78`) y `ReservaRequest` (`cantidad >= 1`, `schemas.py:81-90`) rechazan booleanos y valores fuera de rango retornando `422 VALIDACION_ERROR`.
- [x] CATS-R02 — Descuento atómico en una sola sentencia SQL `UPDATE productos SET stock = stock - %s WHERE id = %s AND stock >= %s RETURNING *` (`repository.py:98-111`).
- [x] CATS-R03 — Si no hay filas afectadas en reserva, consulta existencia en `db-catalogo` y retorna `404 PRODUCTO_NO_ENCONTRADO` o `409 STOCK_INSUFICIENTE` (`repository.py:112-123`); en `actualizar_stock` retorna `404 PRODUCTO_NO_ENCONTRADO` (`repository.py:92-93`).

## Casos de prueba
- [x] CATS-T01 (`test_cats_t01_actualizar_stock_200`) — `PATCH /api/catalogo/productos/{id}/stock` actualiza a `42` y `0` (`200`), rechaza `-1` (`422 VALIDACION_ERROR`) y verifica en `db-catalogo`.
- [x] CATS-T02 (`test_cats_t02_reservar_stock_atomico_200`) — `POST /api/catalogo/productos/{id}/reservar` descuenta stock y valida concurrencia real (`ThreadPoolExecutor`, respuestas `[200, 409]`, stock final `2` en `db-catalogo`).
- [x] CATS-T03 (`test_cats_t03_stock_insuficiente_409`) — Reserva con stock insuficiente retorna `409 STOCK_INSUFICIENTE`, `cantidad=0` retorna `422 VALIDACION_ERROR`, stock intacto en `db-catalogo`.
- [x] CATS-T04 (`test_cats_t04_reservar_inexistente_404`) — `POST .../reservar` y `PATCH .../stock` sobre producto inexistente (`999999`) retornan `404 PRODUCTO_NO_ENCONTRADO`.
- [x] Regresión `catalogo-service` — `pytest -v`: `11 passed in 0.96s` contra PostgreSQL real (`db-catalogo`).

## Checkpoints
- C1: [x]  C2: [x]  C3: [x]  C4: [x]  C5: [x]

## Salida de `bash init.sh`

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
[OK]    Alcance de archivos correcto (80 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
...........                                                              [100%]
11 passed in 1.01s
[OK]    catalogo-service (pytest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
