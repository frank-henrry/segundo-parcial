'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../src/core/db');

const INIT_SQL_PATH = path.resolve(__dirname, '..', 'db', 'init.sql');

async function aplicarEsquema() {
  const sql = fs.readFileSync(INIT_SQL_PATH, 'utf8');
  await db.query(sql);
}

async function limpiarTablas() {
  await db.query('TRUNCATE TABLE orden_items, ordenes RESTART IDENTITY CASCADE;');
}

async function prepararDb() {
  await aplicarEsquema();
  await limpiarTablas();
}

async function cerrarPool() {
  await db.cerrarPool();
}

module.exports = {
  aplicarEsquema,
  limpiarTablas,
  prepararDb,
  cerrarPool,
};
