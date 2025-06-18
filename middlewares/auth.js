// este archivo maneja la autenticación de usuarios
// y la creación de nuevos usuarios en la base de datos
// middlewares/auth.js
const { verifyToken } = require('../config/jwt');

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ 
    error: 'No autorizado',
    isExpired: false
  });

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        isExpired: true
      });
    }
    res.status(401).json({ 
      error: 'Token inválido',
      isExpired: false
    });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado - Se requiere rol de administrador' });
  }
  next();
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
};

module.exports = { authenticate, checkRole, isAdmin };