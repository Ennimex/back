const mongoose = require('mongoose');

const ColaboradorSchema = new mongoose.Schema({
  nombre: String,
  rol: String,
  descripcion: String,
  imagen: String,
  imagenPublicId: String,
});

module.exports = mongoose.model('Colaboradores', ColaboradorSchema);
