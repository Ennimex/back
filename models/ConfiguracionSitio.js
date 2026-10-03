// models/ConfiguracionSitio.js
// Configuración global del sitio (documento único / singleton):
// nombre, logo, descripción, datos de contacto y redes sociales.
const mongoose = require("mongoose");

const ConfiguracionSitioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      default: "La Aterciopelada",
      trim: true,
    },
    nombreCorto: {
      type: String,
      default: "La Aterciopelada",
      trim: true,
    },
    lema: {
      type: String,
      default: "Boutique Huasteca",
      trim: true,
    },
    descripcion: {
      type: String,
      default: "",
      trim: true,
    },
    logoUrl: {
      type: String,
      default: "",
    },
    logoPublicId: {
      type: String,
      default: "",
    },
    // Contacto
    direccion: { type: String, default: "", trim: true },
    telefono: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    horarios: { type: String, default: "", trim: true },
    // Redes sociales (URLs)
    redesSociales: {
      facebook: { type: String, default: "", trim: true },
      instagram: { type: String, default: "", trim: true },
      whatsapp: { type: String, default: "", trim: true },
      twitter: { type: String, default: "", trim: true },
      tiktok: { type: String, default: "", trim: true },
    },
    // Textos legales que muestra la página /politicas. Los redacta la clienta
    // desde el panel; borradores en docs/legales/.
    terminosCondiciones: { type: String, default: "" },
    avisoPrivacidad: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ConfiguracionSitio", ConfiguracionSitioSchema);
