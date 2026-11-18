# Reporte de Pruebas — ecommerce-k8s

## SPEC-02

- **Spec:** `services/catalogo-service/specs/core/01-catalogo-core.md`
- **Feature:** `2 — catalogo-core` (`catalogo-service / core`)
- **Base de datos usada:** PostgreSQL real (`db-catalogo` en `localhost:5433`, sin mocks)
- **Estado:** `PASS` (`2 passed in 0.30s`)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `CATC-T01` | `test_catc_t01_health_ok` | `services/catalogo-service/tests/catalogo-core/test_core.py` | PASSED (`200`, `{"status": "ok", "service": "catalogo-service", "db": "up"}`) |
| `CATC-T02` | `test_catc_t02_api_health_y_error_404` | `services/catalogo-service/tests/catalogo-core/test_core.py` | PASSED (`200` en `/api/catalogo/health`; `404` con `{"error": {"codigo": "NO_ENCONTRADO", "mensaje": "Not Found"}}`) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comando:** `pytest -v --cov=app --cov-report=term-missing` (en `services/catalogo-service/`)
- **Resultado:** `2 passed in 0.30s`
- **Cobertura total del módulo `app`:** **85 %** (`115` sentencias, `17` sin cubrir)
  - `app/__init__.py`: `100 %` (`0/0`)
  - `app/core/__init__.py`: `100 %` (`0/0`)
  - `app/core/config.py`: `88 %` (`16` stmts, `2` miss: líneas `28-29`)
  - `app/core/db.py`: `87 %` (`39` stmts, `5` miss: líneas `21, 55-56, 65-66`)
  - `app/core/errors.py`: `72 %` (`32` stmts, `9` miss: líneas `13-16, 43, 52-57, 77`)
  - `app/main.py`: `96 %` (`28` stmts, `1` miss: línea `31`)

## SPEC-03

- **Spec:** `services/catalogo-service/specs/productos/01-productos-crud.md`
- **Feature:** `3 — catalogo-productos-crud` (`catalogo-service / productos`)
- **Base de datos usada:** PostgreSQL real (`db-catalogo` en `localhost:5433`, sin mocks)
- **Estado:** `PASS` (`7 passed in 0.87s`; `5/5` casos `CATP-T01..T05` en verde)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `CATP-T01` | `test_catp_t01_crear_producto_201` | `services/catalogo-service/tests/catalogo-productos-crud/test_crud.py` | PASSED (`201`, `precio: "19.90"` string 2 decimales, persistencia verificada en `db-catalogo` y `GET /{id}`) |
| `CATP-T02` | `test_catp_t02_sku_duplicado_409` | `services/catalogo-service/tests/catalogo-productos-crud/test_crud.py` | PASSED (`409`, `error.codigo == "SKU_DUPLICADO"`, conteo `1` en `db-catalogo`) |
| `CATP-T03` | `test_catp_t03_precio_o_stock_invalido_422` | `services/catalogo-service/tests/catalogo-productos-crud/test_crud.py` | PASSED (`422` con `precio=0` y `stock=-1`, `error.codigo == "VALIDACION_ERROR"`, `0` filas insertadas) |
| `CATP-T04` | `test_catp_t04_listar_filtra_categoria_y_q` | `services/catalogo-service/tests/catalogo-productos-crud/test_crud.py` | PASSED (`200`, filtra `activo=TRUE` por defecto, `?categoria=` exacto, `?q=` `ILIKE` y combinación) |
| `CATP-T05` | `test_catp_t05_detalle_inexistente_404` | `services/catalogo-service/tests/catalogo-productos-crud/test_crud.py` | PASSED (`404`, `error.codigo == "PRODUCTO_NO_ENCONTRADO"`) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comando:** `pytest -v --cov=app --cov-report=term-missing` (en `services/catalogo-service/`)
- **Resultado:** `7 passed in 0.87s`
- **Cobertura total del módulo `app`:** **91 %** (`225` sentencias, `21` sin cubrir)
- **Cobertura del módulo `app/modules/productos`:** **89 %** (`108` sentencias, `12` sin cubrir)
  - `app/modules/__init__.py`: `100 %` (`0/0`)
  - `app/modules/productos/__init__.py`: `100 %` (`2/2`)
  - `app/modules/productos/repository.py`: `97 %` (`35` stmts, `1` miss: línea `60`)
  - `app/modules/productos/router.py`: `100 %` (`20/20`)
  - `app/modules/productos/schemas.py`: `78 %` (`51` stmts, `11` miss: líneas `12, 14-16, 19, 23-24, 26, 45, 52, 60`)

## SPEC-04

