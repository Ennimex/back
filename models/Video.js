const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  url: String,
  titulo: String,
  descripcion: String,
  publicId: String, // Guardar el public_id de Cloudinary para mejor gestión
  duracion: Number, // Duración en segundos
  formato: String // Formato del video (mp4, mov, etc.)
});

module.exports = mongoose.model('Video', VideoSchema);
