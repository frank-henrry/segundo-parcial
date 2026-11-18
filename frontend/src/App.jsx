import { useCallback, useEffect, useState } from 'react';
import {
  actualizarEstadoOrden,
  actualizarStock,
  crearOrden,
  crearProducto,
  fetchCatalogo,
  fetchHealthServicios,
  fetchOrdenes,
} from './api/client.js';
import CatalogoPanel from './components/CatalogoPanel.jsx';
import OrdenesPanel from './components/OrdenesPanel.jsx';

function HealthPill({ label, estado, loading }) {
  if (loading && !estado) {
    return (
      <span className="health-pill health-loading">
        {label}: Verificando...
      </span>
    );
  }
  const ok = Boolean(estado?.ok);
  return (
    <span className={`health-pill ${ok ? 'health-ok' : 'health-down'}`}>
      {label}: {ok ? 'Operativo' : 'Caído'} (db: {estado?.db || 'down'})
    </span>
  );
}

export default function App() {
  const [health, setHealth] = useState({ catalogo: null, ordenes: null });
  const [healthLoading, setHealthLoading] = useState(true);

  const [productos, setProductos] = useState([]);
  const [catalogoLoading, setCatalogoLoading] = useState(true);
  const [catalogoError, setCatalogoError] = useState(null);
  const [filtros, setFiltros] = useState({ q: '', categoria: '' });

  const [ordenes, setOrdenes] = useState([]);
  const [ordenesLoading, setOrdenesLoading] = useState(true);
  const [ordenesError, setOrdenesError] = useState(null);

  const [carrito, setCarrito] = useState([]);

  const cargarHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await fetchHealthServicios();
      setHealth(data);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const cargarCatalogo = useCallback(async (params = { q: '', categoria: '' }) => {
    setCatalogoLoading(true);
    setCatalogoError(null);
    try {
      const data = await fetchCatalogo(params);
      setProductos(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setCatalogoError(err.message || 'Error al cargar el catálogo.');
    } finally {
      setCatalogoLoading(false);
    }
  }, []);

  const cargarOrdenes = useCallback(async () => {
    setOrdenesLoading(true);
    setOrdenesError(null);
    try {
      const data = await fetchOrdenes();
      setOrdenes(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setOrdenesError(err.message || 'Error al cargar las órdenes.');
    } finally {
      setOrdenesLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarHealth();
    cargarCatalogo({ q: '', categoria: '' });
    cargarOrdenes();
  }, [cargarHealth, cargarCatalogo, cargarOrdenes]);

  function handleBuscarCatalogo(nuevosFiltros) {
    setFiltros(nuevosFiltros);
    cargarCatalogo(nuevosFiltros);
  }

  function handleAgregarAlCarrito(producto) {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.producto.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function handleCambiarCantidad(productoId, delta) {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.producto.id === productoId
            ? { ...item, cantidad: item.cantidad + delta }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  function handleQuitarDelCarrito(productoId) {
    setCarrito((prev) =>
      prev.filter((item) => item.producto.id !== productoId)
    );
  }

  async function handleCrearProducto(payload) {
    await crearProducto(payload);
    await cargarCatalogo(filtros);
  }

  async function handleActualizarStock(productoId, stock) {
    await actualizarStock(productoId, stock);
    await cargarCatalogo(filtros);
  }

  async function handleCrearOrden(payload) {
    const orden = await crearOrden(payload);
    setCarrito([]);
    await Promise.all([cargarOrdenes(), cargarCatalogo(filtros)]);
    return orden;
  }

  async function handleActualizarEstado(ordenId, estado) {
    await actualizarEstadoOrden(ordenId, estado);
    await cargarOrdenes();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>ecommerce-k8s</h1>
          <p className="subtitle">
            Catálogo de productos y gestión de órdenes
          </p>
        </div>
        <div className="health-bar" aria-label="Estado de servicios">
          <HealthPill
            label="Catálogo"
            estado={health.catalogo}
            loading={healthLoading}
          />
          <HealthPill
            label="Órdenes"
            estado={health.ordenes}
            loading={healthLoading}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={cargarHealth}
            disabled={healthLoading}
          >
            Refrescar estado
          </button>
        </div>
      </header>

      <main className="main-grid">
        <CatalogoPanel
          productos={productos}
          loading={catalogoLoading}
          error={catalogoError}
          filtros={filtros}
          onBuscar={handleBuscarCatalogo}
          onAgregarAlCarrito={handleAgregarAlCarrito}
          onCrearProducto={handleCrearProducto}
          onActualizarStock={handleActualizarStock}
        />

        <OrdenesPanel
          carrito={carrito}
          ordenes={ordenes}
          loading={ordenesLoading}
          error={ordenesError}
          onCambiarCantidad={handleCambiarCantidad}
          onQuitarDelCarrito={handleQuitarDelCarrito}
          onCrearOrden={handleCrearOrden}
          onActualizarEstado={handleActualizarEstado}
        />
      </main>
    </div>
  );
}
