const mongoose = require('mongoose');

const TallaSchema = new mongoose.Schema({
  categoriaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    required: true
  },
  genero: { type: String, required: true },
  talla: { type: String, required: true },
  rangoEdad: String,
  medida: String,
  // Borrado lógico: desactivada no aparece en el sitio, pero los productos
  // y solicitudes que la referencian la conservan y se puede reactivar.
  activo: { type: Boolean, default: true, index: true }
});

// Índices
TallaSchema.index({ categoriaId: 1 });
TallaSchema.index({ genero: 1 });
TallaSchema.index({ talla: 1 });
TallaSchema.index({ categoriaId: 1, genero: 1, talla: 1 }, { unique: true });

module.exports = mongoose.model('Tallas', TallaSchema);
