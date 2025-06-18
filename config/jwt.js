// config/jwt.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      ignoreExpiration: false // Aseguramos que la expiración sea verificada
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      error.isExpired = true;
    }
    throw error;
  }
};

module.exports = { verifyToken };