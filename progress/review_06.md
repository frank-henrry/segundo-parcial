# Review — SPEC-06 ordenes-crear

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — `services/ordenes-service/src/modules/ordenes/` y `services/ordenes-service/src/app.js` operan exclusivamente sobre `db-ordenes` (`src/modules/ordenes/repository.js:4,42-77`) y consumen `catalogo-service` únicamente vía HTTP a través de `catalogoClient.reservarStock` (`src/modules/ordenes/service.js:4,39`); sin referencias a `db-catalogo`, puerto `5433` ni tablas de catálogo.
- [x] PRY-R02 — Capas limpias: `routes.js:9-15` → `service.js:32-67` → `repository.js:35-78` y `core/catalogoClient.js:9-45`; montado en `src/app.js:11,35` antes de `manejadorNoEncontrado` y `manejadorErrores` (`src/app.js:37-38`).
- [x] PRY-R03 — `GET /health` y `GET /api/ordenes/health` (`src/app.js:33-34`) siguen intactos y verificando `db.checkDb()`.
- [x] PRY-R04 — Dinero con `decimal.js` (`Decimal` con `ROUND_HALF_UP`) en `src/modules/ordenes/service.js:3,18-22,36-45,55-56,64` y `src/modules/ordenes/repository.js:3,6-8,16-17,27,47,69-70`; columnas `NUMERIC(12, 2)` en `db/init.sql:6,16-17`; JSON serializa strings con 2 decimales (`"40.20"`, `"19.95"`, `"39.90"`, `"0.10"`, `"0.30"`); cero usos de `float`, `Number(` o `parseFloat` en `services/ordenes-service/src/`.
- [x] PRY-R05 — SQL 100 % parametrizado en `src/modules/ordenes/repository.js:43-48` (`$1..$4`) y `src/modules/ordenes/repository.js:53-72` (`$1..$6`) dentro de `db.enTransaccion`; sin concatenación ni interpolación en queries SQL.
- [x] PRY-R06 — Sin `.env`, credenciales ni URLs privadas hardcodeadas en el módulo.
- [x] PRY-R07 — Errores emitidos con formato `{ "error": { "codigo": "...", "mensaje": "..." } }` vía `manejadorErrores` (`src/core/errors.js:40-68`): `422 VALIDACION_ERROR`, `404`/`409` propagados desde `catalogoClient`, `502 CATALOGO_NO_DISPONIBLE` y `502 RESPUESTA_CATALOGO_INVALIDA`.
- [x] PRY-R08 — Specs intactas y conformes (`init.sh`: `<= 150` líneas, 6 secciones, 16 archivos).
- [x] ORDN-R01 — `src/modules/ordenes/schemas.js:5-47` valida `items` no vacío (`min(1)`), `productoId` entero `>= 1`, `cantidad` entero `>= 1`, `clienteNombre` texto no vacío (`trim().min(1)`) y `clienteEmail` válido (`email()`); `service.js:33` ejecuta `crearOrdenSchema.parse(datos ?? {})` antes de llamar a `catalogoClient`, devolviendo `422 VALIDACION_ERROR`.
- [x] ORDN-R02 — `src/modules/ordenes/service.js:40-57,64` calcula `precioUnitario`, `subtotal` y `total` exclusivamente en servidor con `Decimal` usando el precio devuelto por `catalogo-service` (`parsearPrecioCatalogo`).
- [x] ORDN-R03 — `src/modules/ordenes/service.js:38-66` ejecuta todas las reservas HTTP en `catalogoClient.reservarStock` antes de invocar `repository.insertarOrdenConItems`; ante cualquier error (`404`, `409`, `502`), no se inserta ninguna fila en `ordenes` ni `orden_items`.
- [x] Contrato §5 — `POST /api/ordenes` (`src/app.js:35` + `src/modules/ordenes/routes.js:9-15`) acepta `{ clienteNombre, clienteEmail, items: [{ productoId, cantidad }] }` y retorna `201` con `OrdenConItems` (`id, clienteNombre, clienteEmail, estado, total, items, createdAt`).

## Casos de prueba
- [x] ORDN-T01 — `services/ordenes-service/tests/ordenes-crear/crear.test.js:33-143`: verifica `POST /api/ordenes` válido con `nock`, cálculo exacto `Decimal` (`19.95*2 + 0.10*3 = "40.20"`), respuesta `201` y persistencia real en `ordenes` y `orden_items` en `db-ordenes`.
- [x] ORDN-T02 — `services/ordenes-service/tests/ordenes-crear/crear.test.js:145-193`: verifica `422 VALIDACION_ERROR` para `items: []`, `cantidad: 0`, `cantidad: -3` y `clienteEmail` inválido sin llamadas a `catalogo-service` ni inserciones en `db-ordenes`.
- [x] ORDN-T03 — `services/ordenes-service/tests/ordenes-crear/crear.test.js:195-240`: verifica `409 STOCK_INSUFICIENTE` cuando el segundo ítem falla en catálogo tras reservar el primero, con `0` filas en `ordenes` y `orden_items`.
- [x] ORDN-T04 — `services/ordenes-service/tests/ordenes-crear/crear.test.js:242-304`: verifica `502 CATALOGO_NO_DISPONIBLE` ante `ECONNREFUSED`, HTTP `500` y timeout (`5500ms > 5000ms`), con `0` filas en `db-ordenes`.

## Checkpoints
- C1: [x]  C2: [x]  C3: [x]  C4: [x]  C5: [x]

## Salida de `bash init.sh`

Ejecutado tras marcar la feature `6` (`ordenes-crear`) como `done` en `feature_list.json`:

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
[OK]    feature_list.json válido (12 features: pending=5 in_progress=0 done=7 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    SPEC-03: todos sus casos tienen prueba
[OK]    SPEC-04: todos sus casos tienen prueba
[OK]    SPEC-05: todos sus casos tienen prueba
[OK]    SPEC-06: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (101 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
...........                                                              [100%]
11 passed in 1.06s
[OK]    catalogo-service (pytest) en verde
PASS tests/ordenes-crear/crear.test.js
  SPEC-06 ordenes-service / ordenes (Crear orden)
    √ ORDN-T01 POST /api/ordenes válido reserva stock vía nock, calcula total con Decimal y retorna 201 (99 ms)
    √ ORDN-T02 POST /api/ordenes con items vacío o cantidad <= 0 retorna 422 sin llamar a catálogo (38 ms)
    √ ORDN-T03 POST /api/ordenes cuando catálogo responde 409 retorna 409 y no inserta en db-ordenes (60 ms)
    √ ORDN-T04 POST /api/ordenes cuando catálogo falla/timeout retorna 502 CATALOGO_NO_DISPONIBLE (54 ms)

PASS tests/ordenes-core/core.test.js
  SPEC-05 ordenes-service / core
    √ ORDC-T01 GET /health responde 200 con status ok, service ordenes-service y db up (63 ms)
    √ ORDC-T02 catalogoClient.reservarStock maneja 200, 409 y error de red 502 con nock (117 ms)

Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        2.383 s, estimated 3 s
Ran all test suites.
[OK]    ordenes-service en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
