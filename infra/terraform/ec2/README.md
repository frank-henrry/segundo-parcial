# Despliegue de ecommerce-k8s en AWS EC2 con k3s (Terraform)

Guía paso a paso para aprovisionar en **tu propia cuenta de AWS** una instancia EC2 (`t3.small` mínimo, 2 GB RAM) dentro de una VPC dedicada con IP elástica (EIP), IMDSv2 obligatorio, volumen raíz `gp3` cifrado (`>= 30 GiB`), administración vía **AWS Systems Manager (SSM)** y **k3s (Kubernetes + Traefik)** preinstalado para desplegar los manifiestos de `infra/k8s/`.

> **Regla de seguridad (TFK-R01..R04):**
> - Nunca guardes credenciales AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`), account IDs, claves `.pem` ni contraseñas en Git.
> - Nunca subas `terraform.tfvars` ni `*.tfstate*` (están excluidos en `.gitignore`).
> - No abras SSH (`22`) ni PostgreSQL (`5432`) a Internet. El puerto `6443` (API k3s) permanece **cerrado por defecto** (`allowed_k8s_api_cidr = ""`).

---

## 1. Requisitos previos

1. Cuenta AWS propia con permisos para VPC, EC2, IAM, SSM y Elastic IP.
2. [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) y [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) instalados localmente.
3. [Terraform CLI](https://developer.hashicorp.com/terraform/install) `>= 1.6.0, < 2.0.0`.
4. Imágenes de `catalogo-service`, `ordenes-service` y `ecommerce-frontend` publicadas en GHCR (automático en `main` tras aprobar el job `cd` de `.github/workflows/ci-cd.yml`).

---

## 2. Configurar acceso a tu cuenta AWS

Elige **una** de las dos opciones locales (ninguna escribe secretos en el repo):

### Opción A: Perfil dedicado (`var.aws_profile`)

```bash
# Credenciales IAM estándar
aws configure --profile mi-cuenta-aws

# O con IAM Identity Center (SSO)
aws sso login --profile mi-cuenta-aws
```

Luego coloca `aws_profile = "mi-cuenta-aws"` en tu `terraform.tfvars` local (ver paso 3).

### Opción B: Perfil por defecto o variables de entorno de sesión

```bash
aws configure
# o exporta AWS_PROFILE / credenciales temporales en tu terminal local
```

Deja `aws_profile = ""` en `terraform.tfvars` para que Terraform use la cadena estándar del SDK de AWS.

Verifica siempre la cuenta activa antes de continuar:

```bash
aws sts get-caller-identity
```

---

## 3. Preparar `terraform.tfvars` (local, no versionado)

Desde `infra/terraform/ec2/`:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edita `terraform.tfvars` y revisa cada valor:

- `aws_region`: región AWS deseada (default `"us-east-1"`).
- `aws_profile`: nombre de tu perfil AWS CLI local (o `""` si usas el entorno por defecto).
- `project_name`: prefijo de recursos y tags (default `"ecommerce-k3s"`).
- `instance_type`: `"t3.small"` mínimo (2 GB RAM para k3s + `db-catalogo` + `db-ordenes` + 3 pods).
- `root_volume_size`: `30` GiB mínimo (`gp3` cifrado).
- `allowed_http_cidr`: se recomienda restringir a tu IP pública en CIDR (p. ej. `"203.0.113.10/32"`) durante pruebas; `"0.0.0.0/0"` publica HTTP/HTTPS en Internet.
- `allowed_k8s_api_cidr`: déjalo en `""` (cerrado). Solo asígnale tu IP `/32` si necesitas usar `kubectl` remoto fuera de SSM.
- `k3s_version`: versión de k3s (default `"v1.31.4+k3s1"`).

---

## 4. Inicializar, validar y aplicar Terraform

```bash
cd infra/terraform/ec2

terraform init
terraform fmt -check
terraform validate
terraform plan -var-file="terraform.tfvars"
```

Revisa cuidadosamente la cuenta, región y recursos en el `plan`. Cuando estés seguro, aplica **sin** `-auto-approve`:

```bash
terraform apply -var-file="terraform.tfvars"
```

Al finalizar, consulta los outputs del contrato:

```bash
terraform output
```

Outputs expuestos:
- `public_ip`
- `url` (`http://<public_ip>`)
- `instance_id`
- `aws_region`
- `ssm_connect_command`

