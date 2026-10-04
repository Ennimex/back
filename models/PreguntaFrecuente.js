const mongoose = require("mongoose");

// Pregunta frecuente editable desde el panel. Solo las activas se publican.
const PreguntaFrecuenteSchema = new mongoose.Schema(
  {
    pregunta: { type: String, required: [true, "La pregunta es obligatoria"], trim: true, maxlength: 200 },
    respuesta: { type: String, required: [true, "La respuesta es obligatoria"], trim: true, maxlength: 2000 },
    orden: { type: Number, default: 0 },
    activa: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PreguntaFrecuenteSchema.index({ activa: 1, orden: 1 });

module.exports = mongoose.model("PreguntaFrecuente", PreguntaFrecuenteSchema);
