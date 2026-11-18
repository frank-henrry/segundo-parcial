# Review — SPEC-10 kubernetes

**Veredicto:** APROBADO CON OBSERVACIONES

## Reglas
- [x] PRY-R01 — Aislamiento estricto de servicios y BDs: `infra/k8s/03-db-catalogo.yaml:30-137` (`db-catalogo`) y `infra/k8s/04-db-ordenes.yaml:36-143` (`db-ordenes`) usan `StatefulSet`, `ConfigMap` de inicialización, `volumeClaimTemplates` (`2Gi`) y `Service` `ClusterIP` separados; `infra/k8s/05-catalogo-service.yaml:33-49` conecta solo con `db-catalogo:5432` y `db-catalogo-secret`, mientras `infra/k8s/06-ordenes-service.yaml:35-56` conecta solo con `db-ordenes:5432`, `db-ordenes-secret` y `CATALOGO_URL` HTTP (`http://catalogo-service:8001`).
- [x] PRY-R06 — Cero credenciales reales ni secretos versionados en Git; `.gitignore:2,8-22` excluye `.env`, `.terraform/`, `*.tfstate*`, `*.tfvars`, `*.pem`, `*.key`, y las variables no sensibles viven en `infra/k8s/01-configmap.yaml:8-15`.
- [x] PRY-R08 — Specs intactas y conformes (`.harness/specs.sha256` validado por `init.sh`: `<= 150` líneas, `6` secciones, `16` archivos).
- [x] K8S-R01 — Ningún manifiesto versionado contiene contraseñas reales; únicamente `infra/k8s/02-secrets.example.yaml:3-23` define plantilla con placeholders `<CAMBIAR_PASSWORD_CATALOGO>` y `<CAMBIAR_PASSWORD_ORDENES>`, e `infra/k8s/README.md:14-35` documenta la creación segura mediante `kubectl create secret`.
- [x] K8S-R02 — Ambas bases de datos usan `StatefulSet` y `PVC` (`volumeClaimTemplates` `2Gi`) independientes con `Service` `ClusterIP` interno (`infra/k8s/03-db-catalogo.yaml:30-137`, `infra/k8s/04-db-ordenes.yaml:36-143`; sin `NodePort` ni `LoadBalancer`).
- [x] K8S-R03 — Todos los `Deployment`s de API y Front definen `readinessProbe`, `livenessProbe` y `resources.requests/limits`:
  - `infra/k8s/05-catalogo-service.yaml:50-72` (`/health` puerto `8001`)
  - `infra/k8s/06-ordenes-service.yaml:57-79` (`/health` puerto `3001`)
  - `infra/k8s/07-frontend.yaml:27-49` (`/` puerto `80`)
- [x] K8S-R04 — Imágenes con placeholders claros `ghcr.io/<OWNER>/...:<TAG>` en `infra/k8s/05-catalogo-service.yaml:22`, `infra/k8s/06-ordenes-service.yaml:22` y `infra/k8s/07-frontend.yaml:22`.
- [x] §2 (`specs-v2/06-kubernetes.md §2`) — Los 10 archivos declarados existen en `infra/k8s/` (`00-namespace.yaml` .. `08-ingress.yaml`, `README.md`) dentro del namespace `ecommerce`, y sus 9 YAML (17 documentos) pasan `yaml.safe_load_all` sin errores.

## Casos de prueba / Verificaciones
- [x] K8S-V01 — Los 10 archivos de `specs-v2/06-kubernetes.md §2` existen en `infra/k8s/` sin secretos reales (`02-secrets.example.yaml` solo con `<CAMBIAR_PASSWORD_*>`).
- [x] K8S-V02 — `db-catalogo` (`03-db-catalogo.yaml`) y `db-ordenes` (`04-db-ordenes.yaml`) poseen `StatefulSet`, `volumeClaimTemplates` (`2Gi`) y `Service ClusterIP` (`5432`) independientes, con scripts SQL idénticos a `services/catalogo-service/db/init.sql` y `services/ordenes-service/db/init.sql`.
- [x] K8S-V03 — `infra/k8s/08-ingress.yaml:9-33` configura `ingressClassName: traefik` enrutando `/api/catalogo` → `catalogo-service:8001`, `/api/ordenes` → `ordenes-service:3001` y `/` → `frontend:80` (`pathType: Prefix`).
- [ ] Contrato §5 (`kubectl apply --dry-run=client -f infra/k8s/`) — **Observación:** No pudo ejecutarse en este host porque `kubectl` no cuenta con contexto `kubeconfig` ni clúster activo (`[WARN] Sin contexto kubeconfig activo: se omite kubectl apply --dry-run=client` en `init.sh`). En su lugar, la sintaxis e invariantes de los 17 documentos YAML en `infra/k8s/*.yaml` se validaron offline con Python `yaml.safe_load_all`. Se recomienda correr `kubectl apply --dry-run=client -f infra/k8s/` una vez conectado al clúster k3s de `SPEC-11` (`TFK`).

## Checkpoints
- C1: [x]  C2: [x]  C3: [x]  C4: [x]  C5: [x] *(con observación de entorno en `init.sh` para `kubectl dry-run` y `terraform` CLI)*

## Observaciones (no bloqueantes)
1. `specs-v2/06-kubernetes.md §5` — `init.sh:161-170` omitió `kubectl apply --dry-run=client -f infra/k8s/` con `[WARN]` por ausencia de contexto `kubeconfig` activo en el host Windows; la validación YAML offline (`yaml.safe_load_all`) pasó en verde. Validar contra el servidor API al aprovisionar k3s en `SPEC-11`.

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
[OK]    feature_list.json válido (12 features: pending=1 in_progress=0 done=11 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    SPEC-02: todos sus casos tienen prueba
[OK]    SPEC-03: todos sus casos tienen prueba
[OK]    SPEC-04: todos sus casos tienen prueba
[OK]    SPEC-05: todos sus casos tienen prueba
[OK]    SPEC-06: todos sus casos tienen prueba
[OK]    SPEC-07: todos sus casos tienen prueba
[OK]    SPEC-08: todos sus casos tienen prueba
[OK]    SPEC-09: todos sus casos tienen prueba
[OK]    SPEC-10: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (136 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 1.00s
[OK]    catalogo-service (pytest) en verde
Test Suites: 3 passed, 3 total
Tests:       9 passed, 9 total
[OK]    ordenes-service en verde
Test Files  1 passed (1)
     Tests  6 passed (6)
[OK]    frontend (vitest) en verde

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)
[OK]    Manifiestos YAML válidos en infra/k8s/ (offline)
[WARN]  Sin contexto kubeconfig activo: se omite kubectl apply --dry-run=client

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
