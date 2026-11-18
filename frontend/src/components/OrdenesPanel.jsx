import { useState } from 'react';

const ESTADOS_ORDEN = ['CREADA', 'PAGADA', 'ENVIADA', 'CANCELADA'];

export default function OrdenesPanel({
  carrito,
  ordenes,
  loading,
  error,
  onCambiarCantidad,
  onQuitarDelCarrito,
  onCrearOrden,
  onActualizarEstado,
}) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [estadoError, setEstadoError] = useState(null);

  async function handleCheckoutSubmit(event) {
    event.preventDefault();
    setCheckoutError(null);
    setCheckoutSuccess(null);

    if (carrito.length === 0) {
      setCheckoutError('Agrega al menos un producto al carrito.');
      return;
    }

    const nombre = clienteNombre.trim();
    const email = clienteEmail.trim();
    if (!nombre || !email) {
      setCheckoutError('Nombre y correo del cliente son obligatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const orden = await onCrearOrden({
        clienteNombre: nombre,
        clienteEmail: email,
        items: carrito.map((item) => ({
          productoId: item.producto.id,
          cantidad: item.cantidad,
        })),
      });
      setClienteNombre('');
      setClienteEmail('');
      setCheckoutSuccess(`Orden #${orden.id} creada (Total $${orden.total}).`);
    } catch (err) {
      setCheckoutError(err.message || 'No se pudo crear la orden.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCambiarEstado(ordenId, nuevoEstado) {
    setEstadoError(null);
    setUpdatingId(ordenId);
    try {
      await onActualizarEstado(ordenId, nuevoEstado);
    } catch (err) {
      setEstadoError(err.message || 'No se pudo actualizar el estado.');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="titulo-ordenes">
      <div className="panel-header">
        <h2 id="titulo-ordenes">Carrito y Órdenes</h2>
      </div>

      <div className="subpanel">
        <h3>Carrito actual ({carrito.length})</h3>
        {carrito.length === 0 ? (
          <p className="empty-state">El carrito está vacío.</p>
        ) : (
          <ul className="cart-list">
            {carrito.map(({ producto, cantidad }) => (
              <li key={producto.id} className="cart-item">
                <div>
                  <strong>{producto.nombre}</strong>
                  <span className="muted"> (${producto.precio} c/u)</span>
                </div>
                <div className="cart-controls">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={`Disminuir cantidad de ${producto.nombre}`}
                    onClick={() => onCambiarCantidad(producto.id, -1)}
                  >
                    -
                  </button>
                  <span className="qty-badge">{cantidad}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-label={`Aumentar cantidad de ${producto.nombre}`}
                    onClick={() => onCambiarCantidad(producto.id, 1)}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => onQuitarDelCarrito(producto.id)}
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {checkoutError && (
          <div role="alert" className="alert alert-error">
            {checkoutError}
          </div>
        )}
        {checkoutSuccess && (
          <div role="status" className="alert alert-success">
            {checkoutSuccess}
          </div>
        )}

        <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
          <div className="field">
            <label htmlFor="cliente-nombre">Nombre del cliente</label>
            <input
              id="cliente-nombre"
              type="text"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="cliente-email">Correo electrónico</label>
            <input
              id="cliente-email"
              type="email"
              value={clienteEmail}
              onChange={(e) => setClienteEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || carrito.length === 0}
          >
            {submitting ? 'Procesando orden...' : 'Crear orden'}
          </button>
        </form>
      </div>

      <div className="subpanel">
        <h3>Historial de órdenes</h3>
        {error && (
          <div role="alert" className="alert alert-error">
            {error}
          </div>
        )}
        {estadoError && (
          <div role="alert" className="alert alert-error">
            {estadoError}
          </div>
        )}
        {loading ? (
          <p role="status" className="loading-text">
            Cargando órdenes...
          </p>
        ) : ordenes.length === 0 ? (
          <p className="empty-state">No hay órdenes registradas.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr key={orden.id}>
                    <td>#{orden.id}</td>
                    <td>
                      <div>{orden.clienteNombre}</div>
                      <small className="muted">{orden.clienteEmail}</small>
                    </td>
                    <td className="num">${orden.total}</td>
                    <td>
                      <select
                        aria-label={`Estado de orden ${orden.id}`}
                        value={orden.estado}
                        disabled={updatingId === orden.id}
                        onChange={(e) =>
                          handleCambiarEstado(orden.id, e.target.value)
                        }
                      >
                        {ESTADOS_ORDEN.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
