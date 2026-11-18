# Informe de Implementación — SPEC-03 (`catalogo-productos-crud`)

- **Feature:** `3 — catalogo-productos-crud` (`prefijo: CATP`)
- **Spec:** `services/catalogo-service/specs/productos/01-productos-crud.md`
- **Agente:** `desarrolladorback`
- **Estado dejado:** `in_progress` (pendiente de pruebas `CATP-T01` a `CATP-T05` por `tester` y revisión por `revisor`)

## 1. Archivos creados y modificados (todos del §2)

- `[NUEVO]` `services/catalogo-service/app/modules/__init__.py` — paquete de módulos de dominio de `catalogo-service`.
- `[NUEVO]` `services/catalogo-service/app/modules/productos/__init__.py` — paquete del módulo `productos` que expone `router`.
- `[NUEVO]` `services/catalogo-service/app/modules/productos/schemas.py` — esquemas Pydantic v2 `ProductoCreate`, `ProductoOut` y `ProductoListOut` con validación numérica `Decimal` y serialización de `precio` como string con 2 decimales.
- `[NUEVO]` `services/catalogo-service/app/modules/productos/repository.py` — repositorio SQL parametrizado (`%s`) sobre `db-catalogo` (`listar_productos`, `obtener_producto_por_id`, `crear_producto`).
- `[NUEVO]` `services/catalogo-service/app/modules/productos/router.py` — router FastAPI bajo `/productos` con `GET /productos`, `GET /productos/{producto_id}` y `POST /productos`.
- `[MODIFICAR]` `services/catalogo-service/app/main.py` — monta `productos.router` bajo `/api/catalogo`.

## 2. Cumplimiento de reglas (`CATP-R01` .. `CATP-R04` y `PRY-R01` .. `PRY-R07`)

- **CATP-R01 (`sku` único -> `409 SKU_DUPLICADO`):** `crear_producto` en `repository.py` captura `psycopg.errors.UniqueViolation` al insertar en `productos` y lanza `ErrorApp(codigo="SKU_DUPLICADO", ..., status_code=409)` serializado según PRY-R07.
- **CATP-R02 (`precio > 0` y `stock >= 0` -> `422 VALIDACION_ERROR`):** `ProductoCreate` en `schemas.py` exige `precio > 0` (con cuantización a 2 decimales para evitar redondeo a `0.00`), `stock >= 0` (rechazando booleanos y negativos) y cadenas no vacías tras `strip()`. El handler de `RequestValidationError` en `app/core/errors.py` devuelve `422` con código `VALIDACION_ERROR`.
- **CATP-R03 (listado con filtros):** `listar_productos` filtra `activo = TRUE` por defecto (`activo: bool = True`), aplica `categoria = %s` exacto cuando `categoria` tiene contenido no vacío, y aplica `nombre ILIKE %s` cuando `q` tiene contenido no vacío, ordenado por `id ASC`.
- **CATP-R04 (`precio` string con 2 decimales / PRY-R04):** `ProductoCreate` opera con `decimal.Decimal` (nunca `float` para cálculos/almacenamiento) y `ProductoOut` formatea `precio` como string exacto de 2 decimales (ej. `"29.90"`).
- **PRY-R01 y PRY-R05:** Toda consulta usa exclusivamente `app/core/db.py` (`db-catalogo`) y marcadores `%s` de `psycopg`.
- **Contrato §5 (`01-proyecto-contratos.md`):**
  - `GET /api/catalogo/productos?categoria=&q=` → `200 { "items": [...], "total": int }`
  - `GET /api/catalogo/productos/{id}` → `200 ProductoOut` o `404 PRODUCTO_NO_ENCONTRADO`
  - `POST /api/catalogo/productos` → `201 ProductoOut`

## 3. Decisiones técnicas

- Se mantuvo `activo: bool = Query(default=True)` en `GET /api/catalogo/productos` para cumplir el filtrado por defecto `activo = TRUE` (CATP-R03) sin romper consultas `?categoria=&q=` con parámetros vacíos (las cadenas vacías o de solo espacios se ignoran al armar los filtros).
- Se usó `@router.get("")` y `@router.post("")` en `APIRouter(prefix="/productos")` para evitar redirecciones `307` por barra final al consumir `/api/catalogo/productos`.
- Se llamó explícitamente `conn.commit()` tras el `INSERT ... RETURNING` para asegurar persistencia tanto con `ConnectionPool` como con conexión directa en `psycopg` v3.

## 4. Verificación ejecutada

- `python -m py_compile` sobre los 6 archivos Python creados/modificados: **OK (exit 0)**.
- Import `from app.main import app` e inspección de rutas: montadas `/api/catalogo/productos` (`GET`, `POST`) y `/api/catalogo/productos/{producto_id}` (`GET`).
- Smoke check con `TestClient` contra `db-catalogo`: `GET /api/catalogo/productos` (200, 4 semillas, `precio` string), filtros `?categoria=Periféricos&q=teclado` y `?categoria=&q=`, `GET .../999999` (404 `PRODUCTO_NO_ENCONTRADO`), `POST` válido (201, `"19.90"`), `POST` SKU duplicado (409 `SKU_DUPLICADO`), `POST` con `precio=0` y `stock=-1` (422 `VALIDACION_ERROR`), con limpieza del registro temporal (`SMOKE_OK`).
- `"C:\Program Files\Git\bin\bash.exe" init.sh --rapido`:

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
[OK]    Alcance de archivos correcto (75 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
2 passed in 0.19s
[OK]    catalogo-service (pytest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
