//Localidad.js
const mongoose = require('mongoose');

const LocalidadSchema = new mongoose.Schema({
  _id: String,
  nombre: String,
  descripcion: String
});

module.exports = mongoose.model('Localidades', LocalidadSchema); // Cambiado a 'Localidad' para que coincida con la referencia