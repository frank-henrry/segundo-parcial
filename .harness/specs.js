'use strict';
// Uso: node .harness/specs.js verificar | generar
// `generar` solo lo ejecuta un humano después de editar specs-v2/ o services/*/specs/ a propósito.
// Verifica además: límite de 150 líneas y estructura de 6 secciones fijas en cada spec.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { RAIZ, leerFeatures, listarArchivos, ok, fail } = require('./lib');

const ARCHIVO_HASH = path.join(RAIZ, '.harness', 'specs.sha256');
const MAX_LINEAS = 150;

function directoriosSpecs() {
  const dirs = [path.join(RAIZ, 'specs-v2')];
  const servicesDir = path.join(RAIZ, 'services');
  if (fs.existsSync(servicesDir)) {
    for (const e of fs.readdirSync(servicesDir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        const sp = path.join(servicesDir, e.name, 'specs');
        if (fs.existsSync(sp)) dirs.push(sp);
      }
    }
  }
  return dirs;
}

function listarTodasLasSpecs() {
  const salida = [];
  for (const d of directoriosSpecs()) {
    salida.push(...listarArchivos(d, () => false));
  }
  return salida.sort();
}

function validarEstructuraYLimite() {
  const errores = [];
  const data = leerFeatures();
  const specsDeFeatures = new Set(data.features.map((f) => f.spec));

  for (const rel of listarTodasLasSpecs()) {
    if (!rel.endsWith('.md') || rel.endsWith('/README.md')) continue;
    const contenido = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
    const lineas = contenido.split('\n').length;
    if (lineas > MAX_LINEAS) {
      errores.push(`${rel}: excede el límite de ${MAX_LINEAS} líneas (${lineas} líneas)`);
    }
    if (specsDeFeatures.has(rel)) {
      for (let s = 1; s <= 6; s += 1) {
        if (!new RegExp(`^## ${s}\\.`, 'm').test(contenido)) {
          errores.push(`${rel}: falta la sección obligatoria "## ${s}."`);
        }
      }
    }
  }
  return errores;
}

function calcular() {
  return listarTodasLasSpecs().map((rel) => {
    const contenido = fs.readFileSync(path.join(RAIZ, rel), 'utf8').replace(/\r\n/g, '\n');
    return `${crypto.createHash('sha256').update(contenido).digest('hex')}  ${rel}`;
  });
}

const erroresEstructura = validarEstructuraYLimite();
if (erroresEstructura.length) {
  for (const e of erroresEstructura) fail(e);
  process.exit(1);
}

const modo = process.argv[2];
if (modo === 'generar') {
  fs.writeFileSync(ARCHIVO_HASH, `${calcular().join('\n')}\n`);
  ok(`Hash y estructura (<= ${MAX_LINEAS} líneas, 6 secciones) generados en .harness/specs.sha256`);
  process.exit(0);
}

if (!fs.existsSync(ARCHIVO_HASH)) {
  fail('Falta .harness/specs.sha256 (un humano debe ejecutar: node .harness/specs.js generar)');
  process.exit(1);
}
const esperado = new Map(fs.readFileSync(ARCHIVO_HASH, 'utf8').trim().split('\n')
  .map((l) => l.replace(/\r$/, '').split('  ')).map(([h, f]) => [f, h]));
const actual = new Map(calcular().map((l) => l.split('  ')).map(([h, f]) => [f, h]));

const cambios = [];
for (const [f, h] of esperado) {
  if (!actual.has(f)) cambios.push(`borrado: ${f}`);
  else if (actual.get(f) !== h) cambios.push(`modificado: ${f}`);
}
for (const f of actual.keys()) if (!esperado.has(f)) cambios.push(`nuevo: ${f}`);

if (cambios.length) {
  fail(`Las specs fueron modificadas sin regenerar hash (PRY-R12): ${cambios.join(', ')}`);
  process.exit(1);
}
ok(`Specs intactas y conformes (<= ${MAX_LINEAS} líneas, 6 secciones, ${actual.size} archivos)`);
