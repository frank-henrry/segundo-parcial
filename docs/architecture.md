# Arquitectura — ecommerce-k8s

> Mapa hacia las reglas de `specs-v2/`. Si este documento y una spec se contradicen, gana la spec.

## Principios clave

1. **Aislamiento de servicios y bases de datos (PRY-R01):**
   - `catalogo-service` (Python 3.12 + FastAPI) ↔ `db-catalogo` (PostgreSQL 16).
   - `ordenes-service` (Node.js 22 + Express 4) ↔ `db-ordenes` (PostgreSQL 16).
   - Prohibido que un servicio acceda a la BD del otro. `ordenes-service` reserva stock y lee precios vía HTTP usando `CATALOGO_URL`.
2. **Frontend desacoplado (FE-R01):**
   - `frontend/` (React + Vite) usa rutas relativas `/api/catalogo/...` y `/api/ordenes/...`.
   - En desarrollo local enruta `vite.config.js`; en Docker Compose enruta `frontend/nginx.conf`; en Kubernetes enruta `infra/k8s/08-ingress.yaml` (Traefik).
3. **Dinero y SQL seguro (PRY-R04, PRY-R05):**
   - Precios y totales con `NUMERIC(12,2)` en PostgreSQL y `Decimal` en Python y Node.js.
   - Consultas SQL 100 % parametrizadas (`%s` en `psycopg`, `$1/$2` en `pg`).
4. **Infraestructura reproducible y segura (K8S-R01..R04, TFK-R01..R04):**
   - Dos `StatefulSet` + `PVC` separados en k8s (`db-catalogo`, `db-ordenes`).
   - Clúster **k3s sobre EC2** aprovisionado con Terraform en la cuenta AWS propia del operador (`var.aws_profile`), sin credenciales en el repo y administrado vía SSM.
