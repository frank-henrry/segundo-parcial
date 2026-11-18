# Informe de implementación — SPEC-05 (`ordenes-core`)

- **Feature:** `5 — ordenes-core` (`services/ordenes-service/specs/core/01-ordenes-core.md`)
- **Agente:** `desarrolladorback`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de `tester` y `revisor`)

## 1. Archivos creados (alcance §2 de `services/ordenes-service/specs/core/01-ordenes-core.md`)

1. `services/ordenes-service/package.json`
   - Dependencias: `express`, `pg`, `decimal.js`, `axios`, `zod`.
   - Dependencias de desarrollo: `jest`, `supertest`, `nock`.
   - Scripts: `start` (`node src/server.js`), `test`, `test:unit`, `test:integration` (configurados con `--runInBand --passWithNoTests` mientras el agente `tester` crea la suite).
   - Se generó `services/ordenes-service/package-lock.json` vía `npm install` (permitido por `.harness/alcance.js`).
2. `services/ordenes-service/jest.config.js`
   - Configuración Jest para CommonJS (`testEnvironment: 'node'`, `testMatch: ['**/tests/**/*.test.js']`, `clearMocks: true`).
3. `services/ordenes-service/db/init.sql`
   - Script SQL idempotente con `CREATE TABLE IF NOT EXISTS ordenes` (`id`, `cliente_nombre`, `cliente_email`, `estado`, `total NUMERIC(12, 2)`, `created_at`) y `CREATE TABLE IF NOT EXISTS orden_items` (`id`, `orden_id` FK con `ON DELETE CASCADE`, `producto_id`, `nombre_producto`, `cantidad`, `precio_unitario NUMERIC(12, 2)`, `subtotal NUMERIC(12, 2)`), más índices `IF NOT EXISTS`.
4. `services/ordenes-service/src/core/config.js`
   - Lee `process.env.DATABASE_URL` (default local `postgres://ordenes_user:ordenes_local_password@localhost:5434/ordenes`), `PORT` (default `3001`) y `CATALOGO_URL` (default `http://localhost:8001`), sin depender de archivo `.env`.
5. `services/ordenes-service/src/core/db.js`
   - Administra `pg.Pool` de forma perezosa y segura (`getPool()`, `query(text, params)`), provee `enTransaccion(fn)` (`BEGIN`/`COMMIT`/`ROLLBACK` garantizado en `finally client.release()`), `checkDb()` (`SELECT 1 AS ok`) y `cerrarPool()`.
6. `services/ordenes-service/src/core/errors.js`
   - Define `ErrorApp` (soporta firma `(codigo, mensaje, statusCode)` y `(codigo, statusCode)`), `construirError(codigo, mensaje)`, `manejar(fn)`, `manejadorNoEncontrado` (404 `NO_ENCONTRADO`) y `manejadorErrores` con formato único `PRY-R07` (`{ "error": { "codigo": "CODIGO_UPPER", "mensaje": "..." } }`), incluyendo manejo para `ZodError` (`422 VALIDACION_ERROR`), JSON malformado (`400 JSON_INVALIDO`) y errores inesperados (`500 ERROR_INTERNO`).
7. `services/ordenes-service/src/core/catalogoClient.js`
   - Implementa `reservarStock(productoId, cantidad)` mediante `axios.post` hacia `${config.catalogoUrl}/api/catalogo/productos/${productoId}/reservar` con timeout de 5000 ms.
   - Propaga respuestas `404` y `409` como `ErrorApp` preservando `codigo` y `mensaje` del catálogo (o defaults `PRODUCTO_NO_ENCONTRADO` / `STOCK_INSUFICIENTE`), y convierte timeouts, respuestas `5xx` o errores de red en `ErrorApp('CATALOGO_NO_DISPONIBLE', 'El servicio de catálogo no está disponible', 502)`.
8. `services/ordenes-service/src/app.js`
   - Configura Express (`express.json()`), expone `GET /health` y `GET /api/ordenes/health` verificando `db.checkDb()`, y registra `manejadorNoEncontrado` y `manejadorErrores`.
