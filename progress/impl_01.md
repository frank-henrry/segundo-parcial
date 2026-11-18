# Informe de implementación — SPEC-01 (`proyecto-contratos`)

- **Feature:** `1 — proyecto-contratos` (`specs-v2/01-proyecto-contratos.md`)
- **Agente:** `devops`
- **Estado en `feature_list.json`:** `in_progress` (pendiente de revisión)

## 1. Archivos creados (alcance §2 de `specs-v2/01-proyecto-contratos.md`)

1. `docker-compose.yml`
   - Servicio `db-catalogo`: imagen `postgres:16-alpine`, puerto host `5433:5432`, variables locales definidas directamente en `environment` (`POSTGRES_DB=catalogo`, `POSTGRES_USER=catalogo_user`, `POSTGRES_PASSWORD=catalogo_local_password`), volumen propio `db_catalogo_data`, red aislada `catalogo-net` y healthcheck `pg_isready -U catalogo_user -d catalogo`.
   - Servicio `db-ordenes`: imagen `postgres:16-alpine`, puerto host `5434:5432`, variables locales definidas directamente en `environment` (`POSTGRES_DB=ordenes`, `POSTGRES_USER=ordenes_user`, `POSTGRES_PASSWORD=ordenes_local_password`), volumen propio `db_ordenes_data`, red aislada `ordenes-net` y healthcheck `pg_isready -U ordenes_user -d ordenes`.
   - Sin dependencia de archivo `.env` ni secretos AWS reales.
2. `docs/api-contracts.md`
   - Índice legible hacia `specs-v2/01-proyecto-contratos.md` (§4 y §5) y `specs-v2/manifest.yaml`.
   - Resume reglas globales `PRY-R01..R08`, endpoints HTTP de `catalogo-service` (`:8001`) y `ordenes-service` (`:3001`), y referencia de las 2 bases de datos locales en `docker-compose.yml`.

## 2. Cumplimiento de reglas (`PRY-R01` .. `PRY-R08`)

- **PRY-R01 (Aislamiento estricto):** `db-catalogo` y `db-ordenes` corren en contenedores PostgreSQL separados, con puertos (`5433` y `5434`), credenciales, volúmenes (`db_catalogo_data`, `db_ordenes_data`) y redes (`catalogo-net`, `ordenes-net`) independientes.
- **PRY-R02 (Capas limpias internas):** Referenciada en `docs/api-contracts.md` (aplica a servicios de negocio en `SPEC-02`..`SPEC-07`).
- **PRY-R03 (Healthcheck estándar `/health`):** Documentado en `docs/api-contracts.md` conforme a `specs-v2/01-proyecto-contratos.md §4 y §5`.
- **PRY-R04 (Dinero con `NUMERIC(12,2)` / `Decimal`):** Documentado en `docs/api-contracts.md`.
- **PRY-R05 (SQL parametrizado):** Documentado en `docs/api-contracts.md`.
- **PRY-R06 (Configuración vía `environment` sin `.env`, sin credenciales reales):** `docker-compose.yml` define las variables locales directamente en `environment` de cada servicio sin usar `.env` ni credenciales AWS reales.
- **PRY-R07 (Formato único de error JSON):** Documentado en `docs/api-contracts.md`.
- **PRY-R08 (Specs de solo lectura / SDD):** No se modificó ningún archivo en `specs-v2/` ni `services/*/specs/`, y `docs/api-contracts.md` apunta a `specs-v2/01-proyecto-contratos.md` como fuente única de verdad.

## 3. Salidas de validación

### `docker compose config --quiet`

```text
Command exited with code 0.
(No output from the command.)
```

### `"C:\Program Files\Git\bin\bash.exe" init.sh --rapido`

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
[OK]    feature_list.json válido (12 features: pending=10 in_progress=1 done=1 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (55 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
[WARN]  Servicios y frontend aún no implementados (SPEC-02..04 pending): sin suites por correr

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo (verificación rápida).
```
