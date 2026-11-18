'use strict';

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/core/db');
const {
  prepararDb,
  limpiarTablas,
  cerrarPool,
} = require('../setup');

async function insertarOrdenDirecta({
  clienteNombre,
  clienteEmail,
  estado = 'CREADA',
  total,
  createdAt,
  items = [],
}) {
  const ordenRes = createdAt
    ? await db.query(
      `INSERT INTO ordenes (cliente_nombre, cliente_email, estado, total, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, cliente_nombre, cliente_email, estado, total, created_at`,
      [clienteNombre, clienteEmail, estado, total, createdAt]
    )
    : await db.query(
      `INSERT INTO ordenes (cliente_nombre, cliente_email, estado, total)
       VALUES ($1, $2, $3, $4)
       RETURNING id, cliente_nombre, cliente_email, estado, total, created_at`,
      [clienteNombre, clienteEmail, estado, total]
    );

  const orden = ordenRes.rows[0];
  const itemsInsertados = [];

  for (const item of items) {
    const itemRes = await db.query(
      `INSERT INTO orden_items (
         orden_id,
         producto_id,
         nombre_producto,
         cantidad,
         precio_unitario,
         subtotal
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, orden_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal`,
      [
        orden.id,
        item.productoId,
        item.nombreProducto,
        item.cantidad,
        item.precioUnitario,
        item.subtotal,
      ]
    );
    itemsInsertados.push(itemRes.rows[0]);
  }

  return { orden, items: itemsInsertados };
}

