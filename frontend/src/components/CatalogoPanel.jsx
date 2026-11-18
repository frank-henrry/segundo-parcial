import { useEffect, useState } from 'react';

const FORM_INICIAL = {
  sku: '',
  nombre: '',
  categoria: '',
  precio: '',
  stock: '0',
};

export default function CatalogoPanel({
  productos,
  loading,
  error,
  filtros,
  onBuscar,
  onAgregarAlCarrito,
  onCrearProducto,
  onActualizarStock,
}) {
  const [busqueda, setBusqueda] = useState(filtros.q || '');
  const [categoria, setCategoria] = useState(filtros.categoria || '');
  const [form, setForm] = useState(FORM_INICIAL);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [stockDrafts, setStockDrafts] = useState({});
  const [stockError, setStockError] = useState(null);
  const [updatingStockId, setUpdatingStockId] = useState(null);

  useEffect(() => {
    setBusqueda(filtros.q || '');
    setCategoria(filtros.categoria || '');
  }, [filtros.q, filtros.categoria]);

  function handleFiltrar(event) {
    event.preventDefault();
    onBuscar({ q: busqueda, categoria });
  }

  function handleLimpiar() {
    setBusqueda('');
    setCategoria('');
    onBuscar({ q: '', categoria: '' });
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCrearSubmit(event) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const sku = form.sku.trim();
    const nombre = form.nombre.trim();
    const cat = form.categoria.trim();
    const precio = form.precio.trim();
    const stockNum = Number(form.stock);

    if (!sku || !nombre || !cat) {
      setFormError('SKU, nombre y categoría son obligatorios.');
      return;
    }
    if (!precio || Number(precio) <= 0 || Number.isNaN(Number(precio))) {
      setFormError('El precio debe ser mayor a 0.');
      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setFormError('El stock debe ser un entero mayor o igual a 0.');
      return;
    }

    setSubmitting(true);
    try {
      await onCrearProducto({
        sku,
        nombre,
        categoria: cat,
        precio,
        stock: stockNum,
      });
      setForm(FORM_INICIAL);
      setFormSuccess(`Producto ${nombre} registrado en el catálogo.`);
    } catch (err) {
      setFormError(err.message || 'No se pudo crear el producto.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuardarStock(producto) {
    setStockError(null);
    const raw = stockDrafts[producto.id] ?? String(producto.stock);
    const nuevoStock = Number(raw);
    if (!Number.isInteger(nuevoStock) || nuevoStock < 0) {
      setStockError('El stock debe ser un entero mayor o igual a 0.');
      return;
    }

    setUpdatingStockId(producto.id);
    try {
      await onActualizarStock(producto.id, nuevoStock);
    } catch (err) {
      setStockError(err.message || 'No se pudo actualizar el stock.');
    } finally {
      setUpdatingStockId(null);
    }
  }

  return (
    <section className="panel" aria-labelledby="titulo-catalogo">
      <div className="panel-header">
        <h2 id="titulo-catalogo">Catálogo de Productos</h2>
      </div>

      <form className="filter-bar" onSubmit={handleFiltrar}>
        <div className="field">
          <label htmlFor="filtro-q">Buscar producto</label>
          <input
            id="filtro-q"
            type="text"
            placeholder="Nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="filtro-categoria">Categoría</label>
          <input
            id="filtro-categoria"
            type="text"
            placeholder="Categoría..."
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
        </div>
        <div className="filter-actions">
          <button type="submit" className="btn btn-secondary">
            Buscar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleLimpiar}
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="alert alert-error">
          {error}
        </div>
      )}

      {stockError && (
        <div role="alert" className="alert alert-error">
          {stockError}
        </div>
      )}

      {loading ? (
        <p role="status" className="loading-text">
          Cargando catálogo...
        </p>
      ) : productos.length === 0 ? (
        <p className="empty-state">No hay productos disponibles.</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => {
                const draftValue =
                  stockDrafts[producto.id] ?? String(producto.stock);
                return (
                  <tr key={producto.id}>
                    <td>
                      <code>{producto.sku}</code>
                    </td>
                    <td>{producto.nombre}</td>
                    <td>{producto.categoria}</td>
                    <td className="num">${producto.precio}</td>
                    <td className="num">
                      <span
                        className={
                          producto.stock > 0 ? 'stock-ok' : 'stock-zero'
                        }
                      >
                        {producto.stock}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={producto.stock <= 0}
                          onClick={() => onAgregarAlCarrito(producto)}
                        >
                          Agregar al carrito
                        </button>
                        <div className="stock-inline">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            aria-label={`Stock de ${producto.nombre}`}
                            value={draftValue}
                            onChange={(e) =>
                              setStockDrafts((prev) => ({
                                ...prev,
                                [producto.id]: e.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={updatingStockId === producto.id}
                            onClick={() => handleGuardarStock(producto)}
                          >
                            {updatingStockId === producto.id
                              ? '...'
                              : 'Ajustar'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="subpanel">
        <h3>Nuevo producto</h3>
        {formError && (
          <div role="alert" className="alert alert-error">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div role="status" className="alert alert-success">
            {formSuccess}
          </div>
        )}
        <form className="form-grid" onSubmit={handleCrearSubmit}>
          <div className="field">
            <label htmlFor="prod-sku">SKU</label>
            <input
              id="prod-sku"
              name="sku"
              type="text"
              value={form.sku}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="prod-nombre">Nombre</label>
            <input
              id="prod-nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="prod-categoria">Categoría</label>
            <input
              id="prod-categoria"
              name="categoria"
              type="text"
              value={form.categoria}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="prod-precio">Precio</label>
            <input
              id="prod-precio"
              name="precio"
              type="number"
              step="0.01"
              min="0.01"
              value={form.precio}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="prod-stock">Stock</label>
            <input
              id="prod-stock"
              name="stock"
              type="number"
              step="1"
              min="0"
              value={form.stock}
              onChange={handleFormChange}
              required
            />
          </div>
          <div className="form-submit">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
