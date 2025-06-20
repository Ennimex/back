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

// Editar información de usuario
router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, phone, role } = req.body;
    
    // Preparar los campos a actualizar
    const updateData = {};
    
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (role) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      updateData.role = role;
    }
    
    // Si se intenta cambiar el correo, verificar que no exista
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'El correo electrónico ya está en uso por otro usuario' });
      }
      updateData.email = email;
    }
    
    // Actualizar usuario
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      data: user,
      message: 'Usuario actualizado exitosamente'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages });
    }
    res.status(500).json({ error: 'Error al actualizar el usuario' });
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

// Agregar un nuevo usuario
router.post('/users', async (req, res) => {
  try {
    const { name, email, phone, password, role = 'user' } = req.body;

    // Validar que el correo no exista
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    // Validar rol
    if (role && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Crear nuevo usuario
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role
    });

    // Eliminar la contraseña del objeto de respuesta
    user.password = undefined;

    res.status(201).json({
      success: true,
      data: user,
      message: 'Usuario creado exitosamente'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages });
    }
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

module.exports = router;