# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se añade aquí.
> No edites entradas anteriores. Solo añades al final.

---

## 2026-11-17 — Planificación y adaptación del arnés para ecommerce-k8s
- **Arquitectura acordada:**
  - `catalogo-service`: Python 3.12 + FastAPI + PostgreSQL 16 (`db-catalogo` en contenedor Docker propio).
  - `ordenes-service`: Node.js 22 + Express 4 + PostgreSQL 16 (`db-ordenes` en contenedor Docker propio).
  - `frontend`: React + Vite + Nginx consumiendo ambos servicios vía `/api/catalogo/*` y `/api/ordenes/*`.
  - **Kubernetes en AWS:** k3s sobre EC2 aprovisionado con Terraform (`infra/terraform/ec2/`) usando el perfil AWS propio del usuario (`var.aws_profile`).
- **Adaptación del arnés:**
  - Subagentes actualizados en `.claude/agents/`: `leader`, `desarrolladorback`, `desarrolladorfront`, `devops`, `tester`, `revisor`.
  - Verificadores `.harness/alcance.js`, `.harness/validar-features.js` e `init.sh` adaptados para Python (`pytest`), Node (`jest`), Frontend (`vitest`), Kubernetes y Terraform.
  - Nuevas specs `specs-v2/00..07` y `feature_list.json` (`SPEC-00` `done`, `SPEC-01`..`SPEC-07` `pending`).

## 2026-11-17 — Feature 1: proyecto-contratos (`SPEC-01`)
- **Agentes:** `devops` → `revisor`.
- **Cambios:** `docker-compose.yml` (`db-catalogo` en `5433`, `db-ordenes` en `5434`, redes y volúmenes aislados, variables locales sin `.env`) y `docs/api-contracts.md`.
- **Veredicto:** `APROBADO` (`progress/review_01.md`). `init.sh` en verde.

## 2026-11-17 — Feature 2: catalogo-core (`SPEC-02`)
- **Agentes:** `desarrolladorback` → `tester` → `revisor`.
- **Cambios:** `services/catalogo-service/` (`requirements.txt`, `db/init.sql`, `app/core/{config,db,errors}.py`, `app/main.py`, `tests/conftest.py`, `tests/catalogo-core/test_core.py`).
- **Veredicto:** `APROBADO` (`progress/review_02.md`). `CATC-T01..T02` verdes con `pytest` contra `db-catalogo`.

## 2026-11-17 — Feature 3: catalogo-productos-crud (`SPEC-03`)
- **Agentes:** `desarrolladorback` → `tester` → `revisor`.
- **Cambios:** `services/catalogo-service/app/modules/productos/{schemas,repository,router}.py`, `app/main.py` y `tests/catalogo-productos-crud/test_crud.py`.
- **Veredicto:** `APROBADO` (`progress/review_03.md`). `CATP-T01..T05` verdes con `pytest` contra `db-catalogo`.

## 2026-11-17 — Feature 4: catalogo-stock-reservas (`SPEC-04`)
- **Agentes:** `desarrolladorback` → `tester` → `revisor`.
- **Cambios:** `services/catalogo-service/app/modules/productos/{schemas,repository,router}.py` y `tests/catalogo-stock-reservas/test_stock.py`.
- **Veredicto:** `APROBADO` (`progress/review_04.md`). `catalogo-service` completo (11/11 pruebas `pytest` verdes).

## 2026-11-17 — Feature 5: ordenes-core (`SPEC-05`)
- **Agentes:** `desarrolladorback` → `tester` → `revisor`.
- **Cambios:** `services/ordenes-service/` (`package.json`, `jest.config.js`, `db/init.sql`, `src/core/*`, `src/app.js`, `src/server.js`, `tests/setup.js`, `tests/ordenes-core/core.test.js`).
- **Veredicto:** `APROBADO` (`progress/review_05.md`). `ORDC-T01..T02` verdes con Jest contra `db-ordenes` y `nock`.

## 2026-11-17 — Feature 6: ordenes-crear (`SPEC-06`)
- **Agentes:** `desarrolladorback` → `tester` → `revisor`.
- **Cambios:** `services/ordenes-service/src/modules/ordenes/{schemas,repository,service,routes}.js`, `src/app.js` y `tests/ordenes-crear/crear.test.js`.
- **Veredicto:** `APROBADO` (`progress/review_06.md`). `ORDN-T01..T04` verdes con `Decimal`, PostgreSQL real y `nock`.

## 2026-11-17 — Feature 7: ordenes-consultar (`SPEC-07`)
- **Agentes:** `desarrolladorback` → `tester` → `revisor`.
- **Cambios:** `services/ordenes-service/src/modules/ordenes/{schemas,repository,service,routes}.js` y `tests/ordenes-consultar/consultar.test.js`.
- **Veredicto:** `APROBADO` (`progress/review_07.md`). `ordenes-service` completo (9/9 pruebas Jest verdes contra `db-ordenes` y `nock`).

## 2026-11-17 — Feature 8: frontend (`SPEC-08`)
- **Agentes:** `desarrolladorfront` → `tester` → `revisor`.
- **Cambios:** `frontend/` (`package.json`, `vite.config.js`, `index.html`, `src/{main,App}.jsx`, `src/api/client.js`, `src/components/{CatalogoPanel,OrdenesPanel}.jsx`, `src/styles.css`, `src/App.test.jsx`).
- **Veredicto:** `APROBADO` (`progress/review_08.md`). `FE-T01..T06` verdes con Vitest y `npm run build` OK.

## 2026-11-17 — Feature 9: contenedores-local (`SPEC-09`)
- **Agentes:** `devops` → `tester` → `revisor`.
- **Cambios:** `services/{catalogo,ordenes}-service/Dockerfile`, `frontend/{Dockerfile,nginx.conf}`, `docker-compose.yml` (puerto `8081` en host, redes aisladas por BD) y `tests/e2e/contenedores.test.js`.
- **Veredicto:** `APROBADO` (`progress/review_09.md`). `CNT-T01..T02` verdes sobre `http://localhost:8081`.

## 2026-11-18 — Feature 10: kubernetes (`SPEC-10`)
- **Agentes:** `devops` → `revisor`.
- **Cambios:** `infra/k8s/` (`00-namespace.yaml`..`08-ingress.yaml`, `README.md`) con `StatefulSet`+`PVC` separados para `db-catalogo` y `db-ordenes`, `02-secrets.example.yaml`, `ClusterIP` e Ingress Traefik.
- **Veredicto:** `APROBADO CON OBSERVACIONES` (`progress/review_10.md`: YAML offline válido; `kubectl apply --dry-run=client` requiere kubeconfig de clúster k3s activo).

## 2026-11-18 — Feature 11: aws-terraform-k3s (`SPEC-11`)
- **Agentes:** `devops` → `revisor`.
- **Cambios:** `infra/terraform/ec2/{providers,variables,main,outputs}.tf`, `terraform.tfvars.example`, `user-data.sh.tftpl`, `README.md` y `.github/workflows/ci-cd.yml`.
- **Veredicto:** `APROBADO CON OBSERVACIONES` (`progress/review_11.md`: Terraform `fmt`/`validate` no se ejecutaron en local por binario `D:\TERRAFON\terraform.exe` incompatible; validación pendiente en CI/entorno con Terraform válido).
- **Cierre:** 12/12 features en `done`. `bash init.sh` en verde.
