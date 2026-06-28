// routes/colaboradoresRoutes.js
const express = require("express");
const router = express.Router();
const {
  getColaboradores,
  createColaborador,
  updateColaborador,
  deleteColaborador,
  upload,
} = require("../controllers/colaboradoresController");
const { authenticate, isAdmin } = require("../middlewares/auth");

// Público
router.get("/", getColaboradores);

// Admin (foto opcional en el campo 'imagen')
router.post("/", authenticate, isAdmin, upload.single("imagen"), createColaborador);
router.put("/:id", authenticate, isAdmin, upload.single("imagen"), updateColaborador);
router.delete("/:id", authenticate, isAdmin, deleteColaborador);

module.exports = router;
