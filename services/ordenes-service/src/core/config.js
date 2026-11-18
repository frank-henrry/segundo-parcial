'use strict';

const DEFAULT_DATABASE_URL = 'postgres://ordenes_user:ordenes_local_password@localhost:5434/ordenes';
const DEFAULT_PORT = 3001;
const DEFAULT_CATALOGO_URL = 'http://localhost:8001';
const SERVICE_NAME = 'ordenes-service';

const config = {
  serviceName: SERVICE_NAME,
  defaultDatabaseUrl: DEFAULT_DATABASE_URL,
  get databaseUrl() {
    return process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  },
  get port() {
    const raw = process.env.PORT;
    if (!raw) {
      return DEFAULT_PORT;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? DEFAULT_PORT : parsed;
  },
  get catalogoUrl() {
    return (process.env.CATALOGO_URL || DEFAULT_CATALOGO_URL).replace(/\/+$/, '');
  },
};

module.exports = config;
