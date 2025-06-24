const mongoose = require('mongoose');
const { calcularFechaEliminacion, calcularFechaEliminacionUpdate } = require('../middlewares/autoDeleteEvents');

const EventoSchema = new mongoose.Schema({
  titulo: String,
  descripcion: String,
  fecha: Date,
  ubicacion: String,
  horaInicio: String, // Formato: "14:30" (HH:mm)
  horaFin: String,    // Formato: "16:30" (HH:mm)
  fechaEliminacion: {
    type: Date,
    index: { expireAfterSeconds: 0 } // Se elimina automáticamente en esta fecha
  }
});

// Aplicar middlewares de auto-eliminación
EventoSchema.pre('save', calcularFechaEliminacion);
EventoSchema.pre('findOneAndUpdate', calcularFechaEliminacionUpdate);

module.exports = mongoose.model('Eventos', EventoSchema);
