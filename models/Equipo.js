const mongoose = require('mongoose');

const EquipoSchema = new mongoose.Schema({
  nombre: String,
  rol: String,
  bio: String,
  imagen: String
});

module.exports = mongoose.model('Equipo', EquipoSchema);
