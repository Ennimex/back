const mongoose = require('mongoose');
const EsquemaImagen = require('./compartidos/esquemaImagen');

const ServicioSchema = new mongoose.Schema(
  {
    nombre: String,
    titulo: String,
    descripcion: String,
    // Imagen en Cloudinary: { url, publicId }. Antes era solo la URL en texto.
    imagen: { type: EsquemaImagen, default: () => ({}) },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// La URL como texto, por comodidad para el front (`servicio.imagenURL`)
ServicioSchema.virtual('imagenURL').get(function () {
  return this.imagen ? this.imagen.url : '';
});

// Índice para acelerar la verificación de nombre duplicado (findOne por nombre)
// al crear/actualizar un servicio.
ServicioSchema.index({ nombre: 1 });

module.exports = mongoose.model('Servicios', ServicioSchema);
