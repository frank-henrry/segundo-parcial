# Verificación — Cómo demostrar que cada capa funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra con evidencia ejecutable.**

## Nivel 0 — Arnés (siempre)

```bash
bash init.sh            # verifica arnés, specs, alcance y corre pruebas disponibles
bash init.sh --rapido   # verificación rápida usada por hooks
```

## Nivel 1 y 2 — Pruebas por componente

- **`catalogo-service` (Python + PostgreSQL `db-catalogo`):**
  ```bash
  docker compose up -d db-catalogo
  cd services/catalogo-service && pytest -v
  ```
- **`ordenes-service` (Node.js + PostgreSQL `db-ordenes` + `nock`):**
  ```bash
  docker compose up -d db-ordenes
  cd services/ordenes-service && npm test
  ```
- **`frontend` (React + Vite + Vitest):**
  ```bash
  cd frontend && npm test && npm run build
  ```

## Nivel 3 — E2E con Docker Compose

```bash
docker compose up -d --build
curl -s http://localhost:8081/api/catalogo/health
curl -s http://localhost:8081/api/ordenes/health
```

## Nivel 4 — Kubernetes & Terraform (sin aplicar cambios reales sin permiso)

```bash
kubectl apply --dry-run=client -f infra/k8s/
terraform -chdir=infra/terraform/ec2 fmt -check
terraform -chdir=infra/terraform/ec2 init -backend=false
terraform -chdir=infra/terraform/ec2 validate
```
