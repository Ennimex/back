const mongoose = require('mongoose');

const ValorSchema = new mongoose.Schema({
  icon: String,
  titulo: String,
  descripcion: String
});

module.exports = mongoose.model('Valor', ValorSchema);
