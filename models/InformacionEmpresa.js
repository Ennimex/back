const mongoose = require('mongoose');

const InformacionEmpresaSchema = new mongoose.Schema({
  email: String,
  telefono: String,
  nombreContacto: String
});

module.exports = mongoose.model('InformacionEmpresa', InformacionEmpresaSchema);
