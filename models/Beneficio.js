const mongoose = require('mongoose');

const BeneficioSchema = new mongoose.Schema({
  id: String,
  titulo: String,
  descripcion: String,
  color: String
});

module.exports = mongoose.model('Beneficio', BeneficioSchema);
