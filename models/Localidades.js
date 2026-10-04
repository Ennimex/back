const mongoose = require('mongoose');

const LocalidadSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  // Borrado lógico: desactivada no aparece en el sitio, pero los productos
  // que la referencian conservan su localidad y se puede reactivar.
  activo: { type: Boolean, default: true, index: true }
});

// Índice único sobre nombre
LocalidadSchema.index({ nombre: 1 }, { unique: true });

module.exports = mongoose.model('Localidades', LocalidadSchema);
