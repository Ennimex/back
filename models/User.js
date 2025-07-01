// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Por favor ingresa tu nombre completo'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Por favor ingresa tu correo electrónico'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor ingresa un correo válido',
    ],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Por favor ingresa tu número de teléfono'],
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Por favor ingresa una contraseña'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
    select: false, // No devolver la contraseña por defecto en consultas
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
});

// Encriptar contraseña antes de guardar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Firmar JWT y devolver
UserSchema.methods.getSignedJwtToken = function () {
  // Asegurar que JWT_EXPIRE tenga un formato válido
  let jwtExpire = process.env.JWT_EXPIRE || '1h';
  
  // Limpiar espacios en blanco y caracteres especiales
  jwtExpire = jwtExpire.toString().trim();
  
  console.log('JWT_EXPIRE value:', jwtExpire, 'type:', typeof jwtExpire);
  
  // Validar que el formato sea correcto para JWT
  const validFormats = /^(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|wk|weeks?|y|yrs?|years?)$/i;
  
  if (!validFormats.test(jwtExpire)) {
    console.warn('⚠️  JWT_EXPIRE format invalid, using default 1h');
    jwtExpire = '1h';
  }
  
  console.log('Final JWT expire value:', jwtExpire);
  
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: jwtExpire,
  });
};

// Comparar contraseña ingresada con contraseña encriptada
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);