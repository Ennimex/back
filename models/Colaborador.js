const mongoose = require('mongoose');

const ColaboradorSchema = new mongoose.Schema({
  nombre: String,
  rol: String
});

module.exports = mongoose.model('Colaborador', ColaboradorSchema);
