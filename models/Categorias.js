//categoria.js
const mongoose = require('mongoose');

const CategoriaSchema = new mongoose.Schema({
  _id: String,
  nombre: String,
  descripcion: String,
  imagenURL: String
});

module.exports = mongoose.model('Categorias', CategoriaSchema);
