# Review — SPEC-11 aws-terraform-k3s

**Veredicto:** APROBADO CON OBSERVACIONES

## Reglas
- [x] PRY-R01 — Aislamiento estricto de servicios y BDs: `.github/workflows/ci-cd.yml:20-47,65-86` levanta instancias `postgres:16-alpine` independientes (`db-catalogo` en `5433:5432` y `db-ordenes` en `5434:5432`) para `pytest` y `jest`; verificado sin referencias cruzadas en `services/ordenes-service/src/` ni `services/catalogo-service/app/`.
- [x] PRY-R06 — Cero credenciales reales ni archivos sensibles versionados; `.gitignore:2,8-22` excluye `.env`, `.terraform/`, `*.tfstate`, `*.tfstate.*`, `*.tfvars` (excepto `*.tfvars.example`), `*.pem` y `*.key` (validado con `git check-ignore -v`).
- [x] PRY-R08 — Specs intactas y conformes (`.harness/specs.sha256` validado por `init.sh`: `<= 150` líneas, `6` secciones, `16` archivos).
- [x] TFK-R01 — Cero credenciales AWS, account IDs ni tokens en el código; `infra/terraform/ec2/providers.tf:1-3` y `infra/terraform/ec2/variables.tf:7-11` soportan `var.aws_profile` opcional o cadena estándar local (`AWS_PROFILE` / `aws configure`), y `infra/terraform/ec2/terraform.tfvars.example:1-8` solo contiene defaults sin secretos ni `terraform.tfvars` en el repo.
- [x] TFK-R02 — `infra/terraform/ec2/main.tf:131-164` mantiene IMDSv2 obligatorio (`metadata_options { http_endpoint = "enabled"; http_tokens = "required" }` en líneas `144-147`), `root_block_device` `gp3` cifrado (`encrypted = true`, `volume_size = var.root_volume_size` con `>= 30` GiB validado en `variables.tf:37-46`) y administración vía SSM (`aws_iam_role.ssm` + `AmazonSSMManagedInstanceCore` + `aws_iam_instance_profile.ssm` en líneas `116-129`); `aws_security_group.web` (`main.tf:60-103`) no abre puerto `22` (SSH) ni `5432`.
- [x] TFK-R03 — Puerto `6443` (API k3s) cerrado por defecto (`allowed_k8s_api_cidr` default `""` en `variables.tf:59-68`) y solo habilitado mediante `dynamic "ingress"` cuando `var.allowed_k8s_api_cidr != ""` (`main.tf:81-90`).
- [x] TFK-R04 — Ningún agente ejecutó `terraform apply` ni `terraform destroy`.
- [x] Contrato §5 (`specs-v2/07-aws-terraform-k3s.md §5`) — `infra/terraform/ec2/outputs.tf:1-24` expone exactamente los 5 outputs requeridos: `public_ip`, `url` (`http://${aws_eip.app.public_ip}`), `instance_id`, `aws_region` y `ssm_connect_command`.
- [x] §2 (`specs-v2/07-aws-terraform-k3s.md §2`) — Los 8 archivos declarados existen y coinciden 1:1 con la spec: `infra/terraform/ec2/{providers.tf,variables.tf,main.tf,outputs.tf,terraform.tfvars.example,user-data.sh.tftpl,README.md}` y `.github/workflows/ci-cd.yml`; además `infra/terraform/ec2/README.md:198-210` documenta `terraform destroy -var-file="terraform.tfvars"`.

## Casos de prueba / Verificaciones
- [x] TFK-V01 — `infra/terraform/ec2/providers.tf:1-12` y `infra/terraform/ec2/variables.tf:7-79` soportan `aws_profile`, `project_name` (`"ecommerce-k3s"`), `allowed_k8s_api_cidr` (validación CIDR IPv4 o vacío) y `k3s_version` (`"v1.31.4+k3s1"`) sin credenciales fijas.
- [x] TFK-V02 — `infra/terraform/ec2/user-data.sh.tftpl:1-42` instala k3s de forma idempotente (`systemctl is-active --quiet k3s`), configura `KUBECONFIG` en `/etc/profile.d/k3s.sh` y `/home/ec2-user/.kube/config`, espera a `kubectl get nodes` (`Ready`) y prepara `/opt/ecommerce/k8s` (validado con `bash -n`, exit `0`); `infra/terraform/ec2/main.tf:131-164` mantiene `t3.small`, IMDSv2, SSM y EBS `gp3` cifrado.
- [x] TFK-V03 — `.github/workflows/ci-cd.yml:15-163` valida sintaxis YAML (`yaml.safe_load` -> jobs `['ci', 'cd']`) y ejecuta pruebas de Python (`pytest -v`), Node (`npm test`), Frontend (`npm test` + `npm run build`), validación YAML de `infra/k8s/*.yaml`, checks de Terraform (`fmt -check`, `init -backend=false`, `validate`) y CD a GHCR (`catalogo-service`, `ordenes-service`, `ecommerce-frontend`, alineados con `infra/k8s/05..07`) bajo `environment: production` (aprobación manual).
- [ ] Validación CLI local de Terraform (`terraform fmt -check` y `terraform validate`) — **Observación:** El binario `D:\TERRAFON\terraform.exe` presente en este host Windows no es un ejecutable válido (`init.sh` emite `[WARN] terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)`). Se auditó manualmente la sintaxis HCL2, el alineamiento `fmt`, las funciones/interpolaciones de `templatefile` y la consistencia entre `variables.tf`, `main.tf`, `outputs.tf` y `user-data.sh.tftpl`; la validación automática con `hashicorp/setup-terraform@v3` queda configurada en `.github/workflows/ci-cd.yml:99-108`.

## Checkpoints
- C1: [x]  C2: [x]  C3: [x]  C4: [x]  C5: [x] *(con observación de entorno para `terraform` CLI en host Windows y `kubectl dry-run` sin kubeconfig activo)*

## Observaciones (no bloqueantes)
1. `init.sh:140-150` — `D:\TERRAFON\terraform.exe` falla al ejecutarse en este host Windows, por lo que `terraform fmt -check` y `terraform validate` deben verificarse en GitHub Actions (`.github/workflows/ci-cd.yml:99-108`) o en un entorno con `terraform >= 1.6.0, < 2.0.0` funcional antes de ejecutar `terraform apply`.

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
[OK]    feature_list.json válido (12 features: pending=0 in_progress=0 done=12 blocked=0 reabierta=0)
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
[OK]    SPEC-11: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (139 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
11 passed in 0.94s
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
