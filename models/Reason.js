const mongoose = require('mongoose');

const ReasonSchema = new mongoose.Schema({
  name: String,
  description: String
});

module.exports = mongoose.model('Reason', ReasonSchema);
