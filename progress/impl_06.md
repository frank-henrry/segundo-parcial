# Informe de implementación — SPEC-06 (`ordenes-crear`)

- **Feature:** `6 — ordenes-crear` (`services/ordenes-service/specs/ordenes/01-crear-orden.md`)
- **Agente:** `desarrolladorback`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de `tester` y `revisor`)

## 1. Archivos creados y modificados (alcance §2 de `services/ordenes-service/specs/ordenes/01-crear-orden.md`)

1. `[NUEVO]` `services/ordenes-service/src/modules/ordenes/schemas.js`
   - Define `itemOrdenSchema` (`productoId` entero `>= 1`, `cantidad` entero `>= 1`) y `crearOrdenSchema` (`clienteNombre` texto no vacío con `trim()`, `clienteEmail` válido, `items` arreglo no vacío con mínimo 1 elemento) usando `zod`.
2. `[NUEVO]` `services/ordenes-service/src/modules/ordenes/repository.js`
   - Implementa `insertarOrdenConItems(...)` usando `db.enTransaccion` con consultas SQL parametrizadas `$1, $2` (`INSERT INTO ordenes ... RETURNING ...` e `INSERT INTO orden_items ... RETURNING ...`).
   - Serializa `total`, `precioUnitario` y `subtotal` con `decimal.js` como strings de 2 decimales (`"0.40"`) y devuelve `OrdenConItems` (`id`, `clienteNombre`, `clienteEmail`, `estado`, `total`, `items`, `createdAt`).
3. `[NUEVO]` `services/ordenes-service/src/modules/ordenes/service.js`
   - Implementa `crearOrden(datos)`: valida primero con `crearOrdenSchema.parse`, reserva cada ítem vía `catalogoClient.reservarStock(item.productoId, item.cantidad)`, valida el precio recibido del catálogo (`parsearPrecioCatalogo`), calcula `subtotal` y `total` con `Decimal` (`decimal.js`, `ROUND_HALF_UP`) y solo entonces llama a `repository.insertarOrdenConItems`.
4. `[NUEVO]` `services/ordenes-service/src/modules/ordenes/routes.js`
   - Define el router Express con `POST /` envuelto en `manejar(...)`, invocando `service.crearOrden(req.body)` y respondiendo `201` con `OrdenConItems`.
5. `[MODIFICAR]` `services/ordenes-service/src/app.js`
   - Importa `./modules/ordenes/routes` y lo monta bajo `/api/ordenes` después de `GET /api/ordenes/health` y antes de `manejadorNoEncontrado` y `manejadorErrores`.

## 2. Cumplimiento de reglas (`ORDN-R01..R03`, `PRY-R01..R08`)

- **ORDN-R01 (Validación de entrada):** `crearOrdenSchema` exige `clienteNombre` no vacío, `clienteEmail` válido, `items` con al menos 1 ítem, y `productoId`/`cantidad` enteros `>= 1`. Al fallar antes de invocar `catalogoClient`, `manejadorErrores` responde `422` con `{ error: { codigo: 'VALIDACION_ERROR', mensaje } }` (`PRY-R07`).
- **ORDN-R02 / PRY-R04 (Dinero con `Decimal`):** `precioUnitario`, `subtotal` y `total` se calculan únicamente en servidor usando `decimal.js` a partir del `precio` devuelto por `catalogo-service` y se serializan como strings de 2 decimales.
- **ORDN-R03 (Sin filas ante fallo previo):** Las reservas HTTP en `catalogoClient` se completan antes de abrir la transacción en `db-ordenes`; si catálogo devuelve `404`, `409` o falla/timeout (`502 CATALOGO_NO_DISPONIBLE`), nunca se inserta en `ordenes` ni `orden_items`.
- **PRY-R01 / PRY-R05:** `ordenes-service` solo persiste en `db-ordenes` mediante placeholders `$1, $2` en `pg` y consume `catalogo-service` vía HTTP en `catalogoClient`.

## 3. Decisiones técnicas

- La validación con `crearOrdenSchema.parse(datos ?? {})` se ejecuta dentro de `service.crearOrden` para garantizar el rechazo temprano (`422 VALIDACION_ERROR`) tanto por HTTP como en invocaciones directas al servicio.
- `parsearPrecioCatalogo` rechaza precios nulos, booleanos, no finitos o negativos con `ErrorApp('RESPUESTA_CATALOGO_INVALIDA', ..., 502)`.

## 4. Verificaciones ejecutadas

### Carga de `src/app.js` y prueba de humo con `db-ordenes` + `nock`

```text
APP_LOAD_OK function
SMOKE_201: 201 0.40 CREADA 2 0.20 0.20 true
SMOKE_422: 422 VALIDACION_ERROR nockPending: false
SMOKE_409: 409 STOCK_INSUFICIENTE ordenesCount: 1
SMOKE_502: 502 CATALOGO_NO_DISPONIBLE ordenesCount: 1
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
[OK]    feature_list.json válido (12 features: pending=5 in_progress=1 done=6 blocked=0 reabierta=0)
[OK]    SPEC-00..06: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (99 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 1.00s
[OK]    catalogo-service (pytest) en verde
2 passed (tests/ordenes-core/core.test.js)
[OK]    ordenes-service en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
