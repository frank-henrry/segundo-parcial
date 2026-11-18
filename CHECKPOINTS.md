# CHECKPOINTS — Evaluación del estado final

> Checkpoints objetivos que un juez (humano o IA) usa para decidir si **ecommerce-k8s** está sano.
> Los marcados con ⚙ los verifica `init.sh` automáticamente.

## C1 — El arnés está completo

- [ ] ⚙ Existen `AGENTS.md`, `CLAUDE.md`, `init.sh`, `feature_list.json`, `progress/current.md`,
      `progress/history.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`.
- [ ] ⚙ Existen los 6 agentes en `.claude/agents/` (`leader`, `desarrolladorback`,
      `desarrolladorfront`, `devops`, `tester`, `revisor`).
- [ ] ⚙ `bash init.sh` termina con exit code 0.

## C2 — El estado es coherente

- [ ] ⚙ Como mucho una feature en `in_progress`.
- [ ] ⚙ Ninguna feature `done` / `in_progress` tiene dependencias sin `done`.
- [ ] `progress/current.md` está vacío o describe la sesión activa.

## C3 — El alcance se respeta

- [ ] ⚙ Todas las specs (`specs-v2/` y `services/*/specs/`) están intactas (`.harness/specs.sha256`),
      tienen `<= 150` líneas y conservan sus 6 secciones fijas.
- [ ] ⚙ Todo archivo del proyecto está declarado en el §2 de alguna spec o convención de tests.
- [ ] ⚙ Ningún archivo pertenece a una spec que sigue en `pending`.

## C4 — Arquitectura y seguridad (lo verifica el revisor)

- [ ] PRY-R01: `catalogo-service` y `ordenes-service` usan instancias PostgreSQL totalmente separadas.
- [ ] PRY-R04: dinero/precios con `Decimal` y `NUMERIC(12,2)`, nunca `float` para totales.
- [ ] PRY-R05: todo SQL parametrizado (`%s` en Python, `$1` en Node).
- [ ] PRY-R06 / FE-R01: cero credenciales en el repo; frontend sin URLs absolutas hardcodeadas.
- [ ] K8S/TFK: sin `.tfstate`, `*.tfvars` ni Secrets k8s reales en Git; IMDSv2, EBS cifrado y SSM.

## C5 — La verificación es real

- [ ] ⚙ Cada caso `XX-Tnn` de una feature `done` tiene su prueba en `pytest`, `jest` o `vitest`.
- [ ] Integración de ambos backends usa sus PostgreSQL reales.
- [ ] `frontend/` compila con `npm run build`.
- [ ] Manifiestos en `infra/k8s/` y módulos en `infra/terraform/` validados (`fmt`, `validate`, `dry-run`).

## C6 — La sesión se cerró bien

- [ ] Sin archivos temporales, secretos locales ni logs de debug.
- [ ] `progress/history.md` tiene una entrada por la última sesión.
