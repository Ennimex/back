const mongoose = require('mongoose');

const FotoSchema = new mongoose.Schema({
  url: String,
  titulo: String,
  descripcion: String,
  // Evento al que pertenece la foto (opcional)
  eventoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Eventos',
    default: null,
    index: true
  },
  fechaSubida: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Foto', FotoSchema);
