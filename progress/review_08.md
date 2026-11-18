# Review — SPEC-08 frontend

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — Frontend desacoplado en `frontend/`; consume ambos microservicios exclusivamente por HTTP relativo sin acceso directo a BDs.
- [x] PRY-R04 — `frontend/src/components/CatalogoPanel.jsx:60-84` envía `precio` como string sin aritmética flotante y `frontend/src/components/OrdenesPanel.jsx:88,200` renderiza los montos (`producto.precio`, `orden.total`) devueltos por las APIs sin calcular totales autoritativos en el cliente.
- [x] PRY-R06 — Cero credenciales o secretos en `frontend/`; las URLs de proxy dev residen únicamente en `frontend/vite.config.js:8-15` conforme al §2 de la spec.
- [x] PRY-R07 — `frontend/src/api/client.js:25-35` extrae `data?.error?.mensaje` y `data?.error?.codigo` del contrato de error JSON estándar.
- [x] PRY-R08 — Specs intactas (`.harness/specs.sha256` validado por `init.sh`).
- [x] Contrato §5 (`specs-v2/01-proyecto-contratos.md §5`) — `frontend/src/api/client.js:63-116` implementa `fetchHealthServicios` (`/api/catalogo/health`, `/api/ordenes/health`), `fetchCatalogo` (`GET /api/catalogo/productos`), `crearProducto` (`POST /api/catalogo/productos`), `actualizarStock` (`PATCH /api/catalogo/productos/{id}/stock`), `fetchOrdenes` (`GET /api/ordenes`), `crearOrden` (`POST /api/ordenes`) y `actualizarEstadoOrden` (`PATCH /api/ordenes/{id}/estado`) con los payloads exactos del contrato.
- [x] FE-R01 — Cero URLs absolutas (`http://`, `https://`, `localhost` o IPs) en `frontend/src/` (verificado mediante búsqueda recursiva en `frontend/src/` sin coincidencias).
- [x] FE-R02 — Estados de carga (`healthLoading`, `catalogoLoading`, `ordenesLoading`, `submitting`, `updatingStockId`, `updatingId`) y manejo de errores JSON (`role="alert"` con `error.mensaje`) verificados en `frontend/src/App.jsx:14-42` y `frontend/src/components/{CatalogoPanel,OrdenesPanel}.jsx`.
- [x] FE-R03 — `frontend/src/App.jsx:134-139` limpia el carrito (`setCarrito([])`) y refresca órdenes y catálogo (`Promise.all([cargarOrdenes(), cargarCatalogo(filtros)])`) tras crear una orden exitosa.
- [x] §2 y §6.1 (`specs-v2/04-frontend.md`) — Todos los archivos del §2 presentes y `npm run build` (`vite build`) compila limpio en `frontend/` (`34 modules transformed`, `dist/` generado en `618ms`).

## Casos de prueba
- [x] FE-T01 — Renderiza productos obtenidos desde `/api/catalogo/productos`, verifica precios, SKU y habilitación por stock (`frontend/src/App.test.jsx:62-109`).
- [x] FE-T02 — Muestra indicador de salud de `/api/catalogo/health` y `/api/ordenes/health` y refleja transición a `503` (`frontend/src/App.test.jsx:111-160`).
- [x] FE-T03 — Agrega producto al carrito, incrementa cantidad y envía `POST /api/ordenes` con `Content-Type: application/json` (`frontend/src/App.test.jsx:162-240`).
- [x] FE-T04 — Tras crear orden exitosa, vacía el carrito y refresca `/api/ordenes` y `/api/catalogo/productos` (`frontend/src/App.test.jsx:242-339`).
- [x] FE-T05 — Muestra mensaje `error.mensaje` en `role="alert"` cuando una API responde `409`, `502` o `422` (`frontend/src/App.test.jsx:341-457`).
- [x] FE-T06 — Crea un producto nuevo con `POST /api/catalogo/productos` y actualiza la tabla (`frontend/src/App.test.jsx:459-552`).

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
[OK]    feature_list.json válido (12 features: pending=3 in_progress=0 done=9 blocked=0 reabierta=0)
[OK]    SPEC-00..08: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (117 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 1.40s
[OK]    catalogo-service (pytest) en verde
Test Suites: 3 passed, 3 total
Tests:       9 passed, 9 total
[OK]    ordenes-service en verde
Test Files  1 passed (1)
Tests       6 passed (6)
[OK]    frontend (vitest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
