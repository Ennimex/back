const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
  icon: String,
  title: String,
  description: String
});

module.exports = mongoose.model('Collection', CollectionSchema);
