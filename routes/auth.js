// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ms = require('ms');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/email');

// URL base del frontend (primer origen de FRONTEND_URL) para armar enlaces
const getFrontendBase = () => {
  const origins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins[0] || 'http://localhost:3000';
};

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

    // Generar token con manejo de errores
    let token;
    try {
      token = user.getSignedJwtToken();
    } catch (tokenError) {
      console.error('❌ Error generando JWT token:', tokenError);
      return res.status(500).json({ 
        error: 'Error interno del servidor al generar token',
        details: tokenError.message 
      });
    }

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

// Solicitar recuperación de contraseña: genera token y envía el correo
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'El correo es requerido' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Respuesta genérica: no revelar si el correo existe o no (anti-enumeración)
    const genericMsg = {
      success: true,
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    };

    if (!user) {
      return res.json(genericMsg);
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // HashRouter en el frontend → el enlace lleva /#/
    const resetUrl = `${getFrontendBase()}/#/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (mailErr) {
      // Si falla el envío, limpiar el token para no dejar uno colgado
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Error enviando correo de recuperación:', mailErr.message);
      return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta más tarde.' });
    }

    res.json(genericMsg);
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Restablecer contraseña con el token recibido por correo
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Hashear el token recibido para compararlo con el almacenado
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ error: 'El enlace es inválido o ha expirado. Solicita uno nuevo.' });
    }

    user.password = password; // el hook pre('save') lo encripta
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
});

module.exports = router;