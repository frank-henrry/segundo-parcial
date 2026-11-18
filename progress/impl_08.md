# Informe de implementación — SPEC-08 (`frontend`)

- **Feature:** `8 — frontend` (`specs-v2/04-frontend.md`)
- **Agente:** `desarrolladorfront`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de `tester` y `revisor`)

## 1. Archivos creados (alcance §2 de `specs-v2/04-frontend.md`)

1. `[NUEVO]` `frontend/package.json`
   - Define scripts `dev` (`vite`), `build` (`vite build`) y `test` (`vitest run --passWithNoTests`) con React 18, Vite 5, Vitest, `@testing-library/react`, `@testing-library/jest-dom` y `jsdom` (generando `frontend/package-lock.json` tras `npm install`).
2. `[NUEVO]` `frontend/vite.config.js`
   - Configura `@vitejs/plugin-react`, proxy dev `/api/catalogo` → `http://localhost:8001` y `/api/ordenes` → `http://localhost:3001`, y bloque `test: { environment: 'jsdom', globals: true }` para Vitest.
3. `[NUEVO]` `frontend/index.html`
   - Documento base HTML5 con contenedor `#root` y entrada `/src/main.jsx`.
4. `[NUEVO]` `frontend/src/main.jsx`
   - Monta `<App />` en `#root` e importa `./styles.css`.
5. `[NUEVO]` `frontend/src/api/client.js`
   - Encapsula `fetchHealthServicios`, `fetchCatalogo`, `crearProducto`, `actualizarStock`, `fetchOrdenes`, `crearOrden` y `actualizarEstadoOrden` usando únicamente rutas relativas `/api/catalogo/...` y `/api/ordenes/...`, con extracción uniforme de `error.mensaje` (`PRY-R07`).
6. `[NUEVO]` `frontend/src/components/CatalogoPanel.jsx`
   - Listado de productos (`SKU`, `Nombre`, `Categoría`, `Precio`, `Stock`), filtro por `q` y `categoria`, botón `Agregar al carrito`, ajuste inline de stock (`PATCH /api/catalogo/productos/{id}/stock`) y formulario de alta de producto (`POST /api/catalogo/productos`).
7. `[NUEVO]` `frontend/src/components/OrdenesPanel.jsx`
   - Carrito actual (ajustar cantidad / quitar ítems), formulario de checkout (`clienteNombre`, `clienteEmail` → `POST /api/ordenes`), historial de órdenes y selector de estado (`CREADA`, `PAGADA`, `ENVIADA`, `CANCELADA` → `PATCH /api/ordenes/{id}/estado`).
8. `[NUEVO]` `frontend/src/App.jsx` y `frontend/src/styles.css`
   - Layout principal con barra superior de estado en vivo (`/api/catalogo/health` y `/api/ordenes/health`), coordinación de carrito, catálogo y órdenes, y estilos responsivos.

## 2. Cumplimiento de reglas (`FE-R01..R03`, `PRY-R01..R08`)

- **FE-R01 (Cero URLs absolutas en `frontend/src/`):** Verificado con `grep`; todas las llamadas en `frontend/src/api/client.js` usan rutas relativas `/api/catalogo/...` y `/api/ordenes/...`.
- **FE-R02 (Carga y errores JSON legibles):** Cada panel muestra indicadores de carga (`Cargando catálogo...`, `Cargando órdenes...`, `Guardando...`, `Procesando orden...`) y renderiza errores en elementos `role="alert"` usando `error.mensaje` devuelto por el backend.
- **FE-R03 (Post-checkout):** Tras `crearOrden` exitosa en `App.jsx`, `setCarrito([])` limpia el carrito y se ejecutan `cargarOrdenes()` y `cargarCatalogo(filtros)` en paralelo para reflejar la orden creada y el stock descontado.
- **Separación de lógica de negocio:** El cliente no calcula totales autoritativos ni descuenta stock en local; envía las cantidades e ítems al backend y muestra el `total` y `stock` devueltos por las APIs.

## 3. Verificaciones ejecutadas

### `npm install` y `npm run build` en `frontend/`

```text
added 171 packages, and audited 172 packages in 24s

> ecommerce-k8s-frontend@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 34 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.42 kB │ gzip:  0.29 kB
dist/assets/index-DtGB1x9u.css    3.99 kB │ gzip:  1.37 kB
dist/assets/index-6qEizoxg.js   156.34 kB │ gzip: 49.72 kB
✓ built in 508ms
```

### Verificación de URLs hardcodeadas en `frontend/src/`

```text
grep -rnE 'http://|https://|localhost|[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}' frontend/src/
-> NO_URLS_IN_SRC
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
[OK]    feature_list.json válido (12 features: pending=3 in_progress=1 done=8 blocked=0 reabierta=0)
[OK]    SPEC-08 (en curso) aún sin prueba: FE-T01..FE-T06 (pendientes del agente tester)
[OK]    Alcance de archivos correcto (115 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
[OK]    catalogo-service (pytest) en verde (11 passed)
[OK]    ordenes-service en verde (9 passed)
[OK]    frontend (vitest) en verde (vitest run --passWithNoTests)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
