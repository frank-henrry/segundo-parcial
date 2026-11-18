import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App.jsx';

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function createFetchRouter(handlers) {
  return vi.fn((url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    for (const handler of handlers) {
      if (handler.match(url, method, options)) {
        return handler.reply(url, options);
      }
    }
    throw new Error(`Fetch no mockeado: ${method} ${url}`);
  });
}

const PRODUCTO_TECLADO = {
  id: 1,
  sku: 'SKU-001',
  nombre: 'Teclado Mecánico',
  categoria: 'Periféricos',
  precio: '89.90',
  stock: 5,
  activo: true,
};

const PRODUCTO_MOUSE = {
  id: 2,
  sku: 'SKU-002',
  nombre: 'Mouse Óptico',
  categoria: 'Periféricos',
  precio: '24.50',
  stock: 0,
  activo: true,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('FE-T01 Renderiza productos obtenidos desde /api/catalogo/productos', async () => {
  const fetchMock = createFetchRouter([
    {
      match: (url) => url === '/api/catalogo/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'catalogo-service', db: 'up' }),
    },
    {
      match: (url) => url === '/api/ordenes/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'ordenes-service', db: 'up' }),
    },
    {
      match: (url, method) =>
        method === 'GET' && url === '/api/catalogo/productos',
      reply: () =>
        jsonResponse({
          items: [PRODUCTO_TECLADO, PRODUCTO_MOUSE],
          total: 2,
        }),
    },
    {
      match: (url, method) => method === 'GET' && url === '/api/ordenes',
      reply: () => jsonResponse({ items: [], total: 0 }),
    },
  ]);
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  expect(await screen.findByText('Teclado Mecánico')).toBeInTheDocument();
  expect(screen.getByText('SKU-001')).toBeInTheDocument();
  expect(screen.getByText('$89.90')).toBeInTheDocument();
  expect(screen.getByText('Mouse Óptico')).toBeInTheDocument();
  expect(screen.getByText('SKU-002')).toBeInTheDocument();
  expect(screen.getByText('$24.50')).toBeInTheDocument();

  const addButtons = screen.getAllByRole('button', {
    name: 'Agregar al carrito',
  });
  expect(addButtons).toHaveLength(2);
  expect(addButtons[0]).toBeEnabled();
  expect(addButtons[1]).toBeDisabled();

  expect(fetchMock).toHaveBeenCalledWith('/api/catalogo/productos', {
    headers: {},
  });
});

test('FE-T02 Muestra indicador de salud de ambos servicios (/api/catalogo/health y /api/ordenes/health)', async () => {
  let ordenesOk = true;
  const fetchMock = createFetchRouter([
    {
      match: (url) => url === '/api/catalogo/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'catalogo-service', db: 'up' }),
    },
    {
      match: (url) => url === '/api/ordenes/health',
      reply: () =>
        ordenesOk
          ? jsonResponse({ status: 'ok', service: 'ordenes-service', db: 'up' })
          : jsonResponse(
              { status: 'error', service: 'ordenes-service', db: 'down' },
              503
            ),
    },
    {
      match: (url, method) =>
        method === 'GET' && url === '/api/catalogo/productos',
      reply: () => jsonResponse({ items: [], total: 0 }),
    },
    {
      match: (url, method) => method === 'GET' && url === '/api/ordenes',
      reply: () => jsonResponse({ items: [], total: 0 }),
    },
  ]);
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  const healthBar = screen.getByLabelText('Estado de servicios');
  expect(
    await within(healthBar).findByText('Catálogo: Operativo (db: up)')
  ).toBeInTheDocument();
  expect(
    within(healthBar).getByText('Órdenes: Operativo (db: up)')
  ).toBeInTheDocument();

  expect(fetchMock).toHaveBeenCalledWith('/api/catalogo/health');
  expect(fetchMock).toHaveBeenCalledWith('/api/ordenes/health');

  ordenesOk = false;
  fireEvent.click(screen.getByRole('button', { name: 'Refrescar estado' }));

  expect(
    await within(healthBar).findByText('Órdenes: Caído (db: down)')
  ).toBeInTheDocument();
});

test('FE-T03 Permite agregar producto al carrito y enviar POST /api/ordenes', async () => {
  const ordenCreada = {
    id: 10,
    clienteNombre: 'Ana Pérez',
    clienteEmail: 'ana@ejemplo.com',
    estado: 'CREADA',
    total: '179.80',
    items: [
      {
        productoId: 1,
        cantidad: 2,
        precioUnitario: '89.90',
        subtotal: '179.80',
      },
    ],
    createdAt: '2026-11-18T04:00:00Z',
  };

  const fetchMock = createFetchRouter([
    {
      match: (url) => url === '/api/catalogo/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'catalogo-service', db: 'up' }),
    },
    {
      match: (url) => url === '/api/ordenes/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'ordenes-service', db: 'up' }),
    },
    {
      match: (url, method) =>
        method === 'GET' && url === '/api/catalogo/productos',
      reply: () => jsonResponse({ items: [PRODUCTO_TECLADO], total: 1 }),
    },
    {
      match: (url, method) => method === 'GET' && url === '/api/ordenes',
      reply: () => jsonResponse({ items: [], total: 0 }),
    },
    {
      match: (url, method) => method === 'POST' && url === '/api/ordenes',
      reply: () => jsonResponse(ordenCreada, 201),
    },
  ]);
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  await screen.findByText('Teclado Mecánico');
  fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));
  expect(screen.getByText('Carrito actual (1)')).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Aumentar cantidad de Teclado Mecánico' })
  );

  fireEvent.change(screen.getByLabelText('Nombre del cliente'), {
    target: { value: 'Ana Pérez' },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'ana@ejemplo.com' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Crear orden' }));

  expect(
    await screen.findByText('Orden #10 creada (Total $179.80).')
  ).toBeInTheDocument();

  const postCall = fetchMock.mock.calls.find(
    ([url, opts]) => url === '/api/ordenes' && opts?.method === 'POST'
  );
  expect(postCall).toBeDefined();
  expect(postCall[1].headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(postCall[1].body)).toEqual({
    clienteNombre: 'Ana Pérez',
    clienteEmail: 'ana@ejemplo.com',
    items: [{ productoId: 1, cantidad: 2 }],
  });
});

