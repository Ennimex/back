const mongoose = require('mongoose');

const FotoSchema = new mongoose.Schema({
  url: String,
  titulo: String,
  descripcion: String,
  fechaSubida: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Foto', FotoSchema);
