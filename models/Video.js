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
    // Miniatura con el mismo patrón { url, publicId }. Normalmente es una
    // transformación del propio video (entonces su publicId es el del video y
    // no hay archivo aparte). Si fuera una imagen subida por separado, lleva
    // su propio publicId y se borra junto con el video.
    miniatura: { type: EsquemaImagen, default: () => ({}) },
    // Evento al que pertenece el video (opcional)
    eventoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evento',
      default: null,
      index: true,
    },
  },
  // timestamps: createdAt sustituye al antiguo fechaSubida (migración 003)
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// La URL de la miniatura como texto, por comodidad para el front
VideoSchema.virtual('miniaturaURL').get(function () {
  return this.miniatura ? this.miniatura.url : '';
});

// Compatibilidad temporal: la app declara `fechaSubida`; ahora es createdAt.
VideoSchema.virtual('fechaSubida').get(function () {
  return this.createdAt;
});

// Tercer argumento: nombre fijo de la colección
module.exports = mongoose.model('Video', VideoSchema, 'videos');