test('FE-T04 Tras crear orden exitosa, refresca órdenes y catálogo y vacía el carrito', async () => {
  let ordenCreadaFlag = false;
  const ordenCreada = {
    id: 11,
    clienteNombre: 'Luis Gómez',
    clienteEmail: 'luis@ejemplo.com',
    estado: 'CREADA',
    total: '89.90',
    items: [
      {
        productoId: 1,
        cantidad: 1,
        precioUnitario: '89.90',
        subtotal: '89.90',
      },
    ],
    createdAt: '2026-11-18T04:10:00Z',
  };

  const fetchMock = createFetchRouter([
    {
      match: (url) => url === '/api/catalogo/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'catalogo-service', db: 'up' }),
    },
    {
      match: (url) => url === '/api/ordenes/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'ordenes-service', db: 'up' }),
    },
    {
      match: (url, method) =>
        method === 'GET' && url === '/api/catalogo/productos',
      reply: () =>
        jsonResponse({
          items: [
            {
              ...PRODUCTO_TECLADO,
              stock: ordenCreadaFlag ? 4 : 5,
            },
          ],
          total: 1,
        }),
    },
    {
      match: (url, method) => method === 'GET' && url === '/api/ordenes',
      reply: () =>
        jsonResponse({
          items: ordenCreadaFlag ? [ordenCreada] : [],
          total: ordenCreadaFlag ? 1 : 0,
        }),
    },
    {
      match: (url, method) => method === 'POST' && url === '/api/ordenes',
      reply: () => {
        ordenCreadaFlag = true;
        return jsonResponse(ordenCreada, 201);
      },
    },
  ]);
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  await screen.findByText('Teclado Mecánico');
  expect(screen.getByText('5')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));
  expect(screen.getByText('Carrito actual (1)')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Nombre del cliente'), {
    target: { value: 'Luis Gómez' },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'luis@ejemplo.com' },
  });

  fireEvent.click(screen.getByRole('button', { name: 'Crear orden' }));

  expect(await screen.findByText('#11')).toBeInTheDocument();
  expect(screen.getByText('Luis Gómez')).toBeInTheDocument();
  expect(screen.getByText('Carrito actual (0)')).toBeInTheDocument();
  expect(screen.getByText('El carrito está vacío.')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  const catalogoGets = fetchMock.mock.calls.filter(
    ([url, opts]) =>
      url === '/api/catalogo/productos' && (opts?.method || 'GET') === 'GET'
  );
  const ordenesGets = fetchMock.mock.calls.filter(
    ([url, opts]) => url === '/api/ordenes' && (opts?.method || 'GET') === 'GET'
  );
  expect(catalogoGets.length).toBeGreaterThanOrEqual(2);
  expect(ordenesGets.length).toBeGreaterThanOrEqual(2);
});

