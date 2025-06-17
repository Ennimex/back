const express = require("express");
const router = express.Router();
const { authenticate, checkRole } = require("../middlewares/auth");

// Importar los modelos necesarios (deberás crearlos)
const Nosotros = require("../models/Nosotros");
const Servicio = require("../models/Servicio");
const Contacto = require("../models/Contacto");
const Categoria = require("../models/Categorias");

// Middleware para todas las rutas
router.use(authenticate, checkRole(["admin"]));

// RUTAS PARA NOSOTROS
router.put("/nosotros", async (req, res) => {
  try {
    const { mision, vision, valores } = req.body;
    let nosotros = await Nosotros.findOne();

    if (!nosotros) {
      nosotros = new Nosotros({ mision, vision, valores });
    } else {
      nosotros.mision = mision;
      nosotros.vision = vision;
      nosotros.valores = valores;
    }

    await nosotros.save();
    res.json(nosotros);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al actualizar información de Nosotros" });
  }
});

// Rutas para obtener la infromacion de servicios
router.post("/servicios", async (req, res) => {
  try {
    const servicio = new Servicio(req.body);
    await servicio.save();
    res.status(201).json(servicio);
  } catch (error) {
    res.status(500).json({ error: "Error al crear servicio" });
  }
});

// Rutas para actualizar un servicio
router.put("/servicios/:id", async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!servicio) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }
    res.json(servicio);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar servicio" });
  }
});

// Rutas para eliminar un servicio
router.delete("/servicios/:id", async (req, res) => {
  try {
    const servicio = await Servicio.findByIdAndDelete(req.params.id);
    if (!servicio) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }
    res.json({ message: "Servicio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar servicio" });
  }
});

// RUTAS PARA PROYECTOS
router.post("/proyectos", async (req, res) => {
  try {
    const proyecto = new Proyecto(req.body);
    await proyecto.save();
    res.status(201).json(proyecto);
  } catch (error) {
    res.status(500).json({ error: "Error al crear proyecto" });
  }
});

router.put("/proyectos/:id", async (req, res) => {
  try {
    const proyecto = await Proyecto.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    if (!proyecto) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar proyecto" });
  }
});

router.delete("/proyectos/:id", async (req, res) => {
  try {
    const proyecto = await Proyecto.findByIdAndDelete(req.params.id);
    if (!proyecto) {
      return res.status(404).json({ error: "Proyecto no encontrado" });
    }
    res.json({ message: "Proyecto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar proyecto" });
  }
});

// RUTAS PARA INFORMACIÓN DE CONTACTO
router.put("/contacto", async (req, res) => {
  try {
    const { direccion, telefono, email, horario } = req.body;
    let contacto = await Contacto.findOne();

    if (!contacto) {
      contacto = new Contacto({ direccion, telefono, email, horario });
    } else {
      contacto.direccion = direccion;
      contacto.telefono = telefono;
      contacto.email = email;
      contacto.horario = horario;
    }

    await contacto.save();
    res.json(contacto);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al actualizar información de contacto" });
  }
});

// Ruta para obtener todas las categorías
router.get("/categorias", async (req, res) => {
  try {
    const categorias = await Categoria.find();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

//Ruta para crear una nueva talla

//obtener solo una talla
// GET /api/tallas/:id
router.get('/tallas/:id', async (req, res) => {
  try {
    const talla = await Tallas.findById(req.params.id).populate('categoriaId');
    if (!talla) return res.status(404).json({ error: 'Talla no encontrada' });
    res.json(talla);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar la talla' });
  }
});

// crear una nueva talla
router.post('/tallas', async (req, res) => {
  try {
    const nuevaTalla = new Tallas(req.body);
    await nuevaTalla.save();
    res.status(201).json(nuevaTalla);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear la talla' });
  }
});

// actualizar una talla existente
router.put('/tallas/:id', async (req, res) => {
  try {
    const tallaActualizada = await Tallas.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!tallaActualizada) return res.status(404).json({ error: 'Talla no encontrada' });
    res.json(tallaActualizada);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar la talla' });
  }
});

// eliminar una tallas
router.delete('/tallas/:id', async (req, res) => {
  try {
    const tallaEliminada = await Tallas.findByIdAndDelete(req.params.id);
    if (!tallaEliminada) return res.status(404).json({ error: 'Talla no encontrada' });
    res.json({ mensaje: 'Talla eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la talla' });
  }
});



















module.exports = router;
