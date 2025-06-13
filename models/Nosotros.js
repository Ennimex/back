const mongoose = require('mongoose');

const NosotrosSchema = new mongoose.Schema({
  mision: String,
  vision: String
});

module.exports = mongoose.model('Nosotros', NosotrosSchema);