9. `services/ordenes-service/src/server.js`
   - Inicia el servidor HTTP en `config.port` y gestiona apagado limpio (`SIGINT`/`SIGTERM` cerrando servidor HTTP y `db.cerrarPool()`).
10. `services/ordenes-service/tests/setup.js`
    - Utilidades de prueba para aplicar `db/init.sql` (`aplicarEsquema()`), truncar tablas (`limpiarTablas()` / `prepararDb()`) y cerrar el pool (`cerrarPool()`). No se crearon archivos `*.test.js` (responsabilidad de `tester`).

## 2. Cumplimiento de reglas (`ORDC-R01..R03`, `PRY-R01..R08`)

- **ORDC-R01 (Aislamiento en `src/core/`):** `src/core/` es genérico y conecta únicamente a `db-ordenes` (`localhost:5434/ordenes`); toda llamada a `catalogo-service` pasa por `catalogoClient.js` usando `config.catalogoUrl`.
- **ORDC-R02 (`/health` y `/api/ordenes/health`):** Ambos endpoints ejecutan `db.checkDb()` (`SELECT 1 AS ok`) y devuelven `200` `{ status: 'ok', service: 'ordenes-service', db: 'up' }` o `503` `{ status: 'error', service: 'ordenes-service', db: 'down' }` (`PRY-R03`).
- **ORDC-R03 (Manejo de errores en `catalogoClient`):** `404`/`409` se propagan como `ErrorApp` con su código HTTP original; timeout, `5xx` y errores de red lanzan `ErrorApp` con código `'CATALOGO_NO_DISPONIBLE'` y status `502`.
- **PRY-R04 / PRY-R05 / PRY-R06 / PRY-R07:** Columnas monetarias `NUMERIC(12, 2)` en `db/init.sql`, SQL parametrizado en `db.js`, variables leídas exclusivamente desde `process.env` en `src/core/config.js` sin `.env`, y formato único de error `{ error: { codigo, mensaje } }` en `src/core/errors.js`.

## 3. Decisiones técnicas

- Se implementaron getters dinámicos en `src/core/config.js` y recreación controlada del pool en `src/core/db.js` cuando cambia `config.databaseUrl`, lo que permite que las pruebas cambien `DATABASE_URL` o `CATALOGO_URL` en tiempo de ejecución sin reiniciar el proceso.
- En `ErrorApp`, el constructor soporta tanto `new ErrorApp(codigo, mensaje, statusCode)` como la forma abreviada `new ErrorApp(codigo, statusCode)` citada en `SPEC-05`.

## 4. Verificaciones ejecutadas

### Instalación de dependencias y carga de `src/app.js`

```text
cd services/ordenes-service && npm install -> exit 0 (added 386 packages)
node -e "const app = require('./src/app'); console.log('APP_LOAD_OK', typeof app);" -> APP_LOAD_OK function
```

### Verificación de humo (sin archivos de prueba adicionales)

```text
HEALTH: 200 {"status":"ok","service":"ordenes-service","db":"up"}
API_HEALTH: 200 {"status":"ok","service":"ordenes-service","db":"up"}
404_PRY_R07: 404 {"error":{"codigo":"NO_ENCONTRADO","mensaje":"Ruta no encontrada"}}
NOCK_200: {"id":1,"precio":"29.90","stock":8}
NOCK_409: true 409 STOCK_INSUFICIENTE
NOCK_404: true 404 PRODUCTO_NO_ENCONTRADO
NOCK_502: true 502 CATALOGO_NO_DISPONIBLE
HEALTH_DOWN: 503 {"status":"error","service":"ordenes-service","db":"down"}
NOCK_5XX: true 502 CATALOGO_NO_DISPONIBLE
TX_COUNT: 1
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
[OK]    feature_list.json válido (12 features: pending=6 in_progress=1 done=5 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    SPEC-03: todos sus casos tienen prueba
[OK]    SPEC-04: todos sus casos tienen prueba
[OK]    SPEC-05: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (92 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 1.04s
[OK]    catalogo-service (pytest) en verde
No tests found, exiting with code 0
[OK]    ordenes-service en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
