# ecommerce-k8s — Proyecto Multi-Servicio con Arnés de Subagentes

Sistema E-Commerce ligero compuesto por **dos microservicios independientes en distintos lenguajes**, cada uno con su **propia base de datos PostgreSQL en Docker**, un **frontend React** que consulta ambos servicios y despliegue en **Kubernetes (k3s) sobre AWS con Terraform**.

## Arquitectura

| Componente | Stack | Base de Datos | Puerto |
|---|---|---|---|
| `services/catalogo-service/` | Python 3.12 + FastAPI | PostgreSQL 16 (`db-catalogo`) | `8001` |
| `services/ordenes-service/` | Node.js 22 + Express 4 | PostgreSQL 16 (`db-ordenes`) | `3001` |
| `frontend/` | React 18 + Vite + Nginx | — | `80` / `8080` |
| `infra/k8s/` | Kubernetes (StatefulSets, Deployments, Services, Ingress) | PVCs separados | `80` (Ingress) |
| `infra/terraform/ec2/` | Terraform AWS (VPC, EC2, k3s, IAM SSM, EIP) | — | — |

## Arnés y Subagentes

- **Orquestación:** `.claude/agents/leader.md` coordina a `desarrolladorback`, `desarrolladorfront`, `devops`, `tester` y `revisor`.
- **Fuente de verdad:** `specs-v2/` (solo lectura para agentes) + `feature_list.json` (`SPEC-00` a `SPEC-07`).
- **Verificación automática:** `.harness/` (`specs.js`, `validar-features.js`, `alcance.js`) ejecutado desde `bash init.sh`.

## Cómo empezar

1. Verifica el arnés: `bash init.sh`
2. Pide al agente `leader`: **«implementa la siguiente feature pendiente»** (empezando por `SPEC-01 · proyecto-contratos`).
3. Para desplegar en AWS con Terraform, configura tu propia cuenta/perfil local (`aws configure --profile ...` y `terraform.tfvars` local ignorado por Git).
