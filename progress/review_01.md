# Review — SPEC-01 proyecto-contratos

**Veredicto:** APROBADO

## Reglas
- [x] PRY-R01 — `docker-compose.yml:1-52` define `db-catalogo` (`5433:5432`, volumen `db_catalogo_data`, red `catalogo-net`) y `db-ordenes` (`5434:5432`, volumen `db_ordenes_data`, red `ordenes-net`) como instancias PostgreSQL completamente aisladas.
- [x] PRY-R02 — `docs/api-contracts.md:13` documenta el patrón de capas limpias internas para los microservicios (`SPEC-02`..`SPEC-07`).
- [x] PRY-R03 — `docs/api-contracts.md:14,27,40` refleja exactamente `GET /health` → `200 { status, service, db }` | `503` conforme a `specs-v2/01-proyecto-contratos.md §4 y §5`.
- [x] PRY-R04 — `docs/api-contracts.md:15` documenta `NUMERIC(12,2)`, `Decimal` en código y string con 2 decimales en JSON (sin `float` para totales).
- [x] PRY-R05 — `docs/api-contracts.md:16` documenta SQL 100 % parametrizado (`%s` en Python/`psycopg`, `$1/$2` en Node/`pg`).
- [x] PRY-R06 — `docker-compose.yml:6-9,27-30` inyecta las variables locales directamente en `environment` sin depender de archivo `.env`; `.gitignore:2,8-22` excluye `.env`, `.terraform/`, `*.tfstate*`, `*.tfvars`, `*.pem`, `*.key`; sin credenciales AWS reales ni claves privadas en el repositorio.
- [x] PRY-R07 — `docs/api-contracts.md:18` documenta el formato único de error JSON `{ "error": { "codigo": "CODIGO_UPPER", "mensaje": "Texto legible" } }`.
- [x] PRY-R08 — `specs-v2/` y `services/*/specs/` permanecen intactos (`.harness/specs.sha256` verificado por `init.sh`, 16 archivos `<= 150` líneas y 6 secciones); `docs/api-contracts.md:3-4` referencia `specs-v2/01-proyecto-contratos.md` como fuente única de verdad y coincide 1:1 con §5 (`docs/api-contracts.md:23-45`).

## Casos de prueba
- [x] `docker compose config --quiet` — exit code 0 sin errores de sintaxis o interpolación.
- [x] Validación de alcance §2 — únicamente creados `docker-compose.yml` (`postgres:16-alpine`, `db-catalogo` en `5433`, `db-ordenes` en `5434`, healthchecks `pg_isready`, sin `.env`) y `docs/api-contracts.md`, alineados con `progress/impl_01.md`.
- [x] `init.sh` reporta `[OK] SPEC-01: todos sus casos tienen prueba`.

## Checkpoints
- C1: [x]  C2: [x]  C3: [x]  C4: [x]  C5: [x]

## Cambios requeridos (si aplica)
Ninguno. Feature id `1` (`proyecto-contratos`) marcada como `done` en `feature_list.json`.

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
[OK]    feature_list.json válido (12 features: pending=10 in_progress=0 done=2 blocked=0 reabierta=0)
[OK]    SPEC-00: todos sus casos tienen prueba
[OK]    SPEC-01: todos sus casos tienen prueba
[OK]    Alcance de archivos correcto (57 archivos revisados)

── 4. Pruebas de servicios y frontend ──────────────────
[WARN]  Servicios y frontend aún no implementados (SPEC-02..04 pending): sin suites por correr

── 4b. Verificando IaC (Terraform y Kubernetes) ────────
[WARN]  terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```
