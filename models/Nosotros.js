const mongoose = require('mongoose');

// Textos de la sección "Nosotros". Es un documento único (ver nosotrosController).
const NosotrosSchema = new mongoose.Schema(
  {
    mision: String,
    vision: String,
    historia: String,
  },
  { timestamps: true }
);

// Tercer argumento: nombre fijo de la colección
module.exports = mongoose.model('Nosotros', NosotrosSchema, 'nosotros');
