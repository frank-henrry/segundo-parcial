'use strict';

const Decimal = require('decimal.js');
const db = require('../../core/db');

function formatearDinero(valor) {
  return new Decimal(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

function mapearItem(row) {
  return {
    id: row.id,
    productoId: row.producto_id,
    nombreProducto: row.nombre_producto,
    cantidad: row.cantidad,
    precioUnitario: formatearDinero(row.precio_unitario),
    subtotal: formatearDinero(row.subtotal),
  };
}

function mapearOrden(ordenRow) {
  return {
    id: ordenRow.id,
    clienteNombre: ordenRow.cliente_nombre,
    clienteEmail: ordenRow.cliente_email,
    estado: ordenRow.estado,
    total: formatearDinero(ordenRow.total),
    createdAt: ordenRow.created_at instanceof Date
      ? ordenRow.created_at.toISOString()
      : String(ordenRow.created_at),
  };
}

function mapearOrdenConItems(ordenRow, itemRows) {
  const orden = mapearOrden(ordenRow);
  return {
    id: orden.id,
    clienteNombre: orden.clienteNombre,
    clienteEmail: orden.clienteEmail,
    estado: orden.estado,
    total: orden.total,
    items: itemRows.map(mapearItem),
    createdAt: orden.createdAt,
  };
}

async function insertarOrdenConItems({
  clienteNombre,
  clienteEmail,
  estado = 'CREADA',
  total,
  items,
}) {
  return db.enTransaccion(async (client) => {
    const ordenResult = await client.query(
      `INSERT INTO ordenes (cliente_nombre, cliente_email, estado, total)
       VALUES ($1, $2, $3, $4)
       RETURNING id, cliente_nombre, cliente_email, estado, total, created_at`,
      [clienteNombre, clienteEmail, estado, formatearDinero(total)]
    );
    const ordenRow = ordenResult.rows[0];

    const itemRows = [];
    for (const item of items) {
      const itemResult = await client.query(
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
          ordenRow.id,
          item.productoId,
          item.nombreProducto,
          item.cantidad,
          formatearDinero(item.precioUnitario),
          formatearDinero(item.subtotal),
        ]
      );
      itemRows.push(itemResult.rows[0]);
    }

    return mapearOrdenConItems(ordenRow, itemRows);
  });
}

async function listarOrdenes() {
  const result = await db.query(
    `SELECT id, cliente_nombre, cliente_email, estado, total, created_at
     FROM ordenes
     ORDER BY created_at DESC, id DESC`
  );
  return result.rows.map(mapearOrden);
}

async function obtenerOrdenConItems(id) {
  const ordenResult = await db.query(
    `SELECT id, cliente_nombre, cliente_email, estado, total, created_at
     FROM ordenes
     WHERE id = $1`,
    [id]
  );
  if (ordenResult.rows.length === 0) {
    return null;
  }

  const itemsResult = await db.query(
    `SELECT id, orden_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal
     FROM orden_items
     WHERE orden_id = $1
     ORDER BY id ASC`,
    [id]
  );

  return mapearOrdenConItems(ordenResult.rows[0], itemsResult.rows);
}

async function actualizarEstado(id, estado) {
  const result = await db.query(
    `UPDATE ordenes
     SET estado = $1
     WHERE id = $2
     RETURNING id, cliente_nombre, cliente_email, estado, total, created_at`,
    [estado, id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapearOrden(result.rows[0]);
}

module.exports = {
  formatearDinero,
  mapearItem,
  mapearOrden,
  mapearOrdenConItems,
  insertarOrdenConItems,
  listarOrdenes,
  obtenerOrdenConItems,
  actualizarEstado,
};
