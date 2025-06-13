// routes/auth.js
// Este archivo contiene las rutas de autenticación (login y registro) para la API.
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user._id, user.role);
    res.json({ token, user: { role: user.role } });

  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Añadir esta ruta después de las importaciones existentes
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, apellido, telefono } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    
    // Crear nuevo usuario
    const user = new User({
      email,
      password, // El hash se hace automáticamente por el middleware
      nombre,
      apellido,
      telefono,
      role: 'user' // Por defecto es 'user'
    });
    
    await user.save();
    
    // Ya no enviamos el token, solo un mensaje de éxito
    res.status(201).json({ 
      success: true,
      message: 'Usuario registrado exitosamente'
    });
    
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

module.exports = router;