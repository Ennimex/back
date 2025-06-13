const mongoose = require('mongoose');

const ContactInfoSchema = new mongoose.Schema({
  icon: String,
  title: String,
  content: String,
  link: String,
  linkText: String
});

module.exports = mongoose.model('ContactInfo', ContactInfoSchema);
