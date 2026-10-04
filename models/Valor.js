const mongoose = require('mongoose');

// Valores del negocio que se muestran en el sitio (icono, título y texto).
const ValorSchema = new mongoose.Schema(
  {
    icon: String,
    titulo: String,
    descripcion: String,
  },
  { timestamps: true }
);

// Tercer argumento: nombre fijo de la colección ("valores", no "valors")
module.exports = mongoose.model('Valor', ValorSchema, 'valores');
