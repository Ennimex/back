const express = require("express");
const router = express.Router();
const { getPublicas, getTodas, crear, actualizar, eliminar } = require("../controllers/preguntasController");
const { authenticate, isAdmin } = require("../middlewares/auth");

router.get("/", getPublicas);
router.get("/todas", authenticate, isAdmin, getTodas);
router.post("/", authenticate, isAdmin, crear);
router.put("/:id", authenticate, isAdmin, actualizar);
router.delete("/:id", authenticate, isAdmin, eliminar);

module.exports = router;
