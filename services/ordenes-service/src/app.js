'use strict';

const express = require('express');
const config = require('./core/config');
const db = require('./core/db');
const {
  manejar,
  manejadorNoEncontrado,
  manejadorErrores,
} = require('./core/errors');
const ordenesRoutes = require('./modules/ordenes/routes');

async function responderSalud(_req, res) {
  const dbUp = await db.checkDb();
  if (dbUp) {
    return res.status(200).json({
      status: 'ok',
      service: config.serviceName,
      db: 'up',
    });
  }
  return res.status(503).json({
    status: 'error',
    service: config.serviceName,
    db: 'down',
  });
}

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', manejar(responderSalud));
  app.get('/api/ordenes/health', manejar(responderSalud));
  app.use('/api/ordenes', ordenesRoutes);

  app.use(manejadorNoEncontrado);
  app.use(manejadorErrores);
  return app;
}

const app = createApp();
app.createApp = createApp;

module.exports = app;
