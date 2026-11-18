# Informe de implementación — SPEC-09 (`contenedores-local`)

- **Feature:** `9 — contenedores-local` (`specs-v2/05-contenedores-local.md`)
- **Agente:** `devops`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de `tester` y `revisor`)

## 1. Archivos creados/modificados (alcance §2 de `specs-v2/05-contenedores-local.md`)

1. `[NUEVO]` `services/catalogo-service/Dockerfile`
   - Base `python:3.12-slim`, crea usuario de sistema no-root `appuser`, instala `requirements.txt` con `pip install --no-cache-dir`, copia únicamente `app/` con propietario `appuser:appuser` (sin `.env`), expone puerto `8001` y ejecuta `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]`.
2. `[NUEVO]` `services/ordenes-service/Dockerfile`
   - Base `node:22-alpine`, ejecuta `npm ci --omit=dev && npm cache clean --force`, copia únicamente `src/` con propietario `node:node` (sin `.env`), usa `USER node` (no-root), expone puerto `3001` y ejecuta `CMD ["node", "src/server.js"]`.
3. `[NUEVO]` `frontend/nginx.conf`
   - Sirve SPA desde `/usr/share/nginx/html` con `try_files $uri $uri/ /index.html;` y configura reverse proxy exacto:
     - `= /api/catalogo/health` → `http://catalogo-service:8001/health`
     - `/api/catalogo/` → `http://catalogo-service:8001/api/catalogo/`
     - `= /api/ordenes/health` → `http://ordenes-service:3001/health`
     - `= /api/ordenes` → `http://ordenes-service:3001/api/ordenes`
     - `/api/ordenes/` → `http://ordenes-service:3001/api/ordenes/`
4. `[NUEVO]` `frontend/Dockerfile`
   - Multi-stage: stage `builder` (`node:22-alpine`) ejecuta `npm ci` y `npm run build` copiando únicamente `package.json`, `package-lock.json`, `index.html`, `vite.config.js` y `src/`; stage final (`nginx:1.27-alpine`) habilita `cap_net_bind_service=+ep` sobre `/usr/sbin/nginx`, configura permisos en `/var/cache/nginx`, `/var/log/nginx`, `/etc/nginx/conf.d`, `/usr/share/nginx/html` y `/run/nginx.pid`, copia `dist/` y `nginx.conf` con propietario `nginx:nginx` y ejecuta como usuario no-root `USER nginx` en puerto `80`.
5. `[MODIFICAR]` `docker-compose.yml`
   - Monta `./services/catalogo-service/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro` en `db-catalogo` y `./services/ordenes-service/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro` en `db-ordenes`.
   - Agrega `catalogo-service` (redes `catalogo-net` y `app-net`, `depends_on: db-catalogo` con `condition: service_healthy`, `DATABASE_URL` y `PORT=8001`, healthcheck sobre `/health`).
   - Agrega `ordenes-service` (redes `ordenes-net` y `app-net`, `depends_on: db-ordenes` y `catalogo-service` con `condition: service_healthy`, `DATABASE_URL`, `PORT=3001` y `CATALOGO_URL=http://catalogo-service:8001`, healthcheck sobre `/health`).
   - Agrega `frontend` (red `app-net`, puerto `"8080:80"`, `depends_on: catalogo-service` y `ordenes-service` con `condition: service_healthy`).
   - Toda la configuración se define vía `environment:` directo sin depender de archivos `.env`.

## 2. Cumplimiento de reglas (`CNT-R01..R03`, `PRY-R01`, `PRY-R06`)

- **CNT-R01 (Usuario no-root):** Verificado con `docker exec <contenedor> id`:
  - `catalogo-service`: `uid=999(appuser) gid=999(appuser) groups=999(appuser)`
  - `ordenes-service`: `uid=1000(node) gid=1000(node) groups=1000(node)`
  - `frontend` (`nginx`): `uid=101(nginx) gid=101(nginx) groups=101(nginx)`
