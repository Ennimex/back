const express = require('express');
const router = express.Router();

// Importar los modelos
const Nosotros = require('../models/Nosotros');
const Servicio = require('../models/Servicio');
const Contacto = require('../models/Contacto');
const Localidad = require('../models/Localidad');
const Tallas = require('../models/Tallas');
const Categorias = require("../models/Categorias");


// Middleware para todas las rutas (no requiere autenticación)

// Obtener información de Nosotros
router.get('/nosotros', async (req, res) => {
  try {
    const nosotros = await Nosotros.findOne();
    res.json(nosotros || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información' });
  }
});

// Obtener todos los servicios
router.get('/servicios', async (req, res) => {
  try {
    const servicios = await Servicio.find();
    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Obtener un servicio específico
router.get('/servicios/:id', async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json(servicio);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el servicio' });
  }
});

// Obtener todas las localidades
router.get('/localidades', async (req, res) => {
  try {
    const localidades = await Localidad.find();
    res.json(localidades);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener localidades' });
  }
});

// Ruta para obtener todas las tallas con su categoría
router.get('/tallas', async (req, res) => {
  try {
    const tallas = await Tallas.find().populate('categoriaId');
    res.json(tallas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tallas' });
  }
});


// Obtener información de contacto
router.get('/contacto', async (req, res) => {
  try {
    const contacto = await Contacto.findOne();
    res.json(contacto || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información de contacto' });
  }
});

// obtener todas las categorías
router.get('/categorias', async (req, res) => {
  try {
    const categorias = await Categorias.find();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});


module.exports = router;