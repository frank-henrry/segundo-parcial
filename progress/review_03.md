# Review — SPEC-03 catalogo-productos-crud

**Veredicto:** APROBADO

## Reglas
- [x] **PRY-R01** — `services/catalogo-service/app/` no contiene referencias a `db-ordenes`, `ordenes` ni tablas de órdenes; `app/modules/productos/repository.py:7` usa exclusivamente `app.core.db.get_connection` (`db-catalogo`).
- [x] **PRY-R02** — Capas limpias: `app/modules/productos/router.py` (HTTP) → `schemas.py` (validación/serialización) y `repository.py` (acceso a datos `db-catalogo`).
- [x] **PRY-R03** — `GET /health` y `GET /api/catalogo/health` permanecen operativos en `app/main.py:47-53`.
- [x] **PRY-R04** — `services/catalogo-service/db/init.sql:6` define `precio NUMERIC(12, 2)`; `app/modules/productos/schemas.py:9-27,47-53,77-81` convierte y cuantiza con `decimal.Decimal` (`ROUND_HALF_UP`) y serializa `ProductoOut.precio` como string con 2 decimales (`"19.90"`), sin aritmética `float`.
- [x] **PRY-R05** — SQL 100 % parametrizado con `%s` en `app/modules/productos/repository.py:20-57` (`listar_productos`, `obtener_producto_por_id`, `crear_producto`), sin concatenación de valores de entrada.
- [x] **PRY-R06** — Sin credenciales ni secretos hardcodeados en `app/modules/productos/` ni `app/main.py`.
- [x] **PRY-R07** — Errores JSON con formato `{"error": {"codigo": "...", "mensaje": "..."}}`: `409 SKU_DUPLICADO` (`repository.py:66-71`), `404 PRODUCTO_NO_ENCONTRADO` (`router.py:29-33`) y `422 VALIDACION_ERROR` (`app/core/errors.py:48-60`).
- [x] **PRY-R08** — Specs intactas verificadas por `.harness/specs.sha256`.
- [x] **CATP-R01** — `crear_producto` (`repository.py:66-71`) captura `psycopg.errors.UniqueViolation` y retorna `409 SKU_DUPLICADO`.
- [x] **CATP-R02** — `ProductoCreate` (`schemas.py:36-37,47-61`) valida `precio > 0` (tras cuantizar a 2 decimales) y `stock >= 0` (rechazando booleanos y negativos), devolviendo `422 VALIDACION_ERROR`.
- [x] **CATP-R03** — `listar_productos` (`router.py:12-21`, `repository.py:14-37`) filtra `activo = TRUE` por defecto, `?categoria=` exacto y `?q=` `ILIKE` sobre `nombre`.
- [x] **CATP-R04** — `precio` se almacena como `NUMERIC(12,2)` y se serializa como string con 2 decimales (`ProductoOut.formatear_precio`, `schemas.py:77-81`).
- [x] **Contrato §5 (`specs-v2/01-proyecto-contratos.md`)** — `GET /api/catalogo/productos`, `GET /api/catalogo/productos/{id}` y `POST /api/catalogo/productos` montados en `app/main.py:55` con campos y códigos HTTP exactos.

## Casos de prueba
- [x] `CATP-T01` (`services/catalogo-service/tests/catalogo-productos-crud/test_crud.py:28-64`) — `test_catp_t01_crear_producto_201` PASSED (`201`, `precio: "19.90"` string, persistencia verificada en `db-catalogo` y `GET /{id}`).
- [x] `CATP-T02` (`services/catalogo-service/tests/catalogo-productos-crud/test_crud.py:67-98`) — `test_catp_t02_sku_duplicado_409` PASSED (`409 SKU_DUPLICADO` en formato PRY-R07, 1 fila en BD).
- [x] `CATP-T03` (`services/catalogo-service/tests/catalogo-productos-crud/test_crud.py:101-134`) — `test_catp_t03_precio_o_stock_invalido_422` PASSED (`422 VALIDACION_ERROR` para `precio=0` y `stock=-1`, 0 filas insertadas).
- [x] `CATP-T04` (`services/catalogo-service/tests/catalogo-productos-crud/test_crud.py:137-178`) — `test_catp_t04_listar_filtra_categoria_y_q` PASSED (filtra `activo=TRUE`, `?categoria=`, `?q=` y combinación).
- [x] `CATP-T05` (`services/catalogo-service/tests/catalogo-productos-crud/test_crud.py:181-186`) — `test_catp_t05_detalle_inexistente_404` PASSED (`404 PRODUCTO_NO_ENCONTRADO` en formato PRY-R07).

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
[OK]    feature_list.json válido (12 features: pending=8 in_progress=1 done=3 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    SPEC-03: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (77 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
.......                                                                  [100%]
7 passed in 0.53s
[OK]    catalogo-service (pytest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
