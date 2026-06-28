// routes/favoritosRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// Estas rutas se montan en index.js detrás de `authenticate`, por lo que
// req.user.id siempre está disponible aquí.

// GET /api/favoritos — lista los productos favoritos del usuario (poblados)
router.get('/', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: 'favoritos',
    populate: [
      { path: 'localidadId', select: 'nombre' },
      { path: 'tallasDisponibles', populate: { path: 'categoriaId' } },
    ],
  });

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  // Filtrar posibles referencias a productos ya eliminados (populate deja null)
  res.json((user.favoritos || []).filter(Boolean));
}));

// POST /api/favoritos/:productoId — agrega un producto a favoritos
router.post('/:productoId', asyncHandler(async (req, res) => {
  const { productoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productoId)) {
    return res.status(400).json({ error: 'ID de producto inválido' });
  }

  // $addToSet evita duplicados si ya estaba en la lista
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { favoritos: productoId } });
  res.json({ success: true, message: 'Producto agregado a favoritos' });
}));

// DELETE /api/favoritos/:productoId — quita un producto de favoritos
router.delete('/:productoId', asyncHandler(async (req, res) => {
  const { productoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(productoId)) {
    return res.status(400).json({ error: 'ID de producto inválido' });
  }

  await User.findByIdAndUpdate(req.user.id, { $pull: { favoritos: productoId } });
  res.json({ success: true, message: 'Producto quitado de favoritos' });
}));

module.exports = router;
