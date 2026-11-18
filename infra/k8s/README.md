# Manifiestos Kubernetes (`infra/k8s/`) — ecommerce-k8s

Despliegue declarativo en **k3s** (Ingress Controller **Traefik** incluido) dentro del namespace `ecommerce`, con dos instancias PostgreSQL aisladas (`db-catalogo` y `db-ordenes`), los microservicios `catalogo-service` y `ordenes-service`, y el `frontend`.

## Requisitos previos

- Clúster Kubernetes / **k3s** operativo con Traefik Ingress Controller y almacenamiento dinámico (`StorageClass` por defecto, p. ej. `local-path` en k3s).
- `kubectl` configurado apuntando al clúster.
- Imágenes publicadas en GHCR (o sustituidas con `<OWNER>` y `<TAG>` reales en `05-catalogo-service.yaml`, `06-ordenes-service.yaml` y `07-frontend.yaml`):
  - `ghcr.io/<OWNER>/catalogo-service:<TAG>`
  - `ghcr.io/<OWNER>/ordenes-service:<TAG>`
  - `ghcr.io/<OWNER>/ecommerce-frontend:<TAG>`

## Seguridad de Secrets (K8S-R01)

El archivo `02-secrets.example.yaml` es **únicamente una plantilla de referencia** con placeholders (`<CAMBIAR_PASSWORD_CATALOGO>`, `<CAMBIAR_PASSWORD_ORDENES>`).

- **Nunca** modifiques `02-secrets.example.yaml` con contraseñas reales ni versiones Secrets con credenciales en Git.
- Crea los `Secret` reales directamente en el clúster con `kubectl create secret` (Paso 2).

## Orden de aplicación

```bash
# 1. Crear el namespace
kubectl apply -f infra/k8s/00-namespace.yaml

# 2. Crear los Secrets reales sin escribir credenciales en archivos versionados
kubectl create secret generic db-catalogo-secret \
  -n ecommerce \
  --from-literal=POSTGRES_PASSWORD='CAMBIAR_POR_PASSWORD_SEGURO_CATALOGO'

kubectl create secret generic db-ordenes-secret \
  -n ecommerce \
  --from-literal=POSTGRES_PASSWORD='CAMBIAR_POR_PASSWORD_SEGURO_ORDENES'

# 3. Aplicar configuración no sensible (puertos, CATALOGO_URL, usuarios y nombres de BD)
kubectl apply -f infra/k8s/01-configmap.yaml

# 4. Desplegar ambas bases de datos PostgreSQL aisladas (StatefulSet + PVC 2Gi + ClusterIP)
kubectl apply -f infra/k8s/03-db-catalogo.yaml
kubectl apply -f infra/k8s/04-db-ordenes.yaml

# Esperar a que ambos StatefulSets estén listos
kubectl rollout status statefulset/db-catalogo -n ecommerce
kubectl rollout status statefulset/db-ordenes -n ecommerce

# 5. Desplegar los microservicios y el frontend (sustituyendo <OWNER> y <TAG> si aplica)
kubectl apply -f infra/k8s/05-catalogo-service.yaml
kubectl apply -f infra/k8s/06-ordenes-service.yaml
kubectl apply -f infra/k8s/07-frontend.yaml

# 6. Aplicar el Ingress de Traefik
kubectl apply -f infra/k8s/08-ingress.yaml
```

> Nota: Si necesitas reemplazar `<OWNER>` y `<TAG>` en vuelo sin editar los manifiestos locales, puedes renderizar con `sed` antes de aplicar:
> `sed "s|<OWNER>|tu-usuario|g; s|<TAG>|latest|g" infra/k8s/05-catalogo-service.yaml | kubectl apply -f -`

## Verificación

```bash
# Validar sintaxis y esquema localmente sin aplicar cambios
kubectl apply --dry-run=client -f infra/k8s/

# Comprobar estado de recursos en el clúster
kubectl get pods,svc,pvc,ingress -n ecommerce

# Comprobar enrutamiento vía Traefik
curl -s http://<PUBLIC_IP>/api/catalogo/health
curl -s http://<PUBLIC_IP>/api/ordenes/health
curl -I http://<PUBLIC_IP>/
```
