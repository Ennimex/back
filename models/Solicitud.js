const mongoose = require('mongoose');

// Solicitud de cotización que un usuario registrado envía sobre uno o varios
// productos. Se guarda un "snapshot" de los datos para que la solicitud siga
// siendo legible aunque el producto o el perfil cambien después.
const SolicitudSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // se consulta por usuario en "Mis Solicitudes"
  },
  // Snapshot de los datos de contacto del usuario al momento de solicitar
  nombre: String,
  email: String,
  telefono: String,
  // Snapshot de los productos solicitados
  productos: [{
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    nombre: String,
    imagenURL: String,
  }],
  mensaje: String,
  estado: {
    type: String,
    enum: ['pendiente', 'atendida', 'cerrada'],
    default: 'pendiente',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Solicitud', SolicitudSchema);
