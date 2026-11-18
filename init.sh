#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno de ecommerce-k8s
#
#   bash init.sh            verificación completa
#   bash init.sh --rapido   verificación rápida (sin integración pesada)

set -u
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()   { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

RAPIDO=0
[ "${1:-}" = "--rapido" ] && RAPIDO=1
EXIT_CODE=0

echo "── 1. Verificando entorno ─────────────────────────────"

if ! command -v node >/dev/null 2>&1; then
  fail "node no está instalado"
  exit 1
fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Se requiere Node.js >= 22. Tienes $(node --version)"
  exit 1
fi
ok "node -> $(node --version)"

if command -v npm >/dev/null 2>&1; then
  ok "npm -> $(npm --version)"
else
  fail "npm no está instalado"
  EXIT_CODE=1
fi

if command -v python >/dev/null 2>&1; then
  ok "python -> $(python --version 2>&1)"
elif command -v python3 >/dev/null 2>&1; then
  ok "python3 -> $(python3 --version 2>&1)"
else
  warn "python no encontrado en PATH (necesario desde SPEC-02 catalogo-service)"
fi

if ! command -v docker >/dev/null 2>&1; then
  warn "docker no está instalado (necesario para las 2 BDs PostgreSQL y Compose)"
elif ! docker info >/dev/null 2>&1; then
  warn "docker está instalado pero el daemon no responde (abre Docker Desktop)"
else
  ok "docker -> $(docker --version | cut -d, -f1)"
fi

echo ""
echo "── 2. Verificando archivos base del arnés ──────────────"

for f in AGENTS.md CLAUDE.md CHECKPOINTS.md feature_list.json progress/current.md progress/history.md \
         docs/architecture.md docs/conventions.md docs/verification.md \
         .claude/agents/leader.md .claude/agents/desarrolladorback.md \
         .claude/agents/desarrolladorfront.md .claude/agents/devops.md \
         .claude/agents/tester.md .claude/agents/revisor.md specs-v2/manifest.yaml; do
  if [ ! -f "$f" ]; then
    fail "Falta archivo base: $f"
    EXIT_CODE=1
  fi
done
[ $EXIT_CODE -eq 0 ] && ok "Archivos base del arnés presentes (6 subagentes)"

echo ""
echo "── 3. Specs, estado y alcance ──────────────────────────"

node .harness/specs.js verificar || EXIT_CODE=1
node .harness/validar-features.js || EXIT_CODE=1
node .harness/alcance.js || EXIT_CODE=1

echo ""
echo "── 4. Pruebas de servicios y frontend ──────────────────"

CORRIO_ALGUNA=0

if [ -f services/catalogo-service/requirements.txt ]; then
  if command -v pytest >/dev/null 2>&1; then
    CORRIO_ALGUNA=1
    if (cd services/catalogo-service && pytest -q); then
      ok "catalogo-service (pytest) en verde"
    else
      fail "catalogo-service (pytest) tiene fallos"
      EXIT_CODE=1
    fi
  else
    warn "pytest no instalado en PATH (catalogo-service)"
  fi
fi

if [ -f services/ordenes-service/package.json ]; then
  if [ ! -d services/ordenes-service/node_modules ]; then
    fail "Falta services/ordenes-service/node_modules: ejecuta 'npm install'"
    EXIT_CODE=1
  else
    CORRIO_ALGUNA=1
    CMD_ORD="test"
    [ $RAPIDO -eq 1 ] && CMD_ORD="run --silent test:unit"
    if (cd services/ordenes-service && npm $CMD_ORD --silent); then
      ok "ordenes-service en verde"
    else
      fail "ordenes-service tiene pruebas rotas"
      EXIT_CODE=1
    fi
  fi
fi

if [ -f frontend/package.json ]; then
  if [ ! -d frontend/node_modules ]; then
    fail "Falta frontend/node_modules: ejecuta 'npm install'"
    EXIT_CODE=1
  else
    CORRIO_ALGUNA=1
    if (cd frontend && npm test --silent); then
      ok "frontend (vitest) en verde"
    else
      fail "frontend tiene pruebas rotas"
      EXIT_CODE=1
    fi
  fi
fi

if [ $CORRIO_ALGUNA -eq 0 ]; then
  warn "Servicios y frontend aún no implementados (SPEC-02..04 pending): sin suites por correr"
fi

echo ""
echo "── 4b. Verificando IaC (Terraform y Kubernetes) ────────"

if [ -d infra/terraform ]; then
  if command -v terraform >/dev/null 2>&1 && terraform version >/dev/null 2>&1; then
    if terraform fmt -check -recursive infra/terraform >/dev/null 2>&1; then
      ok "terraform fmt OK"
    else
      fail "terraform fmt detectó archivos sin formatear en infra/terraform"
      EXIT_CODE=1
    fi
  else
    warn "terraform CLI no disponible o no ejecutable en este entorno (se omite fmt/validate)"
  fi
fi

if [ -d infra/k8s ]; then
  if command -v kubectl >/dev/null 2>&1; then
    if kubectl apply --dry-run=client -f infra/k8s/ >/dev/null 2>&1; then
      ok "kubectl dry-run OK en infra/k8s/"
    else
      fail "kubectl dry-run falló en infra/k8s/"
      EXIT_CODE=1
    fi
  else
    warn "kubectl no disponible en PATH (se omite dry-run de infra/k8s/)"
  fi
fi

echo ""
echo "── 5. Resumen ──────────────────────────────────────────"

if [ $EXIT_CODE -eq 0 ]; then
  if [ $RAPIDO -eq 1 ]; then
    ok "Entorno listo (verificación rápida)."
  else
    ok "Entorno listo. Puedes empezar a trabajar."
  fi
else
  fail "Entorno NO está listo. Resuelve los errores antes de avanzar."
fi

exit $EXIT_CODE
