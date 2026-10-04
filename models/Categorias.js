const mongoose = require("mongoose");

const CategoriaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  descripcion: {
    type: String
  },
  imagenURL: {
    type: String
  },
  // Borrado lógico: desactivada no aparece en el sitio, pero los productos
  // que la referencian conservan su categoría y se puede reactivar.
  activo: { type: Boolean, default: true, index: true }
});

module.exports = mongoose.model("Categoria", CategoriaSchema);
