const mongoose = require("mongoose");

// Mensaje del buzón de quejas y sugerencias. Admite anónimos: nombre, correo y
// teléfono son opcionales. El negocio lo atiende por WhatsApp o correo si los dejó.
const MensajeBuzonSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: ["queja", "sugerencia", "felicitacion"], required: true },
    nombre: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    telefono: { type: String, trim: true, default: "" },
    mensaje: { type: String, required: [true, "El mensaje es obligatorio"], trim: true, maxlength: 2000 },
    estado: { type: String, enum: ["nuevo", "leido", "atendido"], default: "nuevo", index: true },
    notaInterna: { type: String, default: "" },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MensajeBuzon", MensajeBuzonSchema);
