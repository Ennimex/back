// config/jwt.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { verifyToken };