'use strict';

const Decimal = require('decimal.js');
const catalogoClient = require('../../core/catalogoClient');
const { ErrorApp } = require('../../core/errors');
const {
  ordenIdSchema,
  crearOrdenSchema,
  cambiarEstadoSchema,
} = require('./schemas');
const repository = require('./repository');

function parsearPrecioCatalogo(valor) {
  if (valor === null || valor === undefined || typeof valor === 'boolean') {
    throw new ErrorApp(
      'RESPUESTA_CATALOGO_INVALIDA',
      'Precio inválido recibido desde catálogo',
      502
    );
  }
  try {
    const decimal = new Decimal(valor);
    if (!decimal.isFinite() || decimal.isNegative()) {
      throw new Error('Precio fuera de rango');
    }
    return decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } catch (_err) {
    throw new ErrorApp(
      'RESPUESTA_CATALOGO_INVALIDA',
      'Precio inválido recibido desde catálogo',
      502
    );
  }
}

async function crearOrden(datos) {
  const payload = crearOrdenSchema.parse(datos ?? {});

  const itemsCalculados = [];
  let total = new Decimal(0);

  for (const item of payload.items) {
    const producto = await catalogoClient.reservarStock(item.productoId, item.cantidad);
    const precioUnitario = parsearPrecioCatalogo(producto && producto.precio);
    const subtotal = precioUnitario
      .times(item.cantidad)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    total = total.plus(subtotal).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    const nombreProducto = producto && typeof producto.nombre === 'string' && producto.nombre.trim()
      ? producto.nombre.trim().slice(0, 160)
      : `Producto ${item.productoId}`;

    itemsCalculados.push({
      productoId: item.productoId,
      nombreProducto,
      cantidad: item.cantidad,
      precioUnitario: precioUnitario.toFixed(2),
      subtotal: subtotal.toFixed(2),
    });
  }

  return repository.insertarOrdenConItems({
    clienteNombre: payload.clienteNombre,
    clienteEmail: payload.clienteEmail,
    estado: 'CREADA',
    total: total.toFixed(2),
    items: itemsCalculados,
  });
}

async function listar() {
  const items = await repository.listarOrdenes();
  return {
    items,
    total: items.length,
  };
}

async function obtenerPorId(id) {
  const ordenId = ordenIdSchema.parse(id);
  const orden = await repository.obtenerOrdenConItems(ordenId);
  if (!orden) {
    throw new ErrorApp(
      'ORDEN_NO_ENCONTRADA',
      `Orden con id ${ordenId} no encontrada`,
      404
    );
  }
  return orden;
}

async function cambiarEstado(id, datos) {
  const ordenId = ordenIdSchema.parse(id);
  const payload = cambiarEstadoSchema.parse(datos ?? {});
  const orden = await repository.actualizarEstado(ordenId, payload.estado);
  if (!orden) {
    throw new ErrorApp(
      'ORDEN_NO_ENCONTRADA',
      `Orden con id ${ordenId} no encontrada`,
      404
    );
  }
  return orden;
}

module.exports = {
  crearOrden,
  listar,
  obtenerPorId,
  cambiarEstado,
};
