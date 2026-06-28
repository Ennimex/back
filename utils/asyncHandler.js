// Envuelve un controlador async para que cualquier error (throw o promesa
// rechazada) se reenvíe automáticamente al manejador de errores global,
// sin necesidad de escribir try/catch en cada ruta.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
