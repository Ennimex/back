const mongoose = require('mongoose');
const EsquemaImagen = require('./compartidos/esquemaImagen');

const ProductoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true },
    descripcion: String,
    tipoTela: String,
    // Imagen en Cloudinary: { url, publicId }
    imagen: { type: EsquemaImagen, default: () => ({}) },
    localidadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Localidad',
      required: true,
    },
    // Categoría del producto (opcional: los productos antiguos pueden no tenerla)
    categoriaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria',
      default: null,
    },
    tallasDisponibles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Talla',
      },
    ],
    // Borrado lógico: el admin "elimina" poniendo activo en false. El producto
    // deja de aparecer en el sitio pero sigue existiendo para las solicitudes
    // y favoritos que lo referencian, y se puede reactivar.
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Compatibilidad temporal: el front y la app siguen leyendo `imagenURL` como
// texto. Este virtual la devuelve desde el subdocumento sin duplicar datos.
ProductoSchema.virtual('imagenURL').get(function () {
  return this.imagen ? this.imagen.url : '';
});

// Índices
ProductoSchema.index({ nombre: 'text', descripcion: 'text' });
ProductoSchema.index({ localidadId: 1 });
ProductoSchema.index({ categoriaId: 1 });
ProductoSchema.index({ tallasDisponibles: 1 });

// Tercer argumento: nombre fijo de la colección (sin pluralización automática)
module.exports = mongoose.model('Producto', ProductoSchema, 'productos');
