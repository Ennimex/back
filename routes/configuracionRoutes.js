// routes/configuracionRoutes.js
const express = require("express");
const router = express.Router();
const {
  getConfiguracion,
  updateConfiguracion,
  upload,
} = require("../controllers/configuracionController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Pública: cualquier visitante puede leer la configuración del sitio
router.get("/", getConfiguracion);

// Admin: actualizar configuración (incluye logo opcional como 'logo')
router.put("/", authenticate, isAdmin, upload.single("logo"), updateConfiguracion);

module.exports = router;
