'use strict';
// PreToolUse (Edit|Write|MultiEdit|NotebookEdit): PRY-R08/R12, ningún agente modifica specs.
const path = require('path');

let entrada = '';
process.stdin.on('data', (c) => { entrada += c; });
process.stdin.on('end', () => {
  let datos;
  try {
    datos = JSON.parse(entrada);
  } catch {
    process.exit(0);
  }
  const destino = datos.tool_input?.file_path || datos.tool_input?.notebook_path;
  if (!destino) process.exit(0);

  const raiz = process.env.CLAUDE_PROJECT_DIR || datos.cwd || process.cwd();
  const rel = path.relative(raiz, path.resolve(datos.cwd || raiz, destino)).split(path.sep).join('/');
  const esSpec = rel.startsWith('specs-v2/')
    || /^services\/[^/]+\/specs\//.test(rel)
    || rel === '.harness/specs.sha256';

  if (esSpec) {
    process.stderr.write(
      `[harness] Bloqueado: ${rel} es de solo lectura para agentes (SDD / PRY-R08). `
      + 'Si la spec es ambigua o cambió, el humano edita la spec y reabre la feature.\n',
    );
    process.exit(2);
  }
  process.exit(0);
});
