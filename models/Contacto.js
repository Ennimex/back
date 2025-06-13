const mongoose = require('mongoose');

const ContactoSchema = new mongoose.Schema({
  telefono: String,
  horarios: String,
  redesSociales: {
    facebook: String,
    whatsapp: String
  }
});

module.exports = mongoose.model('Contacto', ContactoSchema);
