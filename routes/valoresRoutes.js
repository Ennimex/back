// routes/valoresRoutes.js
const express = require("express");
const router = express.Router();
const {
  getValores,
  createValor,
  updateValor,
  deleteValor,
} = require("../controllers/valoresController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Público
router.get("/", getValores);

// Admin
router.post("/", authenticate, isAdmin, createValor);
router.put("/:id", authenticate, isAdmin, updateValor);
router.delete("/:id", authenticate, isAdmin, deleteValor);

module.exports = router;
