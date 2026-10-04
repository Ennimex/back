// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Cuenta de usuario del sitio y de la app. Los campos van en español.
// `name` y `phone` quedan como alias de `nombre` y `telefono`: el front y la
// app pueden seguir leyendo y enviando los nombres viejos mientras se
// actualizan, y en la base solo existen los nombres nuevos.
const UserSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'Por favor ingresa tu nombre completo'],
      trim: true,
      alias: 'name',
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
    telefono: {
      type: String,
      required: [true, 'Por favor ingresa tu número de teléfono'],
      trim: true,
      alias: 'phone',
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
    // Índice sparse: solo indexa los usuarios con un token de reseteo activo,
    // para que la búsqueda en /reset-password sea instantánea sin escanear todo.
    resetPasswordToken: { type: String, index: { sparse: true } },
    resetPasswordExpire: Date,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    // Productos marcados como favoritos por el usuario (lista de deseos)
    favoritos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Producto',
      },
    ],
  },
  // timestamps: createdAt sustituye al campo manual que había; updatedAt es nuevo.
  // virtuals en JSON: incluye los alias name/phone para la compatibilidad.
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

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

  // Validar que el formato sea correcto para JWT
  const validFormats = /^(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|sec|seconds?|m|min|minutes?|h|hr|hours?|d|days?|w|wk|weeks?|y|yrs?|years?)$/i;

  if (!validFormats.test(jwtExpire)) {
    console.warn('⚠️  JWT_EXPIRE con formato inválido, usando 1h por defecto');
    jwtExpire = '1h';
  }

  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: jwtExpire,
  });
};

// Comparar contraseña ingresada con contraseña encriptada
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generar token de recuperación de contraseña.
// Devuelve el token en claro (va en el correo) y guarda solo su hash en la BD.
UserSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutos

  return resetToken;
};

// Tercer argumento: nombre fijo de la colección (sin pluralización automática)
module.exports = mongoose.model('User', UserSchema, 'users');
