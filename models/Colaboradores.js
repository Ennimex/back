const mongoose = require('mongoose');
const EsquemaImagen = require('./compartidos/esquemaImagen');

const ColaboradorSchema = new mongoose.Schema(
  {
    nombre: String,
    rol: String,
    descripcion: String,
    // Imagen en Cloudinary: { url, publicId }. Antes eran dos campos sueltos
    // (imagen e imagenPublicId); la migración 002 los junta aquí.
    imagen: { type: EsquemaImagen, default: () => ({}) },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// La URL como texto, por comodidad para el front (`colaborador.imagenURL`)
ColaboradorSchema.virtual('imagenURL').get(function () {
  return this.imagen ? this.imagen.url : '';
});

// Modelo en singular; tercer argumento: nombre fijo de la colección
module.exports = mongoose.model('Colaborador', ColaboradorSchema, 'colaboradores');
