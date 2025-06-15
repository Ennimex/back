// routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate, checkRole } = require('../middlewares/auth');
const User = require('../models/User');

// Middleware para todas las rutas de admin
router.use(authenticate, checkRole(['admin']));

// Ruta del dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    res.json({
      message: `Bienvenido, ${req.user.role}`,
      stats: {
        totalUsers,
        totalSales: 0,
        totalOrders: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
});

// Obtener todos los usuarios
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Cambiar rol de usuario
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
});

// Eliminar usuario
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;