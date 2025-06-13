const mongoose = require('mongoose');

const HistoriaSchema = new mongoose.Schema({
  año: String,
  evento: String
});

module.exports = mongoose.model('Historia', HistoriaSchema);
