'use strict';

const app = require('./app');
const config = require('./core/config');
const db = require('./core/db');

const server = app.listen(config.port, () => {
  process.stdout.write(`${config.serviceName} escuchando en puerto ${config.port}\n`);
});

async function apagar() {
  server.close(async () => {
    await db.cerrarPool();
    process.exit(0);
  });
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
