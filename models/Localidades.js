const mongoose = require('mongoose');

const LocalidadSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String
});

// Índice único sobre nombre
LocalidadSchema.index({ nombre: 1 }, { unique: true });

module.exports = mongoose.model('Localidades', LocalidadSchema);
