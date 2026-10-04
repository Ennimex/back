const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { crear, listar, actualizar, eliminar } = require("../controllers/buzonController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Mismo límite anti-spam que el formulario de contacto. En pruebas se omite
// porque un solo archivo de pruebas envía más de 5 mensajes seguidos.
const buzonLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Has enviado demasiados mensajes. Intenta más tarde." },
});

router.post("/", buzonLimiter, crear);
router.get("/", authenticate, isAdmin, listar);
router.patch("/:id", authenticate, isAdmin, actualizar);
router.delete("/:id", authenticate, isAdmin, eliminar);

module.exports = router;
