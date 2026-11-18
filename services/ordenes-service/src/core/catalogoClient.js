'use strict';

const axios = require('axios');
const config = require('./config');
const { ErrorApp } = require('./errors');

const TIMEOUT_MS = 5000;

async function reservarStock(productoId, cantidad) {
  const url = `${config.catalogoUrl}/api/catalogo/productos/${productoId}/reservar`;
  try {
    const response = await axios.post(
      url,
      { cantidad },
      {
        timeout: TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (err) {
    if (err && err.response) {
      const { status, data } = err.response;
      if (status === 404 || status === 409) {
        const codigoDefecto = status === 404 ? 'PRODUCTO_NO_ENCONTRADO' : 'STOCK_INSUFICIENTE';
        const mensajeDefecto = status === 404
          ? 'Producto no encontrado en catálogo'
          : 'Stock insuficiente para reservar';
        const codigo = (data && data.error && data.error.codigo) || codigoDefecto;
        const mensaje = (data && data.error && data.error.mensaje) || mensajeDefecto;
        throw new ErrorApp(codigo, mensaje, status);
      }
      if (status >= 400 && status < 500) {
        const codigo = (data && data.error && data.error.codigo) || 'SOLICITUD_CATALOGO_INVALIDA';
        const mensaje = (data && data.error && data.error.mensaje) || 'Solicitud rechazada por catálogo';
        throw new ErrorApp(codigo, mensaje, status);
      }
    }
    throw new ErrorApp(
      'CATALOGO_NO_DISPONIBLE',
      'El servicio de catálogo no está disponible',
      502
    );
  }
}

module.exports = {
  reservarStock,
};
