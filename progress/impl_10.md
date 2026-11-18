# Informe de implementación — SPEC-10 (`kubernetes`)

- **Feature:** `10 — kubernetes` (`specs-v2/06-kubernetes.md`)
- **Agente:** `devops`
- **Estado en `feature_list.json`:** `in_progress` (listo para revisión por `revisor`)

## 1. Archivos creados (alcance §2 de `specs-v2/06-kubernetes.md`)

1. `[NUEVO]` `infra/k8s/00-namespace.yaml`
   - Define `Namespace` `ecommerce`.
2. `[NUEVO]` `infra/k8s/01-configmap.yaml`
   - Define `ConfigMap` `ecommerce-config` en `ecommerce` con `CATALOGO_PORT="8001"`, `ORDENES_PORT="3001"`, `CATALOGO_URL="http://catalogo-service:8001"`, `POSTGRES_CATALOGO_DB="catalogo"`, `POSTGRES_CATALOGO_USER="catalogo_user"`, `POSTGRES_ORDENES_DB="ordenes"` y `POSTGRES_ORDENES_USER="ordenes_user"` (sin contraseñas).
3. `[NUEVO]` `infra/k8s/02-secrets.example.yaml`
   - Plantilla `Secret` (`Opaque`) para `db-catalogo-secret` y `db-ordenes-secret` con `stringData.POSTGRES_PASSWORD` usando placeholders `<CAMBIAR_PASSWORD_CATALOGO>` y `<CAMBIAR_PASSWORD_ORDENES>`, sin credenciales reales.
4. `[NUEVO]` `infra/k8s/03-db-catalogo.yaml`
   - `ConfigMap` `db-catalogo-init` con el DDL y datos semilla de `services/catalogo-service/db/init.sql`.
   - `StatefulSet` `db-catalogo` (`postgres:16-alpine`, `PGDATA=/var/lib/postgresql/data/pgdata`, `volumeClaimTemplates` `db-catalogo-data` de `2Gi`, probes `pg_isready`, `resources.requests/limits`).
   - `Service` `ClusterIP` `db-catalogo:5432`.
5. `[NUEVO]` `infra/k8s/04-db-ordenes.yaml`
   - `ConfigMap` `db-ordenes-init` con el DDL de `services/ordenes-service/db/init.sql`.
   - `StatefulSet` `db-ordenes` (`postgres:16-alpine`, `PGDATA=/var/lib/postgresql/data/pgdata`, `volumeClaimTemplates` `db-ordenes-data` de `2Gi`, probes `pg_isready`, `resources.requests/limits`).
   - `Service` `ClusterIP` `db-ordenes:5432`.
6. `[NUEVO]` `infra/k8s/05-catalogo-service.yaml`
   - `Deployment` `catalogo-service` (`ghcr.io/<OWNER>/catalogo-service:<TAG>`, `PORT=8001`, `DATABASE_URL` compuesto desde `ecommerce-config` + `db-catalogo-secret`, `readinessProbe` y `livenessProbe` en `/health` puerto `8001`, `resources.requests/limits`).
   - `Service` `ClusterIP` `catalogo-service:8001`.
7. `[NUEVO]` `infra/k8s/06-ordenes-service.yaml`
   - `Deployment` `ordenes-service` (`ghcr.io/<OWNER>/ordenes-service:<TAG>`, `PORT=3001`, `CATALOGO_URL`, `DATABASE_URL` compuesto desde `ecommerce-config` + `db-ordenes-secret`, `readinessProbe` y `livenessProbe` en `/health` puerto `3001`, `resources.requests/limits`).
   - `Service` `ClusterIP` `ordenes-service:3001`.
8. `[NUEVO]` `infra/k8s/07-frontend.yaml`
   - `Deployment` `frontend` (`ghcr.io/<OWNER>/ecommerce-frontend:<TAG>`, `readinessProbe` y `livenessProbe` en `/` puerto `80`, `resources.requests/limits`).
   - `Service` `ClusterIP` `frontend:80`.
9. `[NUEVO]` `infra/k8s/08-ingress.yaml`
   - `Ingress` `ecommerce-ingress` (`ingressClassName: traefik`) enrutando `/api/catalogo` → `catalogo-service:8001`, `/api/ordenes` → `ordenes-service:3001` y `/` → `frontend:80` con `pathType: Prefix`.
10. `[NUEVO]` `infra/k8s/README.md`
    - Documenta prerrequisitos, creación segura de `Secret`s mediante `kubectl create secret`, orden de aplicación y verificación.

## 2. Cumplimiento de reglas (`K8S-R01..R04`, `PRY-R01`, `PRY-R06`)

- **K8S-R01 / PRY-R06:** Ningún manifiesto versionado contiene contraseñas reales; solo `02-secrets.example.yaml` con `<CAMBIAR_PASSWORD_CATALOGO>` y `<CAMBIAR_PASSWORD_ORDENES>`.
- **K8S-R02 / PRY-R01:** `db-catalogo` y `db-ordenes` utilizan `StatefulSet`, `ConfigMap` de inicialización, `volumeClaimTemplates` (`2Gi`) y `Service` `ClusterIP` independientes.
- **K8S-R03:** `catalogo-service`, `ordenes-service` y `frontend` definen `readinessProbe`, `livenessProbe` y `resources.requests/limits`.
- **K8S-R04:** Los 3 `Deployment`s usan `ghcr.io/<OWNER>/<imagen>:<TAG>`.

## 3. Verificaciones ejecutadas

### Validación YAML con Python (`yaml.safe_load_all`)

```text
infra/k8s\00-namespace.yaml: 1 docs
infra/k8s\01-configmap.yaml: 1 docs
infra/k8s\02-secrets.example.yaml: 2 docs
infra/k8s\03-db-catalogo.yaml: 3 docs
infra/k8s\04-db-ordenes.yaml: 3 docs
infra/k8s\05-catalogo-service.yaml: 2 docs
infra/k8s\06-ordenes-service.yaml: 2 docs
infra/k8s\07-frontend.yaml: 2 docs
infra/k8s\08-ingress.yaml: 1 docs
```

### `"C:\Program Files\Git\bin\bash.exe" init.sh --rapido` (exit code `0`)

```text
[OK]    Specs intactas y conformes (<= 150 líneas, 6 secciones, 16 archivos)
[OK]    feature_list.json válido (12 features: pending=1 in_progress=1 done=10 blocked=0 reabierta=0)
[OK]    SPEC-00 .. SPEC-10: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (136 archivos revisados)
[OK]    catalogo-service (pytest) en verde (11 passed)
[OK]    ordenes-service en verde (9 passed)
[OK]    frontend (vitest) en verde (6 passed)
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)
[OK]    Manifiestos YAML válidos en infra/k8s/ (offline)
[WARN]  Sin contexto kubeconfig activo: se omite kubectl apply --dry-run=client
[OK]    Entorno listo (verificación rápida).
```
