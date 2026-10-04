const mongoose = require('mongoose');
const EsquemaImagen = require('./compartidos/esquemaImagen');

const FotoSchema = new mongoose.Schema(
  {
    // Imagen en Cloudinary: { url, publicId }. Antes el campo era `url` en texto.
    imagen: { type: EsquemaImagen, default: () => ({}) },
    titulo: String,
    descripcion: String,
    // Evento al que pertenece la foto (opcional)
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

// Compatibilidad temporal: el front y la app siguen leyendo `foto.url`.
FotoSchema.virtual('url').get(function () {
  return this.imagen ? this.imagen.url : '';
});

module.exports = mongoose.model('Foto', FotoSchema);
