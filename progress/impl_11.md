# Implementación Feature 11 — `aws-terraform-k3s` (`SPEC-07` / `specs-v2/07-aws-terraform-k3s.md`)

- **Agente:** `devops`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de revisión por `revisor`)
- **Fecha:** `2026-11-18`

## 1. Archivos tocados (todos declarados en `specs-v2/07-aws-terraform-k3s.md §2`)

- **Modificados:**
  - `infra/terraform/ec2/providers.tf`: añade `profile = var.aws_profile != "" ? var.aws_profile : null` sin credenciales fijas ni account IDs.
  - `infra/terraform/ec2/variables.tf`: agrega `aws_profile` (default `""`), actualiza default de `project_name` a `"ecommerce-k3s"`, agrega `allowed_k8s_api_cidr` (default `""` con `validation` para vacío o CIDR IPv4 válido) y `k3s_version` (default `"v1.31.4+k3s1"` con `validation` no vacío).
  - `infra/terraform/ec2/main.tf`: actualiza `aws_security_group.web` con ingress TCP `80` y `443` vía `var.allowed_http_cidr` más bloque `dynamic "ingress"` condicional para puerto `6443` (API k3s) únicamente cuando `var.allowed_k8s_api_cidr != ""` (cerrado por defecto, sin puerto `22` ni `5432`); mantiene `t3.small` mínimo, IMDSv2 (`http_tokens = "required"`), EBS `gp3` cifrado (`>= 30` GiB), IAM SSM (`AmazonSSMManagedInstanceCore`), EIP y pasa `project_dir = "/opt/ecommerce"` y `k3s_version = var.k3s_version` a `user-data.sh.tftpl`.
  - `infra/terraform/ec2/outputs.tf`: expone los 5 outputs del contrato (`public_ip`, `url`, `instance_id`, `aws_region`, `ssm_connect_command`).
  - `infra/terraform/ec2/terraform.tfvars.example`: incluye `aws_profile = ""`, `project_name = "ecommerce-k3s"`, `allowed_k8s_api_cidr = ""` y `k3s_version = "v1.31.4+k3s1"`, sin secretos ni creación de `terraform.tfvars`.
  - `infra/terraform/ec2/user-data.sh.tftpl`: bootstrap idempotente con log en `/var/log/user-data-bootstrap.log`, verifica `systemctl is-active --quiet k3s`, instala k3s (`curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="${k3s_version}" sh -s - --write-kubeconfig-mode 644`), configura `KUBECONFIG` en `/etc/profile.d/k3s.sh` y `/home/ec2-user/.kube/config`, espera y verifica `kubectl get nodes`, y crea `/opt/ecommerce/k8s`.
  - `infra/terraform/ec2/README.md`: guía paso a paso para cuenta AWS propia (`aws configure` / `aws_profile`), `terraform init/fmt/validate/plan/apply`, conexión SSM, aplicación de `infra/k8s/`, creación segura de Secrets con `kubectl create secret` y `terraform destroy`.
- **Nuevo:**
  - `.github/workflows/ci-cd.yml`: job `ci` con `db-catalogo` y `db-ordenes` aislados (PostgreSQL 16), `pytest` (`catalogo-service`), `npm test` (`ordenes-service`), `npm test` + `npm run build` (`frontend`), validación YAML de `infra/k8s/*.yaml` y `terraform fmt -check` / `init -backend=false` / `validate`; job `cd` en `main` con `environment: production` (aprobación manual) para build & push a GHCR (`catalogo-service`, `ordenes-service`, `ecommerce-frontend`).

## 2. Cumplimiento de reglas y verificaciones (`TFK-R01..R04`, `TFK-V01..V03`)

- **TFK-R01 / TFK-V01:** Cero credenciales AWS, tokens ni account IDs en el repositorio; `providers.tf` y `variables.tf` soportan `var.aws_profile` opcional o credenciales locales; `.gitignore` excluye `.terraform/`, `*.tfstate*`, `*.tfvars` (salvo `*.tfvars.example`), `*.pem` y `*.key`.
- **TFK-R02 / TFK-V02:** `main.tf` mantiene `http_tokens = "required"` (IMDSv2), `root_block_device` `gp3` cifrado (`>= 30` GiB) y perfil IAM `AmazonSSMManagedInstanceCore` sin SSH `22` ni PostgreSQL `5432` expuestos; `user-data.sh.tftpl` instala k3s de forma idempotente.
- **TFK-R03:** Puerto `6443` bloqueado por defecto (`allowed_k8s_api_cidr = ""`) mediante `dynamic "ingress"`.
- **TFK-R04:** No se ejecutó `terraform apply` ni `terraform destroy`.
- **TFK-V03:** `.github/workflows/ci-cd.yml` cubre pruebas de Python (`catalogo-service`), Node (`ordenes-service`), React (`frontend` test + build), validación YAML `infra/k8s/` y checks de Terraform.

## 3. Evidencia de validación

1. **Sintaxis YAML de `.github/workflows/ci-cd.yml` (`yaml.safe_load`):**
   - Comando: `python -c "import yaml, glob; d = yaml.safe_load(open('.github/workflows/ci-cd.yml', encoding='utf-8')); print('CI/CD YAML OK -> jobs:', list(d['jobs'].keys()))"`
   - Resultado: `CI/CD YAML OK -> jobs: ['ci', 'cd']` (exit `0`).
2. **Sintaxis Bash de `infra/terraform/ec2/user-data.sh.tftpl`:**
   - Comando: `"C:\Program Files\Git\bin\bash.exe" -n infra/terraform/ec2/user-data.sh.tftpl`
   - Resultado: `BASH SYNTAX OK (exit=0)`.
3. **Verificación del arnés y pruebas (`"C:\Program Files\Git\bin\bash.exe" init.sh --rapido`):**
   - Specs intactas (`16 archivos`), `feature_list.json` válido (`in_progress=1`, `done=11`), alcance correcto (`138 archivos revisados`).
   - `catalogo-service`: `11 passed in 0.81s` (`pytest`).
   - `ordenes-service`: `3 passed, 9 tests` (`jest`).
   - `frontend`: `1 passed, 6 tests` (`vitest`).
   - `infra/k8s/`: `Manifiestos YAML válidos en infra/k8s/ (offline)`.
   - `terraform`: `[WARN] terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)` — la CLI de Terraform en este host Windows no es ejecutable y Docker daemon no está activo, por lo que `fmt`/`validate` se verificaron mediante revisión manual de HCL y quedan automatizados en `.github/workflows/ci-cd.yml`.
   - Resumen final: `[OK] Entorno listo (verificación rápida).` (exit `0`).
