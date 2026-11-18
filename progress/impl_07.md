# Informe de implementación — SPEC-07 (`ordenes-consultar`)

- **Feature:** `7 — ordenes-consultar` (`services/ordenes-service/specs/ordenes/02-consultar-estado.md`)
- **Agente:** `desarrolladorback`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de `tester` y `revisor`)

## 1. Archivos modificados (alcance §2 de `services/ordenes-service/specs/ordenes/02-consultar-estado.md`)

1. `[MODIFICAR]` `services/ordenes-service/src/modules/ordenes/schemas.js`
   - Define `ESTADOS_ORDEN` (`['CREADA', 'PAGADA', 'ENVIADA', 'CANCELADA']`), `cambiarEstadoSchema` (`estado` validado con `z.enum(ESTADOS_ORDEN)` → `422 VALIDACION_ERROR`) y `ordenIdSchema` (entero positivo `>= 1` y `<= 2147483647`).
2. `[MODIFICAR]` `services/ordenes-service/src/modules/ordenes/repository.js`
   - Extrae `mapearOrden(ordenRow)` para reutilizar el mapeo de `Orden` (`id`, `clienteNombre`, `clienteEmail`, `estado`, `total` formateado con `decimal.js` a 2 decimales, `createdAt`) en `mapearOrdenConItems`, `listarOrdenes` y `actualizarEstado`.
   - Implementa `listarOrdenes()` con `SELECT ... FROM ordenes ORDER BY created_at DESC, id DESC`.
   - Implementa `obtenerOrdenConItems(id)` con consultas parametrizadas `$1` sobre `ordenes` y `orden_items` (`ORDER BY id ASC`), retornando `null` si no existe.
   - Implementa `actualizarEstado(id, estado)` con `UPDATE ordenes SET estado = $1 WHERE id = $2 RETURNING ...`, retornando `null` si no existe la fila.
3. `[MODIFICAR]` `services/ordenes-service/src/modules/ordenes/service.js`
   - Implementa `listar()` devolviendo `{ items, total }` según `specs-v2/01-proyecto-contratos.md §5`.
   - Implementa `obtenerPorId(id)` validando `id` con `ordenIdSchema` y lanzando `ErrorApp('ORDEN_NO_ENCONTRADA', ..., 404)` si no existe.
   - Implementa `cambiarEstado(id, datos)` validando `id` con `ordenIdSchema` y `datos` con `cambiarEstadoSchema`, y lanzando `ErrorApp('ORDEN_NO_ENCONTRADA', ..., 404)` si no existe.
4. `[MODIFICAR]` `services/ordenes-service/src/modules/ordenes/routes.js`
   - Agrega `GET /` → `200 { items, total }`, `GET /:id(\\d+)` → `200 OrdenConItems` y `PATCH /:id(\\d+)/estado` → `200 Orden` envueltos en `manejar(...)`.

## 2. Cumplimiento de reglas (`ORDQ-R01..R03`, `PRY-R01..R08`)

- **ORDQ-R01 (`GET /api/ordenes`):** `listarOrdenes()` ordena por `created_at DESC, id DESC` aprovechando `idx_ordenes_created_at_id` y serializa `total` con `formatearDinero` (`decimal.js`, 2 decimales). `service.listar()` retorna `{ items, total: items.length }`.
- **ORDQ-R02 (`GET /api/ordenes/{id}` 404):** `obtenerPorId(id)` y `cambiarEstado(id, datos)` lanzan `ErrorApp('ORDEN_NO_ENCONTRADA', ..., 404)` cuando el repositorio devuelve `null` (`PRY-R07`).
- **ORDQ-R03 (Validación de estado):** `cambiarEstadoSchema` restringe `estado` a `CREADA`, `PAGADA`, `ENVIADA`, `CANCELADA`; cualquier otro valor produce `ZodError` mapeado por `manejadorErrores` a `422 VALIDACION_ERROR`.
- **PRY-R01 / PRY-R05:** Todas las consultas operan exclusivamente sobre `db-ordenes` usando placeholders `$1, $2` en `pg`.

## 3. Decisiones técnicas

- Las rutas con parámetro numérico en `routes.js` usan `/:id(\\d+)` y `/:id(\\d+)/estado` para no interceptar rutas no numéricas inexistentes como `/api/ordenes/ruta-inexistente`, permitiendo que `manejadorNoEncontrado` responda `404 NO_ENCONTRADO` (verificado en `ORDC-T01`).
- `ordenIdSchema` acepta tanto número como string numérico de `req.params.id` y valida rango entero positivo de PostgreSQL (`1..2147483647`), evitando errores de sintaxis o desbordamiento en DB.

## 4. Verificaciones ejecutadas

### Carga de `src/app.js` y prueba de humo contra `db-ordenes`

```text
APP_LOAD_OK function
LIST: 200 2 [ [ 2, '30.50', 'CREADA' ], [ 1, '10.50', 'CREADA' ] ]
GET_OK: 200 1 1 10.50
GET_404: 404 ORDEN_NO_ENCONTRADA
PATCH_OK: 200 1 PAGADA 10.50
PATCH_422: 422 VALIDACION_ERROR
PATCH_404: 404 ORDEN_NO_ENCONTRADA
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
[OK]    feature_list.json válido (12 features: pending=4 in_progress=1 done=7 blocked=0 reabierta=0)
[OK]    SPEC-00..07: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (102 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 1.06s
[OK]    catalogo-service (pytest) en verde
6 passed (tests/ordenes-core/core.test.js, tests/ordenes-crear/crear.test.js)
[OK]    ordenes-service en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
