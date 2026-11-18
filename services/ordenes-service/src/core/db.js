'use strict';

const { Pool } = require('pg');
const config = require('./config');

let pool = null;
let poolDsn = null;

function getPool() {
  const dsn = config.databaseUrl;
  if (pool && poolDsn === dsn) {
    return pool;
  }
  if (pool) {
    pool.end().catch(() => {});
  }
  pool = new Pool({
    connectionString: dsn,
    max: 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 3000,
  });
  poolDsn = dsn;
  return pool;
}

async function query(text, params = []) {
  return getPool().query(text, params);
}

async function enTransaccion(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackErr) {
      // Ignorar fallo secundario en rollback si la conexión se cerró
    }
    throw err;
  } finally {
    client.release();
  }
}

async function checkDb() {
  try {
    const result = await getPool().query('SELECT 1 AS ok');
    return Boolean(result && result.rows && result.rows.length > 0);
  } catch (_err) {
    return false;
  }
}

async function cerrarPool() {
  if (pool) {
    const actual = pool;
    pool = null;
    poolDsn = null;
    await actual.end();
  }
}

module.exports = {
  getPool,
  query,
  enTransaccion,
  checkDb,
  cerrarPool,
};
