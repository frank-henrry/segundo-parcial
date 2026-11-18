'use strict';

const nock = require('nock');
const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/core/config');
const db = require('../../src/core/db');
const {
  prepararDb,
  limpiarTablas,
  cerrarPool,
} = require('../setup');

describe('SPEC-06 ordenes-service / ordenes (Crear orden)', () => {
  beforeAll(async () => {
    await prepararDb();
  });

  beforeEach(async () => {
    await limpiarTablas();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.abortPendingRequests();
    nock.cleanAll();
  });

  afterAll(async () => {
    await cerrarPool();
  });

  test('ORDN-T01 POST /api/ordenes válido reserva stock vía nock, calcula total con Decimal y retorna 201', async () => {
    const scopeProd1 = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 2 })
      .reply(200, {
        id: 1,
        sku: 'MOU-001',
        nombre: 'Mouse Inalámbrico',
        categoria: 'perifericos',
        precio: '19.95',
        stock: 8,
        activo: true,
      });

    const scopeProd2 = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/2/reservar', { cantidad: 3 })
      .reply(200, {
        id: 2,
        sku: 'CAB-002',
        nombre: 'Cable USB-C',
        categoria: 'accesorios',
        precio: '0.10',
        stock: 17,
        activo: true,
      });

    const payload = {
      clienteNombre: 'Lucía Gómez',
      clienteEmail: 'lucia@example.com',
      items: [
        { productoId: 1, cantidad: 2 },
        { productoId: 2, cantidad: 3 },
      ],
    };

    const res = await request(app).post('/api/ordenes').send(payload);

    expect(res.status).toBe(201);
    expect(scopeProd1.isDone()).toBe(true);
    expect(scopeProd2.isDone()).toBe(true);

    // 19.95 * 2 + 0.10 * 3 = 39.90 + 0.30 = 40.20 (sin error de punto flotante)
    expect(res.body).toEqual({
      id: expect.any(Number),
      clienteNombre: 'Lucía Gómez',
      clienteEmail: 'lucia@example.com',
      estado: 'CREADA',
      total: '40.20',
      items: [
        {
          id: expect.any(Number),
          productoId: 1,
          nombreProducto: 'Mouse Inalámbrico',
          cantidad: 2,
          precioUnitario: '19.95',
          subtotal: '39.90',
        },
        {
          id: expect.any(Number),
          productoId: 2,
          nombreProducto: 'Cable USB-C',
          cantidad: 3,
          precioUnitario: '0.10',
          subtotal: '0.30',
        },
      ],
      createdAt: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);

    const ordenDb = await db.query(
      `SELECT id, cliente_nombre, cliente_email, estado, total::text AS total
       FROM ordenes
       WHERE id = $1`,
      [res.body.id]
    );
    expect(ordenDb.rows).toEqual([
      {
        id: res.body.id,
        cliente_nombre: 'Lucía Gómez',
        cliente_email: 'lucia@example.com',
        estado: 'CREADA',
        total: '40.20',
      },
    ]);

    const itemsDb = await db.query(
      `SELECT producto_id, nombre_producto, cantidad,
              precio_unitario::text AS precio_unitario,
              subtotal::text AS subtotal
       FROM orden_items
       WHERE orden_id = $1
       ORDER BY id ASC`,
      [res.body.id]
    );
    expect(itemsDb.rows).toEqual([
      {
        producto_id: 1,
        nombre_producto: 'Mouse Inalámbrico',
        cantidad: 2,
        precio_unitario: '19.95',
        subtotal: '39.90',
      },
      {
        producto_id: 2,
        nombre_producto: 'Cable USB-C',
        cantidad: 3,
        precio_unitario: '0.10',
        subtotal: '0.30',
      },
    ]);
  });

  test('ORDN-T02 POST /api/ordenes con items vacío o cantidad <= 0 retorna 422 sin llamar a catálogo', async () => {
    const scopeCatalogo = nock(config.catalogoUrl)
      .post(/\/api\/catalogo\/productos\/\d+\/reservar/)
      .reply(200, {});

    const resItemsVacios = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Carlos Ruiz',
      clienteEmail: 'carlos@example.com',
      items: [],
    });
    expect(resItemsVacios.status).toBe(422);
    expect(resItemsVacios.body).toEqual({
      error: {
        codigo: 'VALIDACION_ERROR',
        mensaje: expect.any(String),
      },
    });

    const resCantidadCero = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Carlos Ruiz',
      clienteEmail: 'carlos@example.com',
      items: [{ productoId: 1, cantidad: 0 }],
    });
    expect(resCantidadCero.status).toBe(422);
    expect(resCantidadCero.body.error.codigo).toBe('VALIDACION_ERROR');

    const resCantidadNegativa = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Carlos Ruiz',
      clienteEmail: 'carlos@example.com',
      items: [{ productoId: 1, cantidad: -3 }],
    });
    expect(resCantidadNegativa.status).toBe(422);
    expect(resCantidadNegativa.body.error.codigo).toBe('VALIDACION_ERROR');

    const resEmailInvalido = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Carlos Ruiz',
      clienteEmail: 'correo-invalido',
      items: [{ productoId: 1, cantidad: 1 }],
    });
    expect(resEmailInvalido.status).toBe(422);
    expect(resEmailInvalido.body.error.codigo).toBe('VALIDACION_ERROR');

    expect(scopeCatalogo.isDone()).toBe(false);

    const ordenesCount = await db.query('SELECT COUNT(*)::int AS total FROM ordenes;');
    const itemsCount = await db.query('SELECT COUNT(*)::int AS total FROM orden_items;');
    expect(ordenesCount.rows[0].total).toBe(0);
    expect(itemsCount.rows[0].total).toBe(0);
  });

  test('ORDN-T03 POST /api/ordenes cuando catálogo responde 409 retorna 409 y no inserta en db-ordenes', async () => {
    const scopeItem1 = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 1 })
      .reply(200, {
        id: 1,
        sku: 'MOU-001',
        nombre: 'Mouse Inalámbrico',
        categoria: 'perifericos',
        precio: '19.95',
        stock: 9,
        activo: true,
      });

    const scopeItem2 = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/2/reservar', { cantidad: 50 })
      .reply(409, {
        error: {
          codigo: 'STOCK_INSUFICIENTE',
          mensaje: 'Stock insuficiente para el producto 2',
        },
      });

    const res = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Elena Torres',
      clienteEmail: 'elena@example.com',
      items: [
        { productoId: 1, cantidad: 1 },
        { productoId: 2, cantidad: 50 },
      ],
    });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        codigo: 'STOCK_INSUFICIENTE',
        mensaje: 'Stock insuficiente para el producto 2',
      },
    });
    expect(scopeItem1.isDone()).toBe(true);
    expect(scopeItem2.isDone()).toBe(true);

    const ordenesCount = await db.query('SELECT COUNT(*)::int AS total FROM ordenes;');
    const itemsCount = await db.query('SELECT COUNT(*)::int AS total FROM orden_items;');
    expect(ordenesCount.rows[0].total).toBe(0);
    expect(itemsCount.rows[0].total).toBe(0);
  });

  test('ORDN-T04 POST /api/ordenes cuando catálogo falla/timeout retorna 502 CATALOGO_NO_DISPONIBLE', async () => {
    const scopeRed = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 1 })
      .replyWithError('ECONNREFUSED');

    const resRed = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Mario Díaz',
      clienteEmail: 'mario@example.com',
      items: [{ productoId: 1, cantidad: 1 }],
    });

    expect(resRed.status).toBe(502);
    expect(resRed.body).toEqual({
      error: {
        codigo: 'CATALOGO_NO_DISPONIBLE',
        mensaje: expect.any(String),
      },
    });
    expect(scopeRed.isDone()).toBe(true);

    const scope500 = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 1 })
      .reply(500, {
        error: {
          codigo: 'ERROR_INTERNO',
          mensaje: 'Fallo interno',
        },
      });

    const res500 = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Mario Díaz',
      clienteEmail: 'mario@example.com',
      items: [{ productoId: 1, cantidad: 1 }],
    });

    expect(res500.status).toBe(502);
    expect(res500.body.error.codigo).toBe('CATALOGO_NO_DISPONIBLE');
    expect(scope500.isDone()).toBe(true);

    const scopeTimeout = nock(config.catalogoUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 1 })
      .delay(5500)
      .reply(200, {
        id: 1,
        nombre: 'Mouse Inalámbrico',
        precio: '19.95',
      });

    const resTimeout = await request(app).post('/api/ordenes').send({
      clienteNombre: 'Mario Díaz',
      clienteEmail: 'mario@example.com',
      items: [{ productoId: 1, cantidad: 1 }],
    });

    expect(resTimeout.status).toBe(502);
    expect(resTimeout.body.error.codigo).toBe('CATALOGO_NO_DISPONIBLE');
    expect(scopeTimeout.isDone()).toBe(true);

    const ordenesCount = await db.query('SELECT COUNT(*)::int AS total FROM ordenes;');
    const itemsCount = await db.query('SELECT COUNT(*)::int AS total FROM orden_items;');
    expect(ordenesCount.rows[0].total).toBe(0);
    expect(itemsCount.rows[0].total).toBe(0);
  }, 15000);
});
