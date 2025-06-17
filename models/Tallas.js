// Talla.js
const mongoose = require('mongoose');

const TallaSchema = new mongoose.Schema({
  _id: String,
  categoriaId: {
    type: String,
    required: true,
    ref: 'Categorias'
  },
  genero: String,
  talla: String,
  rangoEdad: String,
  medida: String
});

// Agregamos indices para mejorar el rendimiento de las consultas
TallaSchema.index({ categoriaId: 1 });

module.exports = mongoose.model('Tallas', TallaSchema);
