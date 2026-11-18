# Specs generales de ecommerce-k8s

En `specs-v2/` viven **solo** las specs generales/transversales (contratos compartidos, frontend, Docker, Kubernetes y Terraform AWS). Cada microservicio organiza sus specs internas **por módulo** dentro de su propia carpeta:
- `services/catalogo-service/specs/<modulo>/*.md` (`core/`, `productos/`)
- `services/ordenes-service/specs/<modulo>/*.md` (`core/`, `ordenes/`)

## Reglas SDD (Spec-Driven Development)

1. **Sin duplicación:** los contratos compartidos entre servicios/frontend viven únicamente en `01-proyecto-contratos.md §5`. Las specs por módulo solo los citan.
2. **Límite estricto:** máximo **150 líneas** por archivo `.md` y **6 secciones fijas** (`## 1.` .. `## 6.`). `.harness/specs.js` falla si se supera.
3. **Cambio de spec → refactorización:** si el humano edita una spec y regenera `.harness/specs.sha256`, marca esa feature `reabierta` (`"retrabajo": true`) en `feature_list.json` y el `leader` relanza a los subagentes para refactorizar código y pruebas obsoletas.

## Índice general

- [00-infra-terraform-base](00-infra-terraform-base.md) · TFB · Base Terraform EC2 (`done`)
- [01-proyecto-contratos](01-proyecto-contratos.md) · PRY · Reglas globales, contratos únicos y Compose base
- `../services/catalogo-service/specs/` · `core/` (`01`) y `productos/` (`01`, `02`)
- `../services/ordenes-service/specs/` · `core/` (`01`) y `ordenes/` (`01`, `02`)
- [04-frontend](04-frontend.md) · FE · Frontend React + Vite + Nginx
- [05-contenedores-local](05-contenedores-local.md) · CNT · Dockerfiles, Nginx e integración local
- [06-kubernetes](06-kubernetes.md) · K8S · Manifiestos Kubernetes (`infra/k8s/`)
- [07-aws-terraform-k3s](07-aws-terraform-k3s.md) · TFK · Terraform AWS k3s + CI/CD
- [manifest.yaml](manifest.yaml) · Catálogo de servicios, módulos e infra
