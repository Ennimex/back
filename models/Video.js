const mongoose = require('mongoose');
const EsquemaImagen = require('./compartidos/esquemaImagen');

const VideoSchema = new mongoose.Schema(
  {
    // Archivo de video en Cloudinary (recurso de tipo "video")
    url: String,
    publicId: String, // necesario para borrar o reemplazar el archivo
    titulo: String,
    descripcion: String,
    duracion: Number, // Duración en segundos
    formato: String, // Formato del video (mp4, mov, etc.)
    // Miniatura: imagen derivada del propio video por Cloudinary. Sigue el
    // mismo patrón { url, publicId }; su publicId es el del video, porque es
    // una transformación de él y se borra junto con el archivo.
    miniatura: { type: EsquemaImagen, default: () => ({}) },
    // Evento al que pertenece el video (opcional)
    eventoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Eventos',
      default: null,
      index: true,
    },
    fechaSubida: {
      type: Date,
      default: Date.now,
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// La URL de la miniatura como texto, por comodidad para el front
VideoSchema.virtual('miniaturaURL').get(function () {
  return this.miniatura ? this.miniatura.url : '';
});

module.exports = mongoose.model('Video', VideoSchema);
