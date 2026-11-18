# Informe de implementación — SPEC-02 (`catalogo-core`)

- **Feature:** `2 — catalogo-core` (`services/catalogo-service/specs/core/01-catalogo-core.md`)
- **Agente:** `desarrolladorback`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de `tester` y `revisor`)

## 1. Archivos creados (alcance §2 de `services/catalogo-service/specs/core/01-catalogo-core.md`)

1. `services/catalogo-service/requirements.txt`
   - Dependencias: `fastapi`, `uvicorn`, `psycopg[binary,pool]` (v3), `pydantic` (v2), `pytest`, `httpx`.
2. `services/catalogo-service/db/init.sql`
   - Script idempotente con `CREATE TABLE IF NOT EXISTS productos` (`id SERIAL PRIMARY KEY`, `sku VARCHAR(40) UNIQUE NOT NULL`, `nombre VARCHAR(160) NOT NULL`, `categoria VARCHAR(80) NOT NULL`, `precio NUMERIC(12, 2) NOT NULL CHECK (precio > 0)`, `stock INTEGER NOT NULL CHECK (stock >= 0)`, `activo BOOLEAN NOT NULL DEFAULT TRUE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`).
   - Inserción de 4 productos semilla (`SKU-1001`..`SKU-1004`) con `ON CONFLICT (sku) DO NOTHING`.
3. `services/catalogo-service/app/__init__.py`
   - Inicialización del paquete `app`.
4. `services/catalogo-service/app/core/__init__.py`
   - Inicialización del paquete `app.core`.
5. `services/catalogo-service/app/core/config.py`
   - Lee `DATABASE_URL` y `PORT` desde `os.environ` vía `get_settings()`, con default local coherente con `docker-compose.yml` (`postgresql://catalogo_user:catalogo_local_password@localhost:5433/catalogo` y puerto `8001`).
6. `services/catalogo-service/app/core/db.py`
   - Administra `psycopg_pool.ConnectionPool` (`init_pool`, `close_pool`), provee `get_connection()` con `dict_row` y respaldo directo `psycopg.connect` si cambia el DSN o no hay pool abierto, y expone `check_db()` ejecutando `SELECT 1 AS ok`.
7. `services/catalogo-service/app/core/errors.py`
   - Define `ErrorApp(codigo, mensaje, status_code)` y `registrar_error_handlers(app)` para `ErrorApp`, `RequestValidationError` (`422 VALIDACION_ERROR`), `StarletteHTTPException` (incluyendo rutas 404 inexistentes con código `NO_ENCONTRADO`) y `Exception` (`500 ERROR_INTERNO`), siempre bajo el contrato `PRY-R07` (`{"error": {"codigo": ..., "mensaje": ...}}`).
8. `services/catalogo-service/app/main.py`
   - Implementa `create_app()` con `lifespan` (inicia y cierra el pool), registra handlers globales y expone `GET /health` y `GET /api/catalogo/health`, respondiendo `200` `{"status": "ok", "service": "catalogo-service", "db": "up"}` o `503` `{"status": "error", "service": "catalogo-service", "db": "down"}`.
9. `services/catalogo-service/tests/conftest.py`
   - Configura conexión exclusiva a `db-catalogo` (`DATABASE_URL` o default local en puerto `5433`), aplica `db/init.sql` al iniciar sesión de pruebas, trunca/resemilla `productos` antes de cada test y entrega el fixture `client` (`TestClient`). No se escribieron archivos `test_*.py` (responsabilidad de `tester`).

## 2. Cumplimiento de reglas (`CATC-R01..R03`, `PRY-R01..R08`)

- **CATC-R01 (Aislamiento en `app/core/`):** `app/core/` solo contiene `config.py`, `db.py` y `errors.py`, sin lógica de negocio ni referencias a módulos específicos.
- **CATC-R02 (`/health` y `/api/catalogo/health`):** Ambos endpoints ejecutan `check_db()` (`SELECT 1`) sobre `db-catalogo`, devolviendo `200` con `db: "up"` si responde o `503` con `db: "down"` si falla (`PRY-R03`).
- **CATC-R03 (Formato único de error `PRY-R07`):** `ErrorApp`, `RequestValidationError`, `StarletteHTTPException` (404/405/etc.) y `Exception` serializan `{"error": {"codigo": "CODIGO_UPPER", "mensaje": "..."}}`.
- **PRY-R01 / PRY-R05 / PRY-R06:** Conexión exclusiva a `db-catalogo`, consulta fija `SELECT 1 AS ok` sin concatenación SQL y lectura de configuración desde variables de entorno sin `.env`.

## 3. Decisiones técnicas

- Se incluyó handler para `StarletteHTTPException` además de `ErrorApp`, `RequestValidationError` y `Exception` para asegurar que rutas 404 inexistentes (`CATC-T02`) respondan con el formato JSON `PRY-R07` en lugar del `{"detail": "Not Found"}` por defecto de FastAPI.
- En `db.py`, `get_connection()` compara `_pool_dsn == dsn` y usa `pool.open(wait=False)` con `connect_timeout=3`, permitiendo que un fallo de BD o cambio de `DATABASE_URL` en pruebas retorne `503` sin bloquear el arranque de la aplicación.

## 4. Verificaciones ejecutadas

### Instalación de dependencias, `py_compile` e import

```text
python -m pip install -r services/catalogo-service/requirements.txt -> exit 0 (dependencias satisfechas)
python -m py_compile ... -> exit 0
python -c "from app.main import app; print('IMPORT_OK:', app.title)" -> IMPORT_OK: catalogo-service
```

### Verificación de humo (sin archivos de prueba adicionales)

```text
SEED_COUNT: 4
HEALTH: 200 {'status': 'ok', 'service': 'catalogo-service', 'db': 'up'}
API_HEALTH: 200 {'status': 'ok', 'service': 'catalogo-service', 'db': 'up'}
404: 404 {'error': {'codigo': 'NO_ENCONTRADO', 'mensaje': 'Not Found'}}
ERROR_APP: 409 {'error': {'codigo': 'STOCK_INSUFICIENTE', 'mensaje': 'No hay stock'}}
HEALTH_DOWN: 503 {'status': 'error', 'service': 'catalogo-service', 'db': 'down'}
```

### `"C:\Program Files\Git\bin\bash.exe" init.sh --rapido`

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
[OK]    feature_list.json válido (12 features: pending=9 in_progress=1 done=2 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (66 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
no tests ran in 0.02s
[FAIL]  catalogo-service (pytest) tiene fallos

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[FAIL]  Entorno NO está listo. Resuelve los errores antes de avanzar.
```

> Nota: `pytest -q` devuelve exit code `5` (`no tests ran`) porque `desarrolladorback` no crea archivos `test_*.py`; la suite de pruebas (`tests/catalogo-core/test_core.py`) corresponde al siguiente paso del agente `tester`.
