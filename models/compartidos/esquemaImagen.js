const mongoose = require('mongoose');

// Subesquema reutilizable para una imagen guardada en Cloudinary.
// La base solo guarda la URL pública y el public_id, que es lo que hace
// falta para borrar o reemplazar el archivo. Sin _id: es un valor dentro del
// documento, no un documento aparte.
//
// Uso en un modelo:  imagen: { type: EsquemaImagen, default: () => ({}) }
const EsquemaImagen = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
  { _id: false }
);

module.exports = EsquemaImagen;
