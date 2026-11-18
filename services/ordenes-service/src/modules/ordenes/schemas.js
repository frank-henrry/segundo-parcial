'use strict';

const { z } = require('zod');

const ESTADOS_ORDEN = ['CREADA', 'PAGADA', 'ENVIADA', 'CANCELADA'];

const ordenIdSchema = z.preprocess(
  (valor) => {
    if (typeof valor === 'string' && /^\d+$/.test(valor.trim())) {
      return Number(valor.trim());
    }
    return valor;
  },
  z
    .number({
      required_error: 'id es obligatorio',
      invalid_type_error: 'id debe ser un entero positivo',
    })
    .int('id debe ser un entero positivo')
    .min(1, 'id debe ser mayor o igual a 1')
    .max(2147483647, 'id excede el máximo permitido')
);

const itemOrdenSchema = z.object({
  productoId: z
    .number({
      required_error: 'productoId es obligatorio',
      invalid_type_error: 'productoId debe ser un entero',
    })
    .int('productoId debe ser un entero')
    .min(1, 'productoId debe ser mayor o igual a 1')
    .max(2147483647, 'productoId excede el máximo permitido'),
  cantidad: z
    .number({
      required_error: 'cantidad es obligatoria',
      invalid_type_error: 'cantidad debe ser un entero',
    })
    .int('cantidad debe ser un entero')
    .min(1, 'cantidad debe ser mayor o igual a 1')
    .max(2147483647, 'cantidad excede el máximo permitido'),
});

const crearOrdenSchema = z.object({
  clienteNombre: z
    .string({
      required_error: 'clienteNombre es obligatorio',
      invalid_type_error: 'clienteNombre debe ser texto',
    })
    .trim()
    .min(1, 'clienteNombre no puede estar vacío')
    .max(160, 'clienteNombre no puede exceder 160 caracteres'),
  clienteEmail: z
    .string({
      required_error: 'clienteEmail es obligatorio',
      invalid_type_error: 'clienteEmail debe ser texto',
    })
    .trim()
    .email('clienteEmail debe ser un correo válido')
    .max(255, 'clienteEmail no puede exceder 255 caracteres'),
  items: z
    .array(itemOrdenSchema, {
      required_error: 'items es obligatorio',
      invalid_type_error: 'items debe ser un arreglo',
    })
    .min(1, 'items debe contener al menos un producto'),
});

const cambiarEstadoSchema = z.object({
  estado: z.enum(ESTADOS_ORDEN, {
    errorMap: () => ({
      message: `estado debe ser uno de: ${ESTADOS_ORDEN.join(', ')}`,
    }),
  }),
});

module.exports = {
  ESTADOS_ORDEN,
  ordenIdSchema,
  itemOrdenSchema,
  crearOrdenSchema,
  cambiarEstadoSchema,
};