- **Spec:** `services/catalogo-service/specs/productos/02-stock-reservas.md`
- **Feature:** `4 — catalogo-stock-reservas` (`catalogo-service / productos`)
- **Base de datos usada:** PostgreSQL real (`db-catalogo` en `localhost:5433`, sin mocks)
- **Estado:** `PASS` (`11 passed in 1.17s`; `4/4` casos `CATS-T01..T04` en verde)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `CATS-T01` | `test_cats_t01_actualizar_stock_200` | `services/catalogo-service/tests/catalogo-stock-reservas/test_stock.py` | PASSED (`200` con `stock=42` y `stock=0`, `422 VALIDACION_ERROR` con `stock=-1`, persistencia verificada en `db-catalogo`) |
| `CATS-T02` | `test_cats_t02_reservar_stock_atomico_200` | `services/catalogo-service/tests/catalogo-stock-reservas/test_stock.py` | PASSED (`200` descuento secuencial y atomicidad concurrente real `[200, 409]` sobre `db-catalogo`) |
| `CATS-T03` | `test_cats_t03_stock_insuficiente_409` | `services/catalogo-service/tests/catalogo-stock-reservas/test_stock.py` | PASSED (`409 STOCK_INSUFICIENTE`, `422 VALIDACION_ERROR` con `cantidad=0`, stock intacto en `db-catalogo`) |
| `CATS-T04` | `test_cats_t04_reservar_inexistente_404` | `services/catalogo-service/tests/catalogo-stock-reservas/test_stock.py` | PASSED (`404 PRODUCTO_NO_ENCONTRADO` en `POST .../reservar` y `PATCH .../stock`) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comando:** `pytest -v --cov=app --cov-report=term-missing` (en `services/catalogo-service/`)
- **Resultado:** `11 passed in 1.17s`
- **Cobertura total del módulo `app`:** **92 %** (`268` sentencias, `21` sin cubrir)
- **Cobertura del módulo `app/modules/productos`:** **92 %** (`151` sentencias, `12` sin cubrir)
  - `app/modules/__init__.py`: `100 %` (`0/0`)
  - `app/modules/productos/__init__.py`: `100 %` (`2/2`)
  - `app/modules/productos/repository.py`: `98 %` (`56` stmts, `1` miss: línea `60`)
  - `app/modules/productos/router.py`: `100 %` (`28/28`)
  - `app/modules/productos/schemas.py`: `83 %` (`65` stmts, `11` miss: líneas `12, 14-16, 19, 23-24, 26, 33, 52, 59`)

## SPEC-05

- **Spec:** `services/ordenes-service/specs/core/01-ordenes-core.md`
- **Feature:** `5 — ordenes-core` (`ordenes-service / core`)
- **Base de datos usada:** PostgreSQL real (`db-ordenes` en `localhost:5434`, sin mocks) + `nock` para `catalogo-service`
- **Estado:** `PASS` (`2 passed`, `2/2` casos `ORDC-T01..T02` en verde)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `ORDC-T01` | `ORDC-T01 GET /health responde 200 con status ok, service ordenes-service y db up` | `services/ordenes-service/tests/ordenes-core/core.test.js` | PASSED (`200` en `/health` y `/api/ordenes/health`, transacciones reales commit/rollback en `db-ordenes`, formato `PRY-R07` en `404`/`400`/`422`/`500` y `503` con BD caída) |
| `ORDC-T02` | `ORDC-T02 catalogoClient.reservarStock maneja 200, 409 y error de red 502 con nock` | `services/ordenes-service/tests/ordenes-core/core.test.js` | PASSED (`200` reserva retornada, `409` `STOCK_INSUFICIENTE`, `404` `PRODUCTO_NO_ENCONTRADO`, `422` `VALIDACION_ERROR`, `500` y error de red mapeados a `502` `CATALOGO_NO_DISPONIBLE` con `nock`) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comando:** `npx jest --runInBand --coverage --collectCoverageFrom="src/**/*.js" --collectCoverageFrom="!src/server.js"` (en `services/ordenes-service/`)
- **Resultado:** `1 test suite passed`, `2 passed, 2 total` (`1.98 s`)
- **Cobertura total del módulo `src` (excluyendo entrypoint `src/server.js`):** **94.59 %** sentencias / **94.59 %** líneas (`76.92 %` ramas, `89.47 %` funciones)
  - `src/app.js`: `100 %` sentencias (`100 %` líneas)
  - `src/core/catalogoClient.js`: `100 %` sentencias (`100 %` líneas)
  - `src/core/config.js`: `61.53 %` sentencias (líneas `15-20`)
  - `src/core/db.js`: `96.96 %` sentencias (línea `15`)
  - `src/core/errors.js`: `100 %` sentencias (`100 %` líneas)

## SPEC-06

