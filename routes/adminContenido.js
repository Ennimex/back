const express = require("express");
const router = express.Router();
const { authenticate, checkRole } = require("../middlewares/auth");

// Importar los modelos necesarios (deberás crearlos)
const Nosotros = require("../models/Nosotros");
const Servicio = require("../models/Servicio");
const Contacto = require("../models/Contacto");
const Categoria = require("../models/Categorias");

// Importar controladores
const { createOrUpdateNosotros } = require('../controllers/nosotrosController');
const { createServicio, updateServicio, deleteServicio, upload } = require('../controllers/serviciosController');

// Middleware para todas las rutas
router.use(authenticate, checkRole(["admin"]));

// RUTAS PARA NOSOTROS
router.put("/nosotros", createOrUpdateNosotros);

// Rutas para obtener la infromacion de servicios
router.post("/servicios", upload.single('imagen'), createServicio);

// Rutas para actualizar un servicio
router.put("/servicios/:id", upload.single('imagen'), updateServicio);

// Rutas para eliminar un servicio
router.delete("/servicios/:id", deleteServicio);

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

module.exports = router;
