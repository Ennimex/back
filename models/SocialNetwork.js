const mongoose = require('mongoose');

const SocialNetworkSchema = new mongoose.Schema({
  icon: String,
  name: String,
  handle: String,
  url: String
});

module.exports = mongoose.model('SocialNetwork', SocialNetworkSchema);
