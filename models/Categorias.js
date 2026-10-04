const mongoose = require("mongoose");
const EsquemaImagen = require("./compartidos/esquemaImagen");

const CategoriaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
    },
    descripcion: {
      type: String,
    },
    // Imagen en Cloudinary: { url, publicId }. El publicId permite borrar o
    // reemplazar el archivo sin adivinarlo a partir de la URL.
    imagen: { type: EsquemaImagen, default: () => ({}) },
    // Borrado lógico: desactivada no aparece en el sitio, pero los productos
    // que la referencian conservan su categoría y se puede reactivar.
    activo: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Compatibilidad temporal: el front y la app siguen leyendo `imagenURL` como
// texto. Este virtual la devuelve desde el subdocumento sin duplicar datos.
CategoriaSchema.virtual("imagenURL").get(function () {
  return this.imagen ? this.imagen.url : "";
});

// Tercer argumento: nombre fijo de la colección (sin pluralización automática)
module.exports = mongoose.model("Categoria", CategoriaSchema, "categorias");
