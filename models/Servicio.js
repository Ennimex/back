const mongoose = require('mongoose');

const ServicioSchema = new mongoose.Schema({
  nombre: String,
  titulo: String,
  descripcion: String,
  imagen: String,
});

// Índice para acelerar la verificación de nombre duplicado (findOne por nombre)
// al crear/actualizar un servicio.
ServicioSchema.index({ nombre: 1 });

module.exports = mongoose.model('Servicios', ServicioSchema);
