// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ms = require('ms');

router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Intento de login:', { email: req.body.email });
    
    const { email, password } = req.body;
    
    // Validar que los campos estén presentes
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = await User.findOne({ email }).select('+password');
    console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas - Usuario no encontrado' });
    }

    const isPasswordValid = await user.matchPassword(password);
    console.log('🔑 Contraseña válida:', isPasswordValid ? 'Sí' : 'No');

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas - Contraseña incorrecta' });
    }

    const token = user.getSignedJwtToken();
    const expiresIn = process.env.JWT_EXPIRE || '1h';
    
    console.log('✅ Login exitoso para:', user.email);
    console.log('🕐 JWT_EXPIRE from env:', process.env.JWT_EXPIRE);
    console.log('🕐 expiresIn value:', expiresIn);
    
    // Calcular la expiración del token correctamente
    const expirationTime = ms(expiresIn);
    console.log('🕐 expirationTime (ms):', expirationTime);
    const tokenExpiration = new Date(Date.now() + expirationTime).getTime();
    
    res.json({ 
      token, 
      user: { role: user.role, email: user.email, name: user.name },
      expiresIn,
      tokenExpiration
    });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: error.message 
    });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Crear nuevo usuario
    const user = new User({
      name,
      email,
      password,
      phone,
      role: 'user',
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

module.exports = router;