const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  url: String,
  titulo: String,
  descripcion: String,
  publicId: String, // Guardar el public_id de Cloudinary para mejor gestión
  duracion: Number, // Duración en segundos
  formato: String, // Formato del video (mp4, mov, etc.)
  miniatura: String, // URL de la miniatura generada
  miniaturaPublicId: String, // ID público de la miniatura en Cloudinary
  fechaSubida: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Video', VideoSchema);
