# Contratos API REST — Índice de Referencia

> **Fuente única de verdad (SDD):** [`specs-v2/01-proyecto-contratos.md`](../specs-v2/01-proyecto-contratos.md) (§4 y §5) y [`specs-v2/manifest.yaml`](../specs-v2/manifest.yaml).
> Este documento es un índice legible. Ante cualquier discrepancia prevalece `specs-v2/01-proyecto-contratos.md`.

---

## 1. Reglas globales transversales (`PRY-R01` .. `PRY-R08`)

| Regla | Resumen |
|---|---|
| `PRY-R01` | Aislamiento estricto: cada servicio tiene su carpeta (`services/<servicio>/`) y su propia BD PostgreSQL. Prohibido acceso cruzado entre BDs. |
| `PRY-R02` | Capas limpias internas: rutas/controllers → lógica de negocio → repositorio/cliente HTTP. |
| `PRY-R03` | Healthcheck estándar: `GET /health` → `200` `{ "status": "ok", "service": "<nombre>", "db": "up" }` (`503` si falla su BD). |
| `PRY-R04` | Dinero y precios: `NUMERIC(12,2)` en PostgreSQL, `Decimal` en código, string con 2 decimales (`"49.90"`) en JSON. Nunca `float` para totales. |
| `PRY-R05` | SQL 100 % parametrizado (`%s` en Python/`psycopg`, `$1/$2` en Node/`pg`). |
| `PRY-R06` | Variables y URLs internas inyectadas vía `environment` en `docker-compose.yml` / Kubernetes (sin archivo `.env` local); cero credenciales AWS o claves privadas en Git. |
| `PRY-R07` | Formato único de error JSON: `{ "error": { "codigo": "CODIGO_UPPER", "mensaje": "Texto legible" } }`. |
| `PRY-R08` | Specs de solo lectura para agentes y límite de 150 líneas por spec (`SDD`). |

---

## 2. Catálogo (`catalogo-service` — puerto interno `:8001`, ruta base `/api/catalogo`)

| Método y ruta | Payload / Query | Respuesta |
|---|---|---|
| `GET /health` | — | `200 { status, service, db }` \| `503` |
| `GET /api/catalogo/productos` | `?categoria=&q=` | `200 { items: [Producto], total }` |
| `GET /api/catalogo/productos/{id}` | — | `200 Producto` (`id, sku, nombre, categoria, precio, stock, activo`) |
| `POST /api/catalogo/productos` | `{ sku, nombre, categoria, precio, stock }` | `201 Producto` |
| `PATCH /api/catalogo/productos/{id}/stock` | `{ stock }` | `200 Producto` |
| `POST /api/catalogo/productos/{id}/reservar` | `{ cantidad }` | `200 Producto` \| `409 STOCK_INSUFICIENTE` |

---

## 3. Órdenes (`ordenes-service` — puerto interno `:3001`, ruta base `/api/ordenes`)

| Método y ruta | Payload | Respuesta |
|---|---|---|
| `GET /health` | — | `200 { status, service, db }` \| `503` |
| `GET /api/ordenes` | — | `200 { items: [Orden], total }` |
| `GET /api/ordenes/{id}` | — | `200 OrdenConItems` |
| `POST /api/ordenes` | `{ clienteNombre, clienteEmail, items: [{ productoId, cantidad }] }` | `201 OrdenConItems` (`id, clienteNombre, clienteEmail, estado, total, items, createdAt`) |
| `PATCH /api/ordenes/{id}/estado` | `{ estado }` | `200 Orden` |

---

## 4. Bases de datos locales (`docker-compose.yml`)

| Servicio Compose | Imagen | Puerto host → contenedor | BD / Usuario locales | Volumen |
|---|---|---|---|---|
| `db-catalogo` | `postgres:16-alpine` | `5433:5432` | `catalogo` / `catalogo_user` | `db_catalogo_data` |
| `db-ordenes` | `postgres:16-alpine` | `5434:5432` | `ordenes` / `ordenes_user` | `db_ordenes_data` |

> Comunicación inter-servicio: `ordenes-service` consume `catalogo-service` vía HTTP usando la variable `CATALOGO_URL` (nunca consultando `db-catalogo`).
