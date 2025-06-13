// models/ Producto.js
const mongoose = require("mongoose");

const ProductoSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  localidadId: {
    type: String,
    ref: "Localidades",
    required: true
  },
  tipoTela: String,
  imagenURL: String,
  tallasDisponibles: [
    {
      type: String,
      ref: "Tallas"
    }
  ]
});

// Agregamos índices para mejorar el rendimiento de las consultas
ProductoSchema.index({ localidadId: 1 });
ProductoSchema.index({ tallasDisponibles: 1 });

module.exports = mongoose.model("Producto", ProductoSchema);