test('FE-T05 Muestra mensaje de error legible cuando una API responde 409/422/502', async () => {
  let ordenPostCount = 0;

  const fetchMock = createFetchRouter([
    {
      match: (url) => url === '/api/catalogo/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'catalogo-service', db: 'up' }),
    },
    {
      match: (url) => url === '/api/ordenes/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'ordenes-service', db: 'up' }),
    },
    {
      match: (url, method) =>
        method === 'GET' && url === '/api/catalogo/productos',
      reply: () => jsonResponse({ items: [PRODUCTO_TECLADO], total: 1 }),
    },
    {
      match: (url, method) => method === 'GET' && url === '/api/ordenes',
      reply: () => jsonResponse({ items: [], total: 0 }),
    },
    {
      match: (url, method) => method === 'POST' && url === '/api/ordenes',
      reply: () => {
        ordenPostCount += 1;
        if (ordenPostCount === 1) {
          return jsonResponse(
            {
              error: {
                codigo: 'STOCK_INSUFICIENTE',
                mensaje: 'Stock insuficiente para Teclado Mecánico',
              },
            },
            409
          );
        }
        return jsonResponse(
          {
            error: {
              codigo: 'CATALOGO_NO_DISPONIBLE',
              mensaje: 'No fue posible comunicarse con catalogo-service',
            },
          },
          502
        );
      },
    },
    {
      match: (url, method) =>
        method === 'POST' && url === '/api/catalogo/productos',
      reply: () =>
        jsonResponse(
          {
            error: {
              codigo: 'VALIDACION_ERROR',
              mensaje: 'Los datos del producto no son válidos',
            },
          },
          422
        ),
    },
  ]);
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  await screen.findByText('Teclado Mecánico');
  fireEvent.click(screen.getByRole('button', { name: 'Agregar al carrito' }));
  fireEvent.change(screen.getByLabelText('Nombre del cliente'), {
    target: { value: 'Ana Pérez' },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'ana@ejemplo.com' },
  });

  // 409 Conflict
  fireEvent.click(screen.getByRole('button', { name: 'Crear orden' }));
  expect(
    await screen.findByText('Stock insuficiente para Teclado Mecánico')
  ).toBeInTheDocument();

  // 502 Bad Gateway
  fireEvent.click(screen.getByRole('button', { name: 'Crear orden' }));
  expect(
    await screen.findByText('No fue posible comunicarse con catalogo-service')
  ).toBeInTheDocument();

  // 422 Unprocessable Entity
  const nuevoProdPanel = screen
    .getByRole('heading', { name: 'Nuevo producto' })
    .closest('.subpanel');
  const formScope = within(nuevoProdPanel);

  fireEvent.change(formScope.getByLabelText('SKU'), {
    target: { value: 'SKU-BAD' },
  });
  fireEvent.change(formScope.getByLabelText('Nombre'), {
    target: { value: 'Producto Inválido' },
  });
  fireEvent.change(formScope.getByLabelText('Categoría'), {
    target: { value: 'General' },
  });
  fireEvent.change(formScope.getByLabelText('Precio'), {
    target: { value: '10.00' },
  });
  fireEvent.change(formScope.getByLabelText('Stock'), {
    target: { value: '1' },
  });
  fireEvent.click(formScope.getByRole('button', { name: 'Crear producto' }));

  expect(
    await screen.findByText('Los datos del producto no son válidos')
  ).toBeInTheDocument();
  expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2);
});

