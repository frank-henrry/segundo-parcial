'use strict';
// PostToolUse (Edit|Write): tras tocar código de un servicio o del front, corre sus pruebas unitarias.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

let entrada = '';
process.stdin.on('data', (c) => { entrada += c; });
process.stdin.on('end', () => {
  let datos;
  try {
    datos = JSON.parse(entrada);
  } catch {
    process.exit(0);
  }
  const raiz = process.env.CLAUDE_PROJECT_DIR || datos.cwd || process.cwd();
  const destino = datos.tool_input?.file_path || '';
  if (!destino) process.exit(0);
  const rel = path.relative(raiz, path.resolve(raiz, destino)).split(path.sep).join('/');

  let cwdObjetivo = null;
  let cmd = null;

  if (/^services\/catalogo-service\/.+\.py$/.test(rel)) {
    cwdObjetivo = path.join(raiz, 'services/catalogo-service');
    if (fs.existsSync(path.join(cwdObjetivo, 'tests/unit'))) {
      cmd = 'pytest -q tests/unit';
    }
  } else if (/^services\/ordenes-service\/.+\.(js|sql)$/.test(rel)) {
    cwdObjetivo = path.join(raiz, 'services/ordenes-service');
    if (fs.existsSync(path.join(cwdObjetivo, 'package.json'))
        && fs.existsSync(path.join(cwdObjetivo, 'node_modules'))) {
      cmd = 'npm run --silent test:unit';
    }
  } else if (/^frontend\/.+\.(js|jsx|ts|tsx)$/.test(rel)) {
    cwdObjetivo = path.join(raiz, 'frontend');
    if (fs.existsSync(path.join(cwdObjetivo, 'package.json'))
        && fs.existsSync(path.join(cwdObjetivo, 'node_modules'))) {
      cmd = 'npm run --silent test';
    }
  }

  if (!cwdObjetivo || !cmd) process.exit(0);

  const r = spawnSync(cmd, {
    cwd: cwdObjetivo, shell: true, encoding: 'utf8', timeout: 120000,
  });
  if (r.status === 0) process.exit(0);

  const salida = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').slice(-40).join('\n');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `[harness] Las pruebas fallan tras editar ${rel}:\n${salida}`,
    },
  }));
  process.exit(0);
});
