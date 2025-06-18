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
  }
});

module.exports = mongoose.model("Categoria", CategoriaSchema);
