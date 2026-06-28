// Error con código HTTP. Permite lanzar errores controlados desde los
// controladores (ej. throw new ApiError(404, 'No encontrado')) que el
// manejador de errores global convierte en la respuesta adecuada.
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

module.exports = ApiError;
