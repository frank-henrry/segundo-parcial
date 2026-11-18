# Review — SPEC-02 catalogo-core

**Veredicto:** APROBADO

## Reglas
- [x] **PRY-R01** — `services/catalogo-service/` solo referencia `db-catalogo` (`localhost:5433`, `catalogo`), sin referencias a `db-ordenes`, `5434` ni tablas de órdenes.
- [x] **PRY-R02** — Capas limpias: `app/main.py` delega configuración, conexión y manejo de errores a `app/core/`.
- [x] **PRY-R03** — `GET /health` y `GET /api/catalogo/health` en `app/main.py:46-52` responden `200` `{ "status": "ok", "service": "catalogo-service", "db": "up" }` o `503` `{ "status": "error", "service": "catalogo-service", "db": "down" }`.
- [x] **PRY-R04** — `services/catalogo-service/db/init.sql:6` define `precio NUMERIC(12, 2) NOT NULL CHECK (precio > 0)`; sin uso de `float` en código.
- [x] **PRY-R05** — Sin concatenación ni interpolación SQL; `app/core/db.py:63` ejecuta consulta fija `SELECT 1 AS ok`.
- [x] **PRY-R06** — `app/core/config.py:22-30` lee `DATABASE_URL` y `PORT` desde `os.environ` sin depender de `.env` ni versionar credenciales reales/AWS.
- [x] **PRY-R07** — `app/core/errors.py:9-80` maneja `ErrorApp`, `RequestValidationError`, `StarletteHTTPException` y `Exception` con el formato `{"error": {"codigo": "...", "mensaje": "..."}}`.
- [x] **PRY-R08** — Specs intactas verificadas por `.harness/specs.sha256`.
- [x] **CATC-R01** — `app/core/` contiene únicamente `__init__.py`, `config.py`, `db.py` y `errors.py`, sin lógica de negocio ni conocimiento de módulos de dominio.
- [x] **CATC-R02** — `GET /health` y `GET /api/catalogo/health` verifican `db-catalogo` con `check_db()` (`200`/`503`).
- [x] **CATC-R03** — Todo error sale serializado bajo `PRY-R07` (incluyendo 404 en rutas inexistentes).

## Casos de prueba
- [x] `CATC-T01` (`services/catalogo-service/tests/catalogo-core/test_core.py:6-15`) — `test_catc_t01_health_ok` PASSED contra PostgreSQL real (`db-catalogo` en `localhost:5433`).
- [x] `CATC-T02` (`services/catalogo-service/tests/catalogo-core/test_core.py:18-39`) — `test_catc_t02_api_health_y_error_404` PASSED contra PostgreSQL real (`200` en `/api/catalogo/health` y `404` con `{"error": {"codigo": "NO_ENCONTRADO", "mensaje": "Not Found"}}`).

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
[OK]    feature_list.json válido (12 features: pending=9 in_progress=1 done=2 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (69 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
..                                                                       [100%]
2 passed in 0.16s
[OK]    catalogo-service (pytest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