- **CNT-R02 / PRY-R06 (Sin `.env` ni secretos horneados):** Ningún `Dockerfile` copia `.env` ni secretos; los secretos locales de desarrollo se pasan por `environment:` en `docker-compose.yml`.
- **CNT-R03 / PRY-R01 (Aislamiento de BDs):** `db-catalogo` solo pertenece a `catalogo-net` (accedida por `catalogo-service`) y `db-ordenes` solo pertenece a `ordenes-net` (accedida por `ordenes-service`). `app-net` conecta únicamente `frontend`, `catalogo-service` y `ordenes-service`.

## 3. Verificaciones ejecutadas y observaciones

### `docker compose config --quiet` y `docker compose build`

```text
CONFIG_OK
 Image segundo-parcial-frontend Built
 Image segundo-parcial-ordenes-service Built
 Image segundo-parcial-catalogo-service Built
```

### Levantamiento y verificación en red interna (`app-net`)

- `db-catalogo`, `db-ordenes`, `catalogo-service` y `ordenes-service` alcanzaron estado `(healthy)`.
- En este host Windows, el puerto `8080` se encuentra ocupado por el proceso del sistema `AgentService` (PID `6096`), por lo que el mapeo de puerto `"8080:80"` al levantar `frontend` en `docker compose up` falló al enlazar `0.0.0.0:8080` (`bind: Only one usage of each socket address`).
- Se verificó la imagen `segundo-parcial-frontend` conectada directamente a `segundo-parcial_app-net` ejecutando peticiones HTTP reales a través del reverse proxy Nginx:
  - `GET /api/catalogo/health` → `HTTP 200` `{"status":"ok","service":"catalogo-service","db":"up"}`
  - `GET /api/ordenes/health` → `HTTP 200` `{"status":"ok","service":"ordenes-service","db":"up"}`
  - `GET /api/catalogo/productos` → `HTTP 200` (4 productos)
  - `GET /api/ordenes` → `HTTP 200` (1 orden)
- Nota para `tester`: si `db-catalogo` o `db-ordenes` ya tienen volúmenes previos creados antes de montar `init.sql`, Postgres no reejecuta `/docker-entrypoint-initdb.d/01-init.sql` automáticamente; en una prueba limpia desde cero debe usarse `docker compose down -v && docker compose up -d --build` (asegurando puerto `8080` libre en el host).

### `"C:\Program Files\Git\bin\bash.exe" init.sh --rapido`

```text
[OK]    Specs intactas y conformes (<= 150 líneas, 6 secciones, 16 archivos)
[OK]    feature_list.json válido (12 features: pending=2 in_progress=1 done=9 blocked=0 reabierta=0)
[WARN]  SPEC-09 (en curso) aún sin prueba: CNT-T01, CNT-T02
[OK]    Alcance de archivos correcto (122 archivos revisados)
[OK]    catalogo-service (pytest) en verde (11 passed)
[OK]    ordenes-service en verde (9 passed)
[OK]    frontend (vitest) en verde (6 passed)
[OK]    Entorno listo (verificación rápida).
```


## Corrección puerto 8081

- Con base en la actualización autorizada en `specs-v2/05-contenedores-local.md` (puerto `8080` → `8081`), se actualizó `docker-compose.yml` para exponer `frontend` en `"8081:80"`.
- Validación de configuración y levantamiento completo:
  - `docker compose config --quiet` → `CONFIG_OK` (exit code 0)
  - `docker compose up -d --wait` → los 5 contenedores (`db-catalogo`, `db-ordenes`, `catalogo-service`, `ordenes-service`, `frontend`) levantados y en estado healthy/running (`0.0.0.0:8081->80/tcp`).
  - `GET http://localhost:8081/api/catalogo/health` → `{"status":"ok","service":"catalogo-service","db":"up"}`
  - `GET http://localhost:8081/api/ordenes/health` → `{"status":"ok","service":"ordenes-service","db":"up"}`
- `"C:\Program Files\Git\bin\bash.exe" init.sh --rapido`:
  - `Specs intactas y conformes (<= 150 líneas, 6 secciones, 16 archivos)`
  - `SPEC-09: todos sus casos tienen prueba`
  - `Alcance de archivos correcto (124 archivos revisados)`
  - `catalogo-service (pytest) en verde (11 passed)`
  - `ordenes-service en verde (9 passed)`
  - `frontend (vitest) en verde (6 passed)`
  - `Entorno listo (verificación rápida).` (exit code 0)