- **Spec:** `services/ordenes-service/specs/ordenes/01-crear-orden.md`
- **Feature:** `6 — ordenes-crear` (`ordenes-service / ordenes`)
- **Base de datos usada:** PostgreSQL real (`db-ordenes` en `localhost:5434`, sin mocks) + `nock` para `catalogo-service`
- **Estado:** `PASS` (`6 passed`, `4/4` casos `ORDN-T01..T04` en verde)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `ORDN-T01` | `ORDN-T01 POST /api/ordenes válido reserva stock vía nock, calcula total con Decimal y retorna 201` | `services/ordenes-service/tests/ordenes-crear/crear.test.js` | PASSED (`201`, reserva HTTP en `nock`, cálculo exacto `19.95*2 + 0.10*3 = "40.20"` con `Decimal`, persistencia en `ordenes` y `orden_items` en `db-ordenes`) |
| `ORDN-T02` | `ORDN-T02 POST /api/ordenes con items vacío o cantidad <= 0 retorna 422 sin llamar a catálogo` | `services/ordenes-service/tests/ordenes-crear/crear.test.js` | PASSED (`422 VALIDACION_ERROR` para `items: []`, `cantidad: 0`, `cantidad: -3` y email inválido; `0` llamadas a `catalogo-service` y `0` filas en `db-ordenes`) |
| `ORDN-T03` | `ORDN-T03 POST /api/ordenes cuando catálogo responde 409 retorna 409 y no inserta en db-ordenes` | `services/ordenes-service/tests/ordenes-crear/crear.test.js` | PASSED (`409 STOCK_INSUFICIENTE`, `0` filas en `ordenes` y `orden_items` incluso tras reserva previa exitosa en ítem 1) |
| `ORDN-T04` | `ORDN-T04 POST /api/ordenes cuando catálogo falla/timeout retorna 502 CATALOGO_NO_DISPONIBLE` | `services/ordenes-service/tests/ordenes-crear/crear.test.js` | PASSED (`502 CATALOGO_NO_DISPONIBLE` ante error de red `ECONNREFUSED`, HTTP `500` y timeout > `5000ms`; `0` filas en `db-ordenes`) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comando:** `npx jest --runInBand --coverage --collectCoverageFrom="src/**/*.js" --collectCoverageFrom="!src/server.js"` (en `services/ordenes-service/`)
- **Resultado:** `2 test suites passed`, `6 passed, 6 total` (`3.11 s`)
- **Cobertura total del módulo `src` (excluyendo entrypoint `src/server.js`):** **94.51 %** sentencias / **94.51 %** líneas (`75.89 %` ramas, `92.59 %` funciones)
- **Cobertura del módulo `src/modules/ordenes`:** **94.11 %** sentencias / **94.11 %** líneas (`71.42 %` ramas, `100 %` funciones)
  - `src/modules/ordenes/repository.js`: `100 %` sentencias (`100 %` líneas)
  - `src/modules/ordenes/routes.js`: `100 %` sentencias (`100 %` líneas)
  - `src/modules/ordenes/schemas.js`: `100 %` sentencias (`100 %` líneas)
  - `src/modules/ordenes/service.js`: `88 %` sentencias (`88 %` líneas; líneas `11, 20, 24`)

## SPEC-07

- **Spec:** `services/ordenes-service/specs/ordenes/02-consultar-estado.md`
- **Feature:** `7 — ordenes-consultar` (`ordenes-service / ordenes`)
- **Base de datos usada:** PostgreSQL real (`db-ordenes` en `localhost:5434`, sin mocks)
- **Estado:** `PASS` (`9 passed`, `3/3` casos `ORDQ-T01..T03` en verde)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `ORDQ-T01` | `ORDQ-T01 GET /api/ordenes lista órdenes existentes ordenadas descendentemente` | `services/ordenes-service/tests/ordenes-consultar/consultar.test.js` | PASSED (`200`, listado vacío y con 3 órdenes ordenadas por `created_at DESC, id DESC`, `total` string con 2 decimales y `total` del wrapper) |
| `ORDQ-T02` | `ORDQ-T02 GET /api/ordenes/{id} devuelve la orden con sus items o 404 si no existe` | `services/ordenes-service/tests/ordenes-consultar/consultar.test.js` | PASSED (`200` `OrdenConItems` con `items` ordenados y montos string 2 decimales; `404` `ORDEN_NO_ENCONTRADA` si no existe) |
| `ORDQ-T03` | `ORDQ-T03 PATCH /api/ordenes/{id}/estado actualiza estado válido y rechaza estado inválido con 422` | `services/ordenes-service/tests/ordenes-consultar/consultar.test.js` | PASSED (`200` para `PAGADA`, `ENVIADA`, `CANCELADA`, `CREADA` con persistencia en `db-ordenes`; `422 VALIDACION_ERROR` ante estado inválido o ausente; `404 ORDEN_NO_ENCONTRADA` si no existe) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comando:** `npx jest --runInBand --coverage --collectCoverageFrom="src/**/*.js" --collectCoverageFrom="!src/server.js"` (en `services/ordenes-service/`)
- **Resultado:** `3 test suites passed`, `9 passed, 9 total` (`3.17 s`)
- **Cobertura total del módulo `src` (excluyendo entrypoint `src/server.js`):** **95.14 %** sentencias / **95.14 %** líneas (`76.98 %` ramas, `94.87 %` funciones)
- **Cobertura del módulo `src/modules/ordenes`:** **95.69 %** sentencias / **95.69 %** líneas (`77.14 %` ramas, `100 %` funciones)
  - `src/modules/ordenes/repository.js`: `100 %` sentencias (`100 %` líneas)
  - `src/modules/ordenes/routes.js`: `100 %` sentencias (`100 %` líneas)
  - `src/modules/ordenes/schemas.js`: `90.90 %` sentencias (`90.90 %` líneas; línea `12`)
  - `src/modules/ordenes/service.js`: `92.10 %` sentencias (`92.10 %` líneas; líneas `15, 24, 28`)
