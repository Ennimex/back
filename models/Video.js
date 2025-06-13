const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  url: String,
  titulo: String,
  descripcion: String
});

module.exports = mongoose.model('Video', VideoSchema);
