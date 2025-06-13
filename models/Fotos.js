const mongoose = require('mongoose');

const FotoSchema = new mongoose.Schema({
  url: String,
  titulo: String,
  descripcion: String
});

module.exports = mongoose.model('Foto', FotoSchema);
