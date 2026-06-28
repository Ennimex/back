const express = require("express");
const router = express.Router();
const { authenticate, checkRole } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

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

// RUTAS PARA INFORMACIÓN DE CONTACTO
router.put("/contacto", asyncHandler(async (req, res) => {
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
}));

// Ruta para obtener todas las categorías
router.get("/categorias", asyncHandler(async (req, res) => {
  const categorias = await Categoria.find();
  res.json(categorias);
}));

module.exports = router;
