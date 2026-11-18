'use strict';

const nock = require('nock');
const request = require('supertest');
const app = require('../../src/app');
const config = require('../../src/core/config');
const db = require('../../src/core/db');
const catalogoClient = require('../../src/core/catalogoClient');
const { ErrorApp, manejadorErrores } = require('../../src/core/errors');
const {
  prepararDb,
  limpiarTablas,
  cerrarPool,
} = require('../setup');

describe('SPEC-05 ordenes-service / core', () => {
  beforeAll(async () => {
    await prepararDb();
  });

  beforeEach(async () => {
    await limpiarTablas();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(async () => {
    await cerrarPool();
  });

  test('ORDC-T01 GET /health responde 200 con status ok, service ordenes-service y db up', async () => {
    const resHealth = await request(app).get('/health');
    expect(resHealth.status).toBe(200);
    expect(resHealth.body).toEqual({
      status: 'ok',
      service: 'ordenes-service',
      db: 'up',
    });

    const resApiHealth = await request(app).get('/api/ordenes/health');
    expect(resApiHealth.status).toBe(200);
    expect(resApiHealth.body).toEqual({
      status: 'ok',
      service: 'ordenes-service',
      db: 'up',
    });

    // Verifica transacciones reales en db-ordenes (commit y rollback)
    const totalTx = await db.enTransaccion(async (client) => {
      await client.query(
        `INSERT INTO ordenes (cliente_nombre, cliente_email, estado, total)
         VALUES ($1, $2, $3, $4)`,
        ['Ana Perez', 'ana@example.com', 'CREADA', '29.90']
      );
      const resCount = await client.query('SELECT COUNT(*)::int AS total FROM ordenes;');
      return resCount.rows[0].total;
    });
    expect(totalTx).toBe(1);

    await expect(
      db.enTransaccion(async (client) => {
        await client.query(
          `INSERT INTO ordenes (cliente_nombre, cliente_email, estado, total)
           VALUES ($1, $2, $3, $4)`,
          ['Rollback User', 'rb@example.com', 'CREADA', '10.00']
        );
        throw new ErrorApp('FALLO_TX', 409);
      })
    ).rejects.toMatchObject({ statusCode: 409, codigo: 'FALLO_TX' });

    const trasRollback = await db.query('SELECT COUNT(*)::int AS total FROM ordenes;');
    expect(trasRollback.rows[0].total).toBe(1);

    // Verifica formato de error PRY-R07 en 404, ErrorApp, ZodError, JSON inválido y 500
    const res404 = await request(app).get('/api/ordenes/ruta-inexistente');
    expect(res404.status).toBe(404);
    expect(res404.body).toEqual({
      error: {
        codigo: 'NO_ENCONTRADO',
        mensaje: expect.any(String),
      },
    });

    const crearResMock = () => {
      const res = { statusCode: 200, body: null };
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (payload) => {
        res.body = payload;
        return res;
      };
      return res;
    };

    const resErrApp = crearResMock();
    manejadorErrores(new ErrorApp('ORDEN_INVALIDA', 'Datos inválidos', 400), {}, resErrApp, () => {});
    expect(resErrApp.statusCode).toBe(400);
    expect(resErrApp.body).toEqual({
      error: { codigo: 'ORDEN_INVALIDA', mensaje: 'Datos inválidos' },
    });

    const resZod = crearResMock();
    const zodErr = new Error('Validation');
    zodErr.name = 'ZodError';
    zodErr.issues = [{ path: ['cantidad'], message: 'Debe ser positiva' }];
    manejadorErrores(zodErr, {}, resZod, () => {});
    expect(resZod.statusCode).toBe(422);
    expect(resZod.body).toEqual({
      error: { codigo: 'VALIDACION_ERROR', mensaje: 'cantidad: Debe ser positiva' },
    });

    const resJson = crearResMock();
    manejadorErrores({ type: 'entity.parse.failed' }, {}, resJson, () => {});
    expect(resJson.statusCode).toBe(400);
    expect(resJson.body.error.codigo).toBe('JSON_INVALIDO');

    const res500 = crearResMock();
    manejadorErrores(new Error('boom'), {}, res500, () => {});
    expect(res500.statusCode).toBe(500);
    expect(res500.body.error.codigo).toBe('ERROR_INTERNO');

    // Verifica 503 cuando db-ordenes no responde y restauración limpia del pool
    const dbUrlOriginal = process.env.DATABASE_URL;
    try {
      await db.cerrarPool();
      process.env.DATABASE_URL = 'postgres://ordenes_user:bad@127.0.0.1:59999/ordenes';
      const resDown = await request(app).get('/health');
      expect(resDown.status).toBe(503);
      expect(resDown.body).toEqual({
        status: 'error',
        service: 'ordenes-service',
        db: 'down',
      });
    } finally {
      await db.cerrarPool();
      if (dbUrlOriginal === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = dbUrlOriginal;
      }
      const resRestaurado = await request(app).get('/health');
      expect(resRestaurado.status).toBe(200);
    }
  });

  test('ORDC-T02 catalogoClient.reservarStock maneja 200, 409 y error de red 502 con nock', async () => {
    const baseUrl = config.catalogoUrl;

    const productoReservado = {
      id: 1,
      sku: 'TEC-001',
      nombre: 'Teclado Mecánico',
      categoria: 'perifericos',
      precio: '29.90',
      stock: 8,
      activo: true,
    };

    const scope200 = nock(baseUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 2 })
      .reply(200, productoReservado);

    const resultado = await catalogoClient.reservarStock(1, 2);
    expect(resultado).toEqual(productoReservado);
    expect(scope200.isDone()).toBe(true);

    const scope409 = nock(baseUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 99 })
      .reply(409, {
        error: {
          codigo: 'STOCK_INSUFICIENTE',
          mensaje: 'Stock insuficiente para el producto 1',
        },
      });

    await expect(catalogoClient.reservarStock(1, 99)).rejects.toMatchObject({
      name: 'ErrorApp',
      statusCode: 409,
      codigo: 'STOCK_INSUFICIENTE',
      mensaje: 'Stock insuficiente para el producto 1',
    });
    expect(scope409.isDone()).toBe(true);

    const scope404 = nock(baseUrl)
      .post('/api/catalogo/productos/999/reservar', { cantidad: 1 })
      .reply(404, {
        error: {
          codigo: 'PRODUCTO_NO_ENCONTRADO',
          mensaje: 'Producto no encontrado',
        },
      });

    await expect(catalogoClient.reservarStock(999, 1)).rejects.toBeInstanceOf(ErrorApp);
    expect(scope404.isDone()).toBe(true);

    const scope422 = nock(baseUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 0 })
      .reply(422, {
        error: {
          codigo: 'VALIDACION_ERROR',
          mensaje: 'cantidad debe ser mayor a 0',
        },
      });

    await expect(catalogoClient.reservarStock(1, 0)).rejects.toMatchObject({
      name: 'ErrorApp',
      statusCode: 422,
      codigo: 'VALIDACION_ERROR',
    });
    expect(scope422.isDone()).toBe(true);

    const scope500 = nock(baseUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 1 })
      .reply(500, {
        error: {
          codigo: 'ERROR_INTERNO',
          mensaje: 'Fallo interno',
        },
      });

    await expect(catalogoClient.reservarStock(1, 1)).rejects.toMatchObject({
      name: 'ErrorApp',
      statusCode: 502,
      codigo: 'CATALOGO_NO_DISPONIBLE',
    });
    expect(scope500.isDone()).toBe(true);

    const scopeRed = nock(baseUrl)
      .post('/api/catalogo/productos/1/reservar', { cantidad: 1 })
      .replyWithError('ECONNREFUSED');

    await expect(catalogoClient.reservarStock(1, 1)).rejects.toMatchObject({
      name: 'ErrorApp',
      statusCode: 502,
      codigo: 'CATALOGO_NO_DISPONIBLE',
    });
    expect(scopeRed.isDone()).toBe(true);
  });
});
