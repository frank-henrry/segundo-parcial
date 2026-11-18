# AGENTS.md — Mapa de navegación para agentes de IA

> Punto de entrada para cualquier agente que trabaje en **ecommerce-k8s**.
> Las reglas viven en `specs-v2/`. Lee solo lo que necesites cuando lo necesites.

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `bash init.sh` y verifica que termina sin errores. Si falla, **para**.
2. Lee `progress/current.md` para saber en qué quedó la última sesión.
3. Lee `feature_list.json` y elige **una** feature `pending` cuyas `depende_de` estén
   todas en `done`. No trabajes en más de una a la vez.

## 2. Mapa del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
|---|---|---|
| `feature_list.json` | Una entrada por spec (SPEC-00 a SPEC-07) con estado | Siempre, al empezar |
| `progress/current.md` | Estado de la sesión actual | Siempre, al empezar |
| `progress/history.md` | Bitácora append-only | Si necesitas contexto histórico |
| `specs-v2/` | Specs generales (contratos únicos, front, Docker, k8s, Terraform) | Según la feature |
| `services/*/specs/` | Specs internas exclusivas de cada microservicio (≤ 150 líneas) | Si trabajas en ese servicio |
| `specs-v2/01-proyecto-contratos.md` | Stack, reglas globales PRY-R01..R08 y contratos HTTP únicos | **Siempre** antes de tocar código |
| `specs-v2/manifest.yaml` | Catálogo de servicios, puertos y rutas base | Si trabajas en servicios/infra |
| `docs/architecture.md` | Resumen de aislamiento de servicios/BDs y k8s/AWS | Antes de implementar |
| `docs/conventions.md` | Estilo de código Python, Node.js, React y pruebas | Antes de escribir código |
| `docs/verification.md` | Cómo demostrar que funciona (`pytest`, `jest`, `vitest`, `k8s`, `tf`) | Antes de pedir revisión |
| `CHECKPOINTS.md` | Criterios objetivos de estado final correcto | Para auto-evaluarte |
| `.claude/agents/` | `leader`, `desarrolladorback`, `desarrolladorfront`, `devops`, `tester`, `revisor` | Si orquestas trabajo |
| `.harness/` | Scripts de verificación que usa `init.sh` | Si `init.sh` falla |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez**, y solo si sus dependencias están en `done`.
- **Solo se tocan los archivos del §2 de la spec en curso.** `init.sh` falla si aparece
  un archivo que ninguna spec declara, o un archivo de una spec que sigue `pending`.
- **`specs-v2/` y `services/*/specs/` son de solo lectura para agentes** (PRY-R08). Si algo es
  ambiguo o falta → `blocked` en `progress/current.md` y se para. **Nunca supongas.**
- **Sin duplicación entre specs (SDD):** los contratos compartidos viven solo en
  `specs-v2/01-proyecto-contratos.md §5`. Cambiar la spec interna de un servicio solo reabre
  y refactoriza ese servicio, sin editar el otro servicio ni `specs-v2/`.
- **Límite de spec:** máximo 150 líneas y 6 secciones fijas (`## 1.` .. `## 6.`).
- **Aislamiento estricto de BDs (PRY-R01):** `catalogo-service` ↔ `db-catalogo` y
  `ordenes-service` ↔ `db-ordenes`. Prohibido cruzar bases de datos.
- **No hay `done` sin pruebas verdes**: `bash init.sh` completo en verde y cada caso `XX-Tnn` /
  `XX-Vnn` verificado.
- **AWS seguro:** ningún agente ejecuta `terraform apply` o `terraform destroy` sin permiso
  explícito del usuario. Nunca se versionan credenciales, `terraform.tfvars` ni `*.tfstate*`.

## 4. Cómo elegir una feature

```text
1. Abre feature_list.json
2. Filtra status == "pending" y depende_de ⊆ features done
3. Coge la de menor "id"
4. El subagente especialista cambia su status a "in_progress" y guarda
5. Anota en progress/current.md: feature, hora de inicio, plan breve
```

## 5. Flujo por feature

```text
leader ─► (desarrolladorback | desarrolladorfront | devops) ─► [tester] ─► revisor ─► done
                 │                                                │           │
                 ▼                                                ▼           ▼
        progress/impl_NN.md                               tests/reporte.md  progress/review_NN.md
```

Si el `revisor` responde `RECHAZADO`, el `leader` relanza a quien corresponda con la ruta del
review. Máximo 2 vueltas; a la tercera, `blocked`.

### Flujo SDD: cambios en specs y refactorización (`reabierta`)

Cuando el humano edita una spec y regenera `.harness/specs.sha256`, marca esa feature como
`reabierta` con `"retrabajo": true` en `feature_list.json`. El `leader` la pasa a `in_progress`
y lanza al especialista para **refactorizar** el código afectado (y eliminar código obsoleto o
reglas `(eliminada)`), luego al `tester` (actualiza o borra pruebas obsoletas) y al `revisor`.
Si solo cambió una spec interna en `services/<svc>/specs/`, solo se refactoriza ese servicio.

## 6. Cierre de sesión

1. `bash init.sh` — todo verde.
2. Resumen de `progress/current.md` al final de `progress/history.md`.
3. Vacía `progress/current.md` dejando solo la plantilla.
4. Sin archivos temporales, secretos ni debug logs.
