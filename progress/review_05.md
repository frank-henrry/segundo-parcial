# Review — SPEC-05 ordenes-core

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — `services/ordenes-service/` opera exclusivamente contra `db-ordenes` (`postgres://ordenes_user:ordenes_local_password@localhost:5434/ordenes` en `src/core/config.js:3`); sin referencias a `db-catalogo`, puerto `5433`, `catalogo_user` ni tablas de catálogo.
- [x] PRY-R02 — Separación limpia por capas en `src/app.js`, `src/server.js` y `src/core/{config,db,errors,catalogoClient}.js`.
- [x] PRY-R03 — `GET /health` y `GET /api/ordenes/health` (`src/app.js:12-33`) ejecutan `db.checkDb()` (`SELECT 1 AS ok`) y responden `200` (`db: "up"`) o `503` (`db: "down"`).
- [x] PRY-R04 — `db/init.sql:6,16-17` define `total`, `precio_unitario` y `subtotal` como `NUMERIC(12, 2)` con restricciones `CHECK (... >= 0)`; `package.json:17` incluye `decimal.js`; sin `float`/`parseFloat`/`Number(` sobre dinero.
- [x] PRY-R05 — `src/core/db.js:27-57` ejecuta consultas parametrizadas (`query(text, params = [])`, `enTransaccion(fn)`); sin concatenación ni interpolación insegura en SQL; pruebas en `tests/ordenes-core/core.test.js:53-70` usan parámetros `$1..$4`.
- [x] PRY-R06 — `src/core/config.js:11-24` lee `DATABASE_URL`, `PORT` y `CATALOGO_URL` desde `process.env` sin depender de `.env` ni `dotenv`; no existe `.env` en `services/ordenes-service/` ni en la raíz, y `.gitignore:2` lo excluye.
- [x] PRY-R07 — `src/core/errors.js:3-68` implementa `ErrorApp`, `construirError`, `manejar`, `manejadorNoEncontrado` (`404 NO_ENCONTRADO`) y `manejadorErrores` con el formato único `{ "error": { "codigo": "CODIGO_UPPER", "mensaje": "..." } }` para `ErrorApp`, `ZodError` (`422 VALIDACION_ERROR`), JSON inválido (`400 JSON_INVALIDO`) y errores inesperados (`500 ERROR_INTERNO`).
- [x] PRY-R08 — Specs intactas y conformes (`init.sh`: `<= 150` líneas, 6 secciones, 16 archivos).
- [x] ORDC-R01 — `src/core/` es genérico y no accede a `db-catalogo`; toda comunicación externa pasa por `src/core/catalogoClient.js:9-45` usando `config.catalogoUrl`.
- [x] ORDC-R02 — `GET /health` y `GET /api/ordenes/health` (`src/app.js:32-33`) verifican `SELECT 1 AS ok` en `db-ordenes` (`src/core/db.js:50-57`) devolviendo `200` o `503`.
- [x] ORDC-R03 — `src/core/catalogoClient.js:22-43` propaga respuestas `404`/`409` como `ErrorApp` con su código HTTP y transforma timeouts (`5000 ms`), `5xx` y errores de red en `ErrorApp('CATALOGO_NO_DISPONIBLE', ..., 502)`.

## Casos de prueba
- [x] ORDC-T01 — `services/ordenes-service/tests/ordenes-core/core.test.js:34-149`: verifica `200` en `/health` y `/api/ordenes/health`, transacciones reales (`COMMIT` y `ROLLBACK`) en `db-ordenes`, formato `PRY-R07` (`404`, `ErrorApp`, `ZodError`, JSON inválido, `500`) y `503` con BD caída más restauración del pool.
- [x] ORDC-T02 — `services/ordenes-service/tests/ordenes-core/core.test.js:151-243`: verifica `catalogoClient.reservarStock` con `nock` para `200`, `409` (`STOCK_INSUFICIENTE`), `404` (`PRODUCTO_NO_ENCONTRADO`), `422` (`VALIDACION_ERROR`), `500` (`502 CATALOGO_NO_DISPONIBLE`) y error de red `ECONNREFUSED` (`502 CATALOGO_NO_DISPONIBLE`).

## Checkpoints
- C1: [x]  C2: [x]  C3: [x]  C4: [x]  C5: [x]

## Salida de `bash init.sh`

Ejecutado tras marcar la feature `5` (`ordenes-core`) como `done` en `feature_list.json`:

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
[OK]    feature_list.json válido (12 features: pending=6 in_progress=0 done=6 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    SPEC-03: todos sus casos tienen prueba
[OK]    SPEC-04: todos sus casos tienen prueba
[OK]    SPEC-05: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (94 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
...........                                                              [100%]
11 passed in 0.92s
[OK]    catalogo-service (pytest) en verde
PASS tests/ordenes-core/core.test.js
  SPEC-05 ordenes-service / core
    √ ORDC-T01 GET /health responde 200 con status ok, service ordenes-service y db up (112 ms)
    √ ORDC-T02 catalogoClient.reservarStock maneja 200, 409 y error de red 502 con nock (245 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
Snapshots:   0 total
Time:        2.645 s
Ran all test suites.
[OK]    ordenes-service en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
