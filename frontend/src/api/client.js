const CATALOGO_BASE = '/api/catalogo';
const ORDENES_BASE = '/api/ordenes';

/**
 * Ejecuta una petición HTTP relativa y normaliza errores JSON según PRY-R07.
 */
async function requestJson(url, options = {}) {
  const { headers = {}, ...rest } = options;
  const requestHeaders = rest.body
    ? { 'Content-Type': 'application/json', ...headers }
    : headers;

  const response = await fetch(url, {
    ...rest,
    headers: requestHeaders,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const mensaje =
      data?.error?.mensaje ||
      data?.detail ||
      data?.message ||
      `Error HTTP ${response.status}`;
    const err = new Error(mensaje);
    err.status = response.status;
    err.codigo = data?.error?.codigo || 'HTTP_ERROR';
    throw err;
  }

  return data;
}

async function checkServiceHealth(url) {
  try {
    const response = await fetch(url);
    const data = await response.json().catch(() => null);
    const ok = Boolean(response.ok && data?.status === 'ok');
    return {
      ok,
      status: data?.status || (ok ? 'ok' : 'error'),
      db: data?.db || (ok ? 'up' : 'down'),
      service: data?.service || '',
      error: ok ? null : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'error',
      db: 'down',
      service: '',
      error: err.message || 'Sin respuesta',
    };
  }
}

export async function fetchHealthServicios() {
  const [catalogo, ordenes] = await Promise.all([
    checkServiceHealth(`${CATALOGO_BASE}/health`),
    checkServiceHealth(`${ORDENES_BASE}/health`),
  ]);
  return { catalogo, ordenes };
}

export async function fetchCatalogo({ categoria = '', q = '' } = {}) {
  const params = new URLSearchParams();
  if (categoria.trim()) {
    params.set('categoria', categoria.trim());
  }
  if (q.trim()) {
    params.set('q', q.trim());
  }
  const query = params.toString();
  const url = query
    ? `${CATALOGO_BASE}/productos?${query}`
    : `${CATALOGO_BASE}/productos`;
  return requestJson(url);
}

export async function crearProducto(payload) {
  return requestJson(`${CATALOGO_BASE}/productos`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function actualizarStock(productoId, stock) {
  return requestJson(`${CATALOGO_BASE}/productos/${productoId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  });
}

export async function fetchOrdenes() {
  return requestJson(ORDENES_BASE);
}

export async function crearOrden(payload) {
  return requestJson(ORDENES_BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function actualizarEstadoOrden(ordenId, estado) {
  return requestJson(`${ORDENES_BASE}/${ordenId}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}
