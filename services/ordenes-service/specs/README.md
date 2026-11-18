# Specs internas de `ordenes-service` (por módulo)

Cada módulo tiene su propia carpeta dentro de `services/ordenes-service/specs/<modulo>/` y puede
contener una o más specs (máximo 150 líneas y 6 secciones fijas por archivo).
- **Contratos externos compartidos:** viven únicamente en `specs-v2/01-proyecto-contratos.md §5`.
- **Módulos actuales:**
  - `core/01-ordenes-core.md` — base Express, `db-ordenes`, errores PRY-R07, `/health` y `catalogoClient.js`.
  - `ordenes/01-crear-orden.md` — `POST /api/ordenes` con reserva HTTP en catálogo y cálculo `Decimal`.
  - `ordenes/02-consultar-estado.md` — listado, detalle y cambio de estado de órdenes.
