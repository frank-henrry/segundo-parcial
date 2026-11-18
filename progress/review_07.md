# Review — SPEC-07 ordenes-consultar

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — `services/ordenes-service/src/modules/ordenes/repository.js` opera exclusivamente sobre `db-ordenes` (`ordenes`, `orden_items`); cero referencias a `db-catalogo` o tablas de catálogo.
- [x] PRY-R02 — Capas limpias respetadas: `routes.js` → `service.js` → `repository.js`.
- [x] PRY-R03 — `GET /health` y `GET /api/ordenes/health` preservados en `services/ordenes-service/src/app.js:33-34`.
- [x] PRY-R04 — Montos (`total`, `precioUnitario`, `subtotal`) formateados con `decimal.js` (`formatearDinero` en `repository.js:6-8`) a string con 2 decimales; `Number(...)` en `schemas.js:10` aplica únicamente al ID entero positivo.
- [x] PRY-R05 — Todas las consultas SQL en `repository.js:92-135` (`listarOrdenes`, `obtenerOrdenConItems`, `actualizarEstado`) están parametrizadas con `$1`, `$2` en `pg`.
- [x] PRY-R06 — Cero credenciales AWS o secretos versionados en los archivos auditados.
- [x] PRY-R07 — Errores devueltos con el formato `{ "error": { "codigo": "...", "mensaje": "..." } }` vía `ErrorApp`, `ZodError` (`422 VALIDACION_ERROR`) y `manejadorErrores` (`src/core/errors.js:40-68`).
- [x] PRY-R08 — Specs intactas (`.harness/specs.sha256` validado por `init.sh`).
- [x] Contrato §5 (`specs-v2/01-proyecto-contratos.md §5`) — `GET /api/ordenes` (`200 { items, total }`), `GET /api/ordenes/{id}` (`200 OrdenConItems`) y `PATCH /api/ordenes/{id}/estado` (`200 Orden`) alineados exactamente con el contrato y el §2 de la spec.
- [x] ORDQ-R01 — `repository.js:92-99` consulta `ORDER BY created_at DESC, id DESC` y serializa `total` como string de 2 decimales.
- [x] ORDQ-R02 — `service.js:81-92` y `routes.js:17-23` devuelven `404 ORDEN_NO_ENCONTRADA` cuando la orden no existe en `db-ordenes` (y `/:id(\d+)` preserva `404 NO_ENCONTRADO` para rutas no numéricas).
- [x] ORDQ-R03 — `schemas.js:5,68-74` restringe `estado` a `['CREADA', 'PAGADA', 'ENVIADA', 'CANCELADA']`; cualquier otro valor o ausencia produce `422 VALIDACION_ERROR` (`service.js:94-106`, `errors.js:45-57`).

## Casos de prueba
- [x] ORDQ-T01 — `GET /api/ordenes` lista vacío y 3 órdenes ordenadas por `created_at DESC, id DESC` contra PostgreSQL real (`db-ordenes`), verificado en `services/ordenes-service/tests/ordenes-consultar/consultar.test.js:77-144`.
- [x] ORDQ-T02 — `GET /api/ordenes/{id}` retorna `200 OrdenConItems` con `items` ordenados y `404 ORDEN_NO_ENCONTRADA` si no existe, verificado en `services/ordenes-service/tests/ordenes-consultar/consultar.test.js:146-210`.
- [x] ORDQ-T03 — `PATCH /api/ordenes/{id}/estado` actualiza los 4 estados válidos verificando persistencia en `db-ordenes`, rechaza estado inválido/ausente con `422 VALIDACION_ERROR` sin mutar BD y retorna `404 ORDEN_NO_ENCONTRADA` si no existe, verificado en `services/ordenes-service/tests/ordenes-consultar/consultar.test.js:212-278`.

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
[OK]    feature_list.json válido (12 features: pending=4 in_progress=0 done=8 blocked=0 reabierta=0)
[OK]    SPEC-00..07: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (104 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 0.94s
[OK]    catalogo-service (pytest) en verde
Test Suites: 3 passed, 3 total
Tests:       9 passed, 9 total
[OK]    ordenes-service en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
