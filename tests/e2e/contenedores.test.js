'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8081';

async function fetchJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(10000),
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { response, body };
}

test('CNT-T01 Stack completo levanta con docker compose up -d --build y ambos /health responden 200', async () => {
  const frontRes = await fetch(`${BASE_URL}/`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(frontRes.status, 200);
  const contentType = frontRes.headers.get('content-type') || '';
  assert.match(contentType, /text\/html/i);
  const html = await frontRes.text();
  assert.match(html, /<div\s+id=["']root["']/i);

  const catHealth = await fetchJson('/api/catalogo/health');
  assert.equal(catHealth.response.status, 200);
  assert.deepEqual(catHealth.body, {
    status: 'ok',
    service: 'catalogo-service',
    db: 'up',
  });

  const ordHealth = await fetchJson('/api/ordenes/health');
  assert.equal(ordHealth.response.status, 200);
  assert.deepEqual(ordHealth.body, {
    status: 'ok',
    service: 'ordenes-service',
    db: 'up',
  });
});

test('CNT-T02 Flujo E2E: crear orden vía http://localhost:8081/api/ordenes descuenta stock en /api/catalogo/productos/{id}', async () => {
  const stockInicial = 10;
  const cantidadOrdenada = 3;
  const sku = `E2E-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const crearProducto = await fetchJson('/api/catalogo/productos', {
    method: 'POST',
    body: JSON.stringify({
      sku,
      nombre: 'Teclado E2E',
      categoria: 'Periféricos',
      precio: '25.50',
      stock: stockInicial,
    }),
  });
  assert.equal(crearProducto.response.status, 201);
  assert.ok(Number.isInteger(crearProducto.body.id));
  assert.equal(crearProducto.body.stock, stockInicial);

  const productoId = crearProducto.body.id;

  const antes = await fetchJson(`/api/catalogo/productos/${productoId}`);
  assert.equal(antes.response.status, 200);
  assert.equal(antes.body.stock, stockInicial);

  const crearOrden = await fetchJson('/api/ordenes', {
    method: 'POST',
    body: JSON.stringify({
      clienteNombre: 'Cliente E2E',
      clienteEmail: 'e2e@example.com',
      items: [{ productoId, cantidad: cantidadOrdenada }],
    }),
  });
  assert.equal(crearOrden.response.status, 201);
  assert.equal(crearOrden.body.estado, 'CREADA');
  assert.equal(crearOrden.body.total, '76.50');
  assert.equal(crearOrden.body.items.length, 1);
  assert.equal(crearOrden.body.items[0].productoId, productoId);
  assert.equal(crearOrden.body.items[0].cantidad, cantidadOrdenada);

  const despues = await fetchJson(`/api/catalogo/productos/${productoId}`);
  assert.equal(despues.response.status, 200);
  assert.equal(despues.body.stock, stockInicial - cantidadOrdenada);
});