test('FE-T06 Permite crear un producto nuevo con POST /api/catalogo/productos', async () => {
  let creado = false;
  const nuevoProducto = {
    id: 3,
    sku: 'SKU-003',
    nombre: 'Monitor 24',
    categoria: 'Monitores',
    precio: '199.99',
    stock: 8,
    activo: true,
  };

  const fetchMock = createFetchRouter([
    {
      match: (url) => url === '/api/catalogo/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'catalogo-service', db: 'up' }),
    },
    {
      match: (url) => url === '/api/ordenes/health',
      reply: () =>
        jsonResponse({ status: 'ok', service: 'ordenes-service', db: 'up' }),
    },
    {
      match: (url, method) =>
        method === 'GET' && url === '/api/catalogo/productos',
      reply: () =>
        jsonResponse({
          items: creado ? [PRODUCTO_TECLADO, nuevoProducto] : [PRODUCTO_TECLADO],
          total: creado ? 2 : 1,
        }),
    },
    {
      match: (url, method) => method === 'GET' && url === '/api/ordenes',
      reply: () => jsonResponse({ items: [], total: 0 }),
    },
    {
      match: (url, method) =>
        method === 'POST' && url === '/api/catalogo/productos',
      reply: () => {
        creado = true;
        return jsonResponse(nuevoProducto, 201);
      },
    },
  ]);
  vi.stubGlobal('fetch', fetchMock);

  render(<App />);

  await screen.findByText('Teclado Mecánico');

  const nuevoProdPanel = screen
    .getByRole('heading', { name: 'Nuevo producto' })
    .closest('.subpanel');
  const formScope = within(nuevoProdPanel);

  fireEvent.change(formScope.getByLabelText('SKU'), {
    target: { value: 'SKU-003' },
  });
  fireEvent.change(formScope.getByLabelText('Nombre'), {
    target: { value: 'Monitor 24' },
  });
  fireEvent.change(formScope.getByLabelText('Categoría'), {
    target: { value: 'Monitores' },
  });
  fireEvent.change(formScope.getByLabelText('Precio'), {
    target: { value: '199.99' },
  });
  fireEvent.change(formScope.getByLabelText('Stock'), {
    target: { value: '8' },
  });

  fireEvent.click(formScope.getByRole('button', { name: 'Crear producto' }));

  expect(
    await screen.findByText('Producto Monitor 24 registrado en el catálogo.')
  ).toBeInTheDocument();
  expect(await screen.findByText('Monitor 24')).toBeInTheDocument();
  expect(screen.getByText('SKU-003')).toBeInTheDocument();

  const postCall = fetchMock.mock.calls.find(
    ([url, opts]) =>
      url === '/api/catalogo/productos' && opts?.method === 'POST'
  );
  expect(postCall).toBeDefined();
  expect(postCall[1].headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(postCall[1].body)).toEqual({
    sku: 'SKU-003',
    nombre: 'Monitor 24',
    categoria: 'Monitores',
    precio: '199.99',
    stock: 8,
  });
});
