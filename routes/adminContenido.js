const express = require("express");
const router = express.Router();
const { authenticate, checkRole } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

// Importar los modelos necesarios (deberás crearlos)
const Nosotros = require("../models/Nosotros");
const Servicio = require("../models/Servicio");
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

// Los datos de contacto se editan en /api/configuracion (ConfiguracionSitio);
// la ruta PUT /contacto que escribía al modelo duplicado "Contacto" se retiró.

// Ruta para obtener todas las categorías
router.get("/categorias", asyncHandler(async (req, res) => {
  const categorias = await Categoria.find();
  res.json(categorias);
}));

module.exports = router;
