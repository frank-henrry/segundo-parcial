'use strict';
// Verifica que cada archivo del proyecto esté declarado en el §2 de alguna spec y que
// ninguno pertenezca a una spec que sigue `pending` (trabajo fuera de turno).
const { RAIZ, leerFeatures, archivosDeclarados, listarArchivos, ok, fail } = require('./lib');

const ARNES = [
  /^(CLAUDE|AGENTS|CHECKPOINTS|README)\.md$/, /^init\.sh$/, /^feature_list\.json$/,
  /^\.git(attributes|ignore)$/, /^progress\//, /^docs\//, /^\.claude\//, /^\.harness\//,
  /^specs-v2\//, /^services\/[^/]+\/specs\//,
];
const IGNORADOS = [
  /(^|\/)node_modules(\/|$)/, /^\.git(\/|$)/, /(^|\/)coverage(\/|$)/,
  /(^|\/)(__pycache__|\.pytest_cache|\.venv|venv)(\/|$)/,
  /(^|\/)dist(\/|$)/, /(^|\/)\.terraform(\/|$)/, /(^|\/)\.terraform\.lock\.hcl$/, /\.tfstate(\.|$)/,
  /\.tfvars$/, /^tests\/\.tmp(\/|$)/, /^\.env$/, /(^|\/)\.DS_Store$/,
];

const data = leerFeatures();
const porNombre = new Map(data.features.map((f) => [f.name, f]));
const duenio = new Map();
for (const f of data.features) {
  for (const { archivo, marca } of archivosDeclarados(f)) {
    if ((marca === 'NUEVO' || marca === 'NUEVO/EDITAR') && !duenio.has(archivo)) {
      duenio.set(archivo, f);
    }
  }
}

// Archivos de pruebas/lockfiles mapeados por convención de nombre de feature.
function duenioImplicito(rel) {
  if (rel === 'tests/reporte.md') return porNombre.get('proyecto-contratos');
  if (rel === 'services/ordenes-service/package-lock.json') return porNombre.get('ordenes-core');
  if (rel === 'frontend/package-lock.json') return porNombre.get('frontend');

  // services/<svc>/tests/<feature-name>/test_*.py o *.test.js
  const mPy = rel.match(/^services\/[^/]+\/tests\/([^/]+)\/test_[^/]+\.py$/);
  if (mPy) return porNombre.get(mPy[1]);

  const mJs = rel.match(/^services\/[^/]+\/tests\/([^/]+)\/[^/]+\.test\.js$/);
  if (mJs) return porNombre.get(mJs[1]);

  if (/^frontend\/src\/.*\.test\.(?:js|jsx|ts|tsx)$/.test(rel)) {
    return porNombre.get('frontend');
  }
  if (/^tests\/e2e\/.*\.test\.js$/.test(rel)) {
    return porNombre.get('contenedores-local');
  }
  return undefined;
}

const archivos = listarArchivos(RAIZ, (rel) => IGNORADOS.some((re) => re.test(rel)));

const sinSpec = [];
const fueraDeTurno = [];
for (const rel of archivos) {
  if (ARNES.some((re) => re.test(rel))) continue;
  const f = duenio.get(rel) || duenioImplicito(rel);
  if (!f) sinSpec.push(rel);
  else if (f.status === 'pending') fueraDeTurno.push(`${rel} (SPEC-${String(f.id).padStart(2, '0')})`);
}

let codigo = 0;
if (sinSpec.length) {
  fail(`Archivos que ninguna spec declara en su §2: ${sinSpec.join(', ')}`);
  codigo = 1;
}
if (fueraDeTurno.length) {
  fail(`Archivos de specs que siguen pending: ${fueraDeTurno.join(', ')}`);
  codigo = 1;
}
if (!codigo) ok(`Alcance de archivos correcto (${archivos.length} archivos revisados)`);
process.exit(codigo);
