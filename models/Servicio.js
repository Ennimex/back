const mongoose = require('mongoose');

const ServicioSchema = new mongoose.Schema({
  id: String,
  nombre: String,
  titulo: String,
  descripcion: String,
  imagen: String,
  imagenURL: String
});

module.exports = mongoose.model('Servicio', ServicioSchema);
