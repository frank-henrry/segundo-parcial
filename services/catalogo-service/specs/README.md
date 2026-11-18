# Specs internas de `catalogo-service` (por módulo)

Cada módulo tiene su propia carpeta dentro de `services/catalogo-service/specs/<modulo>/` y puede
contener una o más specs (máximo 150 líneas y 6 secciones fijas por archivo).
- **Contratos externos compartidos:** viven únicamente en `specs-v2/01-proyecto-contratos.md §5`.
- **Módulos actuales:**
  - `core/01-catalogo-core.md` — arranque FastAPI, `db-catalogo`, errores PRY-R07 y `/health`.
  - `productos/01-productos-crud.md` — listado, búsqueda, detalle y creación de productos.
  - `productos/02-stock-reservas.md` — actualización y reserva atómica de stock.
