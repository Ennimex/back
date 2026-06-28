const mongoose = require('mongoose');

const NosotrosSchema = new mongoose.Schema({
  mision: String,
  vision: String,
  historia: String
});

module.exports = mongoose.model('Nosotros', NosotrosSchema);