describe('SPEC-07 ordenes-service / ordenes (Consultar y Cambiar Estado)', () => {
  beforeAll(async () => {
    await prepararDb();
  });

  beforeEach(async () => {
    await limpiarTablas();
  });

  afterAll(async () => {
    await cerrarPool();
  });

  test('ORDQ-T01 GET /api/ordenes lista órdenes existentes ordenadas descendentemente', async () => {
    const resVacio = await request(app).get('/api/ordenes');
    expect(resVacio.status).toBe(200);
    expect(resVacio.body).toEqual({ items: [], total: 0 });

    const { orden: ordenAntigua } = await insertarOrdenDirecta({
      clienteNombre: 'Ana Pérez',
      clienteEmail: 'ana@example.com',
      estado: 'CREADA',
      total: '15.00',
      createdAt: '2026-01-01T10:00:00.000Z',
    });

    // Mismo created_at para comprobar desempate por id DESC (ORDQ-R01)
    const { orden: ordenEmpateMenorId } = await insertarOrdenDirecta({
      clienteNombre: 'Bruno Silva',
      clienteEmail: 'bruno@example.com',
      estado: 'PAGADA',
      total: '49.90',
      createdAt: '2026-01-02T12:00:00.000Z',
    });

    const { orden: ordenEmpateMayorId } = await insertarOrdenDirecta({
      clienteNombre: 'Carla Ruiz',
      clienteEmail: 'carla@example.com',
      estado: 'ENVIADA',
      total: '120.50',
      createdAt: '2026-01-02T12:00:00.000Z',
    });

    const res = await request(app).get('/api/ordenes');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items.map((item) => item.id)).toEqual([
      ordenEmpateMayorId.id,
      ordenEmpateMenorId.id,
      ordenAntigua.id,
    ]);

    expect(res.body.items).toEqual([
      {
        id: ordenEmpateMayorId.id,
        clienteNombre: 'Carla Ruiz',
        clienteEmail: 'carla@example.com',
        estado: 'ENVIADA',
        total: '120.50',
        createdAt: '2026-01-02T12:00:00.000Z',
      },
      {
        id: ordenEmpateMenorId.id,
        clienteNombre: 'Bruno Silva',
        clienteEmail: 'bruno@example.com',
        estado: 'PAGADA',
        total: '49.90',
        createdAt: '2026-01-02T12:00:00.000Z',
      },
      {
        id: ordenAntigua.id,
        clienteNombre: 'Ana Pérez',
        clienteEmail: 'ana@example.com',
        estado: 'CREADA',
        total: '15.00',
        createdAt: '2026-01-01T10:00:00.000Z',
      },
    ]);
  });

  test('ORDQ-T02 GET /api/ordenes/{id} devuelve la orden con sus items o 404 si no existe', async () => {
    const { orden, items } = await insertarOrdenDirecta({
      clienteNombre: 'Diego Morales',
      clienteEmail: 'diego@example.com',
      estado: 'CREADA',
      total: '75.80',
      items: [
        {
          productoId: 10,
          nombreProducto: 'Teclado Mecánico',
          cantidad: 1,
          precioUnitario: '59.90',
          subtotal: '59.90',
        },
        {
          productoId: 11,
          nombreProducto: 'Pad Mouse',
          cantidad: 2,
          precioUnitario: '7.95',
          subtotal: '15.90',
        },
      ],
    });

    const resOk = await request(app).get(`/api/ordenes/${orden.id}`);

    expect(resOk.status).toBe(200);
    expect(resOk.body).toEqual({
      id: orden.id,
      clienteNombre: 'Diego Morales',
      clienteEmail: 'diego@example.com',
      estado: 'CREADA',
      total: '75.80',
      items: [
        {
          id: items[0].id,
          productoId: 10,
          nombreProducto: 'Teclado Mecánico',
          cantidad: 1,
          precioUnitario: '59.90',
          subtotal: '59.90',
        },
        {
          id: items[1].id,
          productoId: 11,
          nombreProducto: 'Pad Mouse',
          cantidad: 2,
          precioUnitario: '7.95',
          subtotal: '15.90',
        },
      ],
      createdAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(resOk.body.createdAt))).toBe(false);

    const resNoExiste = await request(app).get('/api/ordenes/999999');

    expect(resNoExiste.status).toBe(404);
    expect(resNoExiste.body).toEqual({
      error: {
        codigo: 'ORDEN_NO_ENCONTRADA',
        mensaje: expect.any(String),
      },
    });
  });

  test('ORDQ-T03 PATCH /api/ordenes/{id}/estado actualiza estado válido y rechaza estado inválido con 422', async () => {
    const { orden } = await insertarOrdenDirecta({
      clienteNombre: 'Sofía Vega',
      clienteEmail: 'sofia@example.com',
      estado: 'CREADA',
      total: '39.90',
    });

    for (const nuevoEstado of ['PAGADA', 'ENVIADA', 'CANCELADA', 'CREADA']) {
      const resPatch = await request(app)
        .patch(`/api/ordenes/${orden.id}/estado`)
        .send({ estado: nuevoEstado });

      expect(resPatch.status).toBe(200);
      expect(resPatch.body).toEqual({
        id: orden.id,
        clienteNombre: 'Sofía Vega',
        clienteEmail: 'sofia@example.com',
        estado: nuevoEstado,
        total: '39.90',
        createdAt: expect.any(String),
      });

      const filaDb = await db.query(
        'SELECT estado FROM ordenes WHERE id = $1',
        [orden.id]
      );
      expect(filaDb.rows[0].estado).toBe(nuevoEstado);
    }

    const resEstadoInvalido = await request(app)
      .patch(`/api/ordenes/${orden.id}/estado`)
      .send({ estado: 'PENDIENTE' });

    expect(resEstadoInvalido.status).toBe(422);
    expect(resEstadoInvalido.body).toEqual({
      error: {
        codigo: 'VALIDACION_ERROR',
        mensaje: expect.any(String),
      },
    });

    const resSinEstado = await request(app)
      .patch(`/api/ordenes/${orden.id}/estado`)
      .send({});

    expect(resSinEstado.status).toBe(422);
    expect(resSinEstado.body.error.codigo).toBe('VALIDACION_ERROR');

    const filaSinCambio = await db.query(
      'SELECT estado FROM ordenes WHERE id = $1',
      [orden.id]
    );
    expect(filaSinCambio.rows[0].estado).toBe('CREADA');

    const resNoExiste = await request(app)
      .patch('/api/ordenes/999999/estado')
      .send({ estado: 'PAGADA' });

    expect(resNoExiste.status).toBe(404);
    expect(resNoExiste.body).toEqual({
      error: {
        codigo: 'ORDEN_NO_ENCONTRADA',
        mensaje: expect.any(String),
      },
    });
  });
});
