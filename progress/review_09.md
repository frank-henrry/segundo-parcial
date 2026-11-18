# Review — SPEC-09 contenedores-local

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — Aislamiento estricto de servicios y BDs verificado: `docker-compose.yml:15-16,37-38,60-62,87-89,117-123` separa `db-catalogo` (`catalogo-net`) y `db-ordenes` (`ordenes-net`), conectando `catalogo-service`, `ordenes-service` y `frontend` en `app-net`; búsqueda recursiva en `services/ordenes-service/src/` y `services/catalogo-service/app/` sin referencias cruzadas a tablas ni bases de datos del otro servicio.
- [x] PRY-R03 — Healthchecks HTTP `GET /health` activos en `docker-compose.yml:63-68,90-95` y expuestos vía Nginx en `/api/catalogo/health` (`frontend/nginx.conf:8-15`) y `/api/ordenes/health` (`frontend/nginx.conf:26-33`), ambos respondiendo `200` con `{"status":"ok",...,"db":"up"}`.
- [x] PRY-R04 / PRY-R05 — Verificados en servicios subyacentes y preservados en la contenerización; en `tests/e2e/contenedores.test.js:91` el total de la orden creada E2E se valida como string decimal `"76.50"`.
- [x] PRY-R06 — Variables y URLs internas definidas directamente en `environment:` de `docker-compose.yml:6-9,28-31,52-54,76-79` sin archivos `.env` ni credenciales AWS reales. `.gitignore:2,8-22` excluye `.env`, `.terraform/`, `*.tfstate*`, `*.tfvars`, `*.pem`, `*.key`.
- [x] PRY-R08 — Specs intactas y conformes (`.harness/specs.sha256` validado por `init.sh`).
- [x] FE-R01 — Cero URLs absolutas (`http://localhost` / `http://127.0.0.1`) en `frontend/src/`; el enrutamiento de `/api/catalogo/` y `/api/ordenes/` en contenedor lo resuelve `frontend/nginx.conf:8-51`.
- [x] CNT-R01 — Contenedores de aplicación corren con usuario no-root:
  - `services/catalogo-service/Dockerfile:8,13,15` (`appuser`, verificado con `docker exec catalogo-service id` → `uid=999(appuser) gid=999(appuser)`).
  - `services/ordenes-service/Dockerfile:10,12` (`node`, verificado con `docker exec ordenes-service id` → `uid=1000(node) gid=1000(node)`).
  - `frontend/Dockerfile:21,23-26` (`nginx`, verificado con `docker exec frontend id` → `uid=101(nginx) gid=101(nginx)`).
- [x] CNT-R02 — Ningún `Dockerfile` copia `.env` ni secretos horneados (`services/catalogo-service/Dockerfile:10-13`, `services/ordenes-service/Dockerfile:7-10`, `frontend/Dockerfile:5-9,23-24`); verificado que no existen archivos `.env*` en el repositorio ni en `/app` dentro de los contenedores.
- [x] CNT-R03 — `db-catalogo` y `db-ordenes` usan redes, alias, volúmenes y credenciales independientes en `docker-compose.yml:2-45,113-123` (`catalogo-net` / `db_catalogo_data` / `catalogo_user` vs `ordenes-net` / `db_ordenes_data` / `ordenes_user`), verificado mediante `docker network inspect`.
- [x] Contrato §5 (`specs-v2/05-contenedores-local.md §5` y `specs-v2/01-proyecto-contratos.md §5`) — `docker compose config --quiet` (`exit 0`), los 5 contenedores levantados y `http://localhost:8081` respondiendo `200` en `/`, `/api/catalogo/health`, `/api/ordenes/health`, `/api/catalogo/productos` y `/api/ordenes`.
- [x] §2 (`specs-v2/05-contenedores-local.md §2`) — Todos los archivos del §2 presentes (`services/catalogo-service/Dockerfile`, `services/ordenes-service/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `docker-compose.yml`), imágenes base exactas (`python:3.12-slim`, `node:22-alpine`, `nginx:1.27-alpine` multi-stage) y puerto expuesto `8081:80`.

## Casos de prueba
- [x] CNT-T01 — `tests/e2e/contenedores.test.js:29-54` verifica `GET http://localhost:8081/` (`200` HTML con `<div id="root">`), `GET /api/catalogo/health` (`200`, `{"status":"ok","service":"catalogo-service","db":"up"}`) y `GET /api/ordenes/health` (`200`, `{"status":"ok","service":"ordenes-service","db":"up"}`).
- [x] CNT-T02 — `tests/e2e/contenedores.test.js:56-99` crea un producto real vía `POST /api/catalogo/productos` (`stock: 10`), crea una orden vía `POST http://localhost:8081/api/ordenes` por `cantidad: 3` (`201`, `total: "76.50"`) y confirma en `GET /api/catalogo/productos/{id}` el descuento atómico a `stock: 7`.
- Ejecución directa `node --test tests/e2e/contenedores.test.js`: `2 passed, 0 failed` (`190.45ms`).

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
[OK]    feature_list.json válido (12 features: pending=2 in_progress=0 done=10 blocked=0 reabierta=0)
[OK]    SPEC-00..09: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (124 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 1.37s
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
