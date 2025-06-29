const mongoose = require('mongoose');

const ServicioSchema = new mongoose.Schema({
  nombre: String,
  titulo: String,
  descripcion: String,
  imagen: String,
});

module.exports = mongoose.model('Servicios', ServicioSchema);