---

## 5. Conectarse vía SSM y verificar k3s

Espera ~2–3 minutos a que termine el bootstrap e inicia sesión por SSM (sin abrir puerto 22):

```bash
# Usa el comando exacto mostrado en `terraform output ssm_connect_command`
aws ssm start-session --target "$(terraform output -raw instance_id)" --region "$(terraform output -raw aws_region)"
```

Dentro de la instancia EC2, comprueba el log de bootstrap y el clúster k3s:

```bash
sudo tail -n 50 /var/log/user-data-bootstrap.log
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
kubectl get pods -A
```

El nodo debe aparecer en estado `Ready` y el pod de `traefik` en `kube-system` debe estar `Running`. El directorio `/opt/ecommerce/k8s` ya habrá sido creado.

---

## 6. Desplegar `infra/k8s/` en el clúster k3s

1. Copia los manifiestos de `infra/k8s/` del repositorio hacia `/opt/ecommerce/k8s` (por ejemplo clonando el repo en `/tmp/repo` y copiando `infra/k8s/*.yaml` a `/opt/ecommerce/k8s/` dentro de la sesión SSM):

   ```bash
   cd /opt/ecommerce/k8s
   ```

2. Crea el namespace:

   ```bash
   kubectl apply -f 00-namespace.yaml
   ```

3. **Crea los Secrets reales directamente en el clúster** (nunca apliques `02-secrets.example.yaml` con contraseñas reales en Git):

   ```bash
   kubectl create secret generic db-catalogo-secret \
     -n ecommerce \
     --from-literal=POSTGRES_PASSWORD='<PASSWORD_FUERTE_CATALOGO>'

   kubectl create secret generic db-ordenes-secret \
     -n ecommerce \
     --from-literal=POSTGRES_PASSWORD='<PASSWORD_FUERTE_ORDENES>'
   ```

   Si tus paquetes en GHCR son privados, crea también el `imagePullSecret` y referéncialo o configura autenticación de registry en k3s sin guardar tokens en Git.

4. Aplica la configuración no sensible y ambas bases de datos PostgreSQL aisladas:

   ```bash
   kubectl apply -f 01-configmap.yaml
   kubectl apply -f 03-db-catalogo.yaml
   kubectl apply -f 04-db-ordenes.yaml

   kubectl rollout status statefulset/db-catalogo -n ecommerce
   kubectl rollout status statefulset/db-ordenes -n ecommerce
   ```

5. Despliega los microservicios y el frontend sustituyendo `<OWNER>` (en minúsculas) y `<TAG>` (p. ej. `sha-<SHA>` o `latest`):

   ```bash
   export GHCR_OWNER='tu-owner-github'
   export IMAGE_TAG='latest'

   for f in 05-catalogo-service.yaml 06-ordenes-service.yaml 07-frontend.yaml; do
     sed "s|<OWNER>|${GHCR_OWNER}|g; s|<TAG>|${IMAGE_TAG}|g" "$f" | kubectl apply -f -
   done

   kubectl apply -f 08-ingress.yaml
   ```

6. Verifica pods, servicios e Ingress:

   ```bash
   kubectl get pods,svc,pvc,ingress -n ecommerce
   ```

   Desde tu máquina local, abre `terraform output -raw url` en el navegador o prueba los endpoints:

   ```bash
   URL=$(terraform output -raw url)
   curl -s "${URL}/api/catalogo/health"
   curl -s "${URL}/api/ordenes/health"
   curl -I "${URL}/"
   ```

---

## 7. Destruir recursos y evitar cargos (`terraform destroy`)

Cuando termines tus pruebas, elimina toda la infraestructura creada con Terraform (con el mismo `terraform.tfvars` y estado local):

```bash
cd infra/terraform/ec2
terraform destroy -var-file="terraform.tfvars"
```

> **Importante:**
> - Revisa el plan de destrucción y confirma manualmente cuando Terraform lo solicite.
> - Detener la instancia EC2 desde la consola **no** elimina la Elastic IP ni el volumen EBS (siguen generando cargos); usa `terraform destroy` para limpiar todos los recursos.
> - Destruir la instancia borra permanentemente el volumen raíz y los PVCs locales de `db-catalogo` y `db-ordenes`.
