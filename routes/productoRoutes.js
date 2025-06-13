// routes/productoRoutes.js
const express = require('express');
const router = express.Router();
// Importa específicamente createProducto y upload desde el controlador
const { createProducto, getProductos, deleteProducto, updateProducto, upload } = require('../controllers/productoController');
// Importa el middleware de autenticación y autorización
const { authenticate, isAdmin } = require("../middlewares/auth");

// Ruta para obtener todos los productos
router.get('/', getProductos);


router.post('/', authenticate, isAdmin, upload.single('imagen'), createProducto);


router.delete('/:id', authenticate, isAdmin, upload.single('imagen'), deleteProducto);


router.put('/:id',authenticate, isAdmin, upload.single('imagen'), updateProducto);



module.exports = router;