'use strict';

class ErrorApp extends Error {
  constructor(codigo, mensajeOStatus = 'Error en la solicitud', statusCode = 400) {
    let mensaje = mensajeOStatus;
    let status = statusCode;
    if (typeof mensajeOStatus === 'number') {
      status = mensajeOStatus;
      mensaje = typeof statusCode === 'string'
        ? statusCode
        : String(codigo || 'Error en la solicitud');
    }
    super(String(mensaje || 'Error en la solicitud'));
    this.name = 'ErrorApp';
    this.codigo = String(codigo || 'ERROR_APLICACION').toUpperCase();
    this.mensaje = String(mensaje || 'Error en la solicitud');
    this.statusCode = Number.isInteger(status) ? status : 400;
  }
}

function construirError(codigo, mensaje) {
  return {
    error: {
      codigo: String(codigo || 'ERROR_INTERNO').toUpperCase(),
      mensaje: String(mensaje || 'Error interno del servidor'),
    },
  };
}

function manejar(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function manejadorNoEncontrado(_req, res) {
  return res.status(404).json(construirError('NO_ENCONTRADO', 'Ruta no encontrada'));
}

function manejadorErrores(err, _req, res, _next) {
  if (err instanceof ErrorApp) {
    return res.status(err.statusCode).json(construirError(err.codigo, err.mensaje));
  }

  if (err && err.name === 'ZodError' && Array.isArray(err.issues)) {
    const detalles = err.issues
      .map((issue) => {
        const ruta = Array.isArray(issue.path) && issue.path.length > 0
          ? `${issue.path.join('.')}: `
          : '';
        return `${ruta}${issue.message}`;
      })
      .join('; ');
    return res
      .status(422)
      .json(construirError('VALIDACION_ERROR', detalles || 'Datos de entrada inválidos'));
  }

  if (err && err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json(construirError('JSON_INVALIDO', 'El cuerpo JSON de la solicitud es inválido'));
  }

  return res
    .status(500)
    .json(construirError('ERROR_INTERNO', 'Error interno del servidor'));
}

module.exports = {
  ErrorApp,
  construirError,
  manejar,
  manejadorNoEncontrado,
  manejadorErrores,
};
