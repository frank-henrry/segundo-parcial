# Convenciones de código y pruebas

## 1. Python (`services/catalogo-service/`)

- Python 3.12, FastAPI + Pydantic v2 + `psycopg` (v3).
- Formato PEP 8 (4 espacios), type hints en schemas y funciones públicas.
- Dinero con `decimal.Decimal` (serializado como string con 2 decimales `"29.90"`).
- SQL parametrizado con `%s` (nunca f-strings ni `+` con valores de entrada).
- Pruebas en `services/catalogo-service/tests/test_*.py` usando `def test_cat_t01_...():` (el id `CAT-Tnn` en minúsculas con guion bajo).

## 2. Node.js (`services/ordenes-service/`)

- Node.js 22 LTS, **CommonJS** (`'use strict';`, `require`/`module.exports`), 2 espacios, punto y coma, comillas simples.
- `async/await` siempre; dinero con `decimal.js`; validación con `zod`; HTTP con `axios`.
- SQL parametrizado con `$1, $2` en `pg`.
- Pruebas en `services/ordenes-service/tests/*.test.js` empezando por el id: `test('ORD-T01 ...', ...)`.

## 3. Frontend (`frontend/`)

- React 18 + Vite, componentes funcionales en `frontend/src/components/`.
- Todas las llamadas HTTP encapsuladas en `frontend/src/api/client.js` usando rutas relativas `/api/catalogo/...` y `/api/ordenes/...`.
- Pruebas con Vitest + Testing Library empezando por el id: `test('FE-T01 ...', ...)`.

## 4. Terraform y Kubernetes (`infra/`)

- HCL formateado con `terraform fmt`; variables tipadas y con `validation` donde aplique.
- YAML en `infra/k8s/` prefijado por orden de aplicación (`00-` .. `08-`) dentro del namespace `ecommerce`.
- Nunca usar `.skip`, `.only` ni `@pytest.mark.skip`.
