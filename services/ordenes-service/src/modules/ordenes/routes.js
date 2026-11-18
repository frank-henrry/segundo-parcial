'use strict';

const express = require('express');
const { manejar } = require('../../core/errors');
const service = require('./service');

const router = express.Router();

router.get(
  '/',
  manejar(async (_req, res) => {
    const resultado = await service.listar();
    return res.status(200).json(resultado);
  })
);

router.get(
  '/:id(\\d+)',
  manejar(async (req, res) => {
    const orden = await service.obtenerPorId(req.params.id);
    return res.status(200).json(orden);
  })
);

router.post(
  '/',
  manejar(async (req, res) => {
    const orden = await service.crearOrden(req.body);
    return res.status(201).json(orden);
  })
);

router.patch(
  '/:id(\\d+)/estado',
  manejar(async (req, res) => {
    const orden = await service.cambiarEstado(req.params.id, req.body);
    return res.status(200).json(orden);
  })
);

module.exports = router;
