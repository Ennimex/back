const mongoose = require('mongoose');

const ProductoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: String,
  tipoTela: String,
  imagenURL: String,
  localidadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Localidades',
    required: true
  },
  tallasDisponibles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tallas'
  }]
});

// Índices
ProductoSchema.index({ nombre: 'text', descripcion: 'text' });
ProductoSchema.index({ localidadId: 1 });
ProductoSchema.index({ tallasDisponibles: 1 });

module.exports = mongoose.model('Producto', ProductoSchema);