- **Verificación completa de arnés:** `"C:\Program Files\Git\bin\bash.exe" init.sh` en verde (`catalogo-service` `11 passed`, `ordenes-service` `3 suites / 9 passed`).

## SPEC-08

- **Spec:** `specs-v2/04-frontend.md`
- **Feature:** `8 — frontend` (`frontend`)
- **Entorno de pruebas:** Vitest `2.1.9` + `@testing-library/react` + `jsdom` con `fetch` mockeado (`vi.stubGlobal('fetch', ...)`), sin modificar código de aplicación
- **Estado:** `PASS` (`6 passed`, `6/6` casos `FE-T01..T06` en verde; `npm run build` exitoso)

### Casos cubiertos

| ID | Función de prueba | Archivo | Resultado |
|---|---|---|---|
| `FE-T01` | `FE-T01 Renderiza productos obtenidos desde /api/catalogo/productos` | `frontend/src/App.test.jsx` | PASSED (renderiza productos, SKU, precios, estado habilitado/deshabilitado según stock y consulta relativa `/api/catalogo/productos`) |
| `FE-T02` | `FE-T02 Muestra indicador de salud de ambos servicios (/api/catalogo/health y /api/ordenes/health)` | `frontend/src/App.test.jsx` | PASSED (muestra `Catálogo: Operativo (db: up)` y `Órdenes: Operativo (db: up)` y cambia a `Caído (db: down)` ante `503` al refrescar) |
| `FE-T03` | `FE-T03 Permite agregar producto al carrito y enviar POST /api/ordenes` | `frontend/src/App.test.jsx` | PASSED (agrega al carrito, incrementa cantidad y envía `POST /api/ordenes` con `Content-Type: application/json` y payload esperado) |
| `FE-T04` | `FE-T04 Tras crear orden exitosa, refresca órdenes y catálogo y vacía el carrito` | `frontend/src/App.test.jsx` | PASSED (vacía carrito a `0`, re-consulta `/api/ordenes` y `/api/catalogo/productos` mostrando la nueva orden `#11` y stock descontado de `5` a `4`) |
| `FE-T05` | `FE-T05 Muestra mensaje de error legible cuando una API responde 409/422/502` | `frontend/src/App.test.jsx` | PASSED (muestra `error.mensaje` en `role="alert"` para `409 STOCK_INSUFICIENTE`, `502 CATALOGO_NO_DISPONIBLE` y `422 VALIDACION_ERROR`) |
| `FE-T06` | `FE-T06 Permite crear un producto nuevo con POST /api/catalogo/productos` | `frontend/src/App.test.jsx` | PASSED (envía `POST /api/catalogo/productos` con payload del formulario, muestra confirmación y renderiza el producto creado en la tabla) |

### Casos pendientes

- Ninguno.

### Pruebas fallidas

- Ninguna.

### Cobertura y evidencia

- **Comandos en `frontend/`:**
  - `npm test` (`vitest run --passWithNoTests`): `1 test file passed`, `6 passed` (`Duration 3.63s`, `495ms` tests)
  - `npm run build` (`vite build`): `34 modules transformed`, `dist/` generado en `580ms`
- **Cobertura del módulo:** No se ejecutó reporte automático de cobertura porque `@vitest/coverage-v8` / `@vitest/coverage-istanbul` no están declarados en `frontend/package.json` (`devDependencies`), aunque las 6 pruebas `FE-T01..FE-T06` ejercitan los flujos principales de `App.jsx`, `api/client.js`, `CatalogoPanel.jsx` y `OrdenesPanel.jsx`.
- **Verificación completa de arnés:** `"C:\Program Files\Git\bin\bash.exe" init.sh` en verde (`SPEC-00..08` con pruebas, `117 archivos revisados`, `catalogo-service` `11 passed`, `ordenes-service` `3 suites / 9 passed`, `frontend` `1 file / 6 passed`).
