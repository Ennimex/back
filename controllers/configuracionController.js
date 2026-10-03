// controllers/configuracionController.js
const ConfiguracionSitio = require("../models/ConfiguracionSitio");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const streamifier = require("streamifier");
const asyncHandler = require("../utils/asyncHandler");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Valores iniciales (siembra). Solo se usan cuando el documento no existe o
// está vacío. NUNCA pisan datos que la clienta ya capturó desde el panel.
// Sin teléfono, correo ni WhatsApp inventados: esos los captura ella.
const SEED_CONFIG = {
  nombre: "La Aterciopelada",
  nombreCorto: "La Aterciopelada",
  lema: "Boutique Huasteca",
  descripcion:
    "Atuendos huastecos de la región Huasteca de Hidalgo, hechos sobre pedido. Escríbenos por WhatsApp para cotizar.",
  direccion: "Huejutla de Reyes, Hidalgo, México",
  telefono: "",
  email: "",
  horarios: "",
  redesSociales: {
    facebook: "https://web.facebook.com/people/La-Aterciopelada/61567232369483/",
    instagram: "",
    whatsapp: "",
    twitter: "",
    tiktok: "",
  },
};

// Subir un buffer a Cloudinary (promesa sobre upload_stream)
const subirACloudinary = (buffer, folder = "configuracion") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// ¿La configuración está vacía/sin configurar? (para sembrarla una sola vez)
const esConfigVacia = (c) =>
  !c.descripcion &&
  !c.direccion &&
  !c.telefono &&
  !c.email &&
  !c.horarios &&
  !(
    c.redesSociales &&
    (c.redesSociales.facebook ||
      c.redesSociales.whatsapp ||
      c.redesSociales.instagram ||
      c.redesSociales.twitter ||
      c.redesSociales.tiktok)
  );

// Obtener la configuración. Si no existe, crea una sembrada (singleton).
const getConfiguracion = asyncHandler(async (req, res) => {
  let config = await ConfiguracionSitio.findOne();
  if (!config) {
    // Primera vez: crear el documento ya sembrado con el contenido actual
    config = await ConfiguracionSitio.create(SEED_CONFIG);
  } else if (esConfigVacia(config)) {
    // Documento creado vacío antes de la siembra: rellenarlo una sola vez
    config.nombre = config.nombre || SEED_CONFIG.nombre;
    config.nombreCorto = config.nombreCorto || SEED_CONFIG.nombreCorto;
    config.lema = config.lema || SEED_CONFIG.lema;
    config.descripcion = SEED_CONFIG.descripcion;
    config.direccion = SEED_CONFIG.direccion;
    config.telefono = SEED_CONFIG.telefono;
    config.email = SEED_CONFIG.email;
    config.horarios = SEED_CONFIG.horarios;
    config.redesSociales = { ...config.redesSociales, ...SEED_CONFIG.redesSociales };
    await config.save();
  }
  res.json(config);
});

// Actualizar la configuración (admin). Acepta logo opcional (multipart).
const updateConfiguracion = asyncHandler(async (req, res) => {
  let config = await ConfiguracionSitio.findOne();
  if (!config) {
    config = new ConfiguracionSitio({});
  }

  const {
    nombre, nombreCorto, lema, descripcion, direccion, telefono, email, horarios,
    terminosCondiciones, avisoPrivacidad,
  } = req.body;

  if (nombre !== undefined) config.nombre = nombre;
  if (descripcion !== undefined) config.descripcion = descripcion;
  if (direccion !== undefined) config.direccion = direccion;
  if (telefono !== undefined) config.telefono = telefono;
  if (email !== undefined) config.email = email;
  if (horarios !== undefined) config.horarios = horarios;
  if (nombreCorto !== undefined) config.nombreCorto = nombreCorto;
  if (lema !== undefined) config.lema = lema;
  if (terminosCondiciones !== undefined) config.terminosCondiciones = terminosCondiciones;
  if (avisoPrivacidad !== undefined) config.avisoPrivacidad = avisoPrivacidad;

  // Redes sociales: pueden venir como campos planos (redesSociales[facebook])
  // o como objeto/JSON. Soportamos ambos.
  const redes = config.redesSociales || {};
  const setRed = (key, value) => {
    if (value !== undefined) redes[key] = value;
  };
  setRed("facebook", req.body["redesSociales[facebook]"] ?? req.body.facebook);
  setRed("instagram", req.body["redesSociales[instagram]"] ?? req.body.instagram);
  setRed("whatsapp", req.body["redesSociales[whatsapp]"] ?? req.body.whatsapp);
  setRed("twitter", req.body["redesSociales[twitter]"] ?? req.body.twitter);
  setRed("tiktok", req.body["redesSociales[tiktok]"] ?? req.body.tiktok);
  config.redesSociales = redes;

  // Logo (imagen) opcional
  if (req.file) {
    const result = await subirACloudinary(req.file.buffer, "configuracion");
    // Borrar el logo anterior si existía
    if (config.logoPublicId) {
      try {
        await cloudinary.uploader.destroy(config.logoPublicId);
      } catch (e) {
        console.error("No se pudo borrar el logo anterior:", e.message);
      }
    }
    config.logoUrl = result.secure_url;
    config.logoPublicId = result.public_id;
  }

  await config.save();
  res.json({
    mensaje: "Configuración actualizada correctamente",
    configuracion: config,
  });
});

module.exports = { getConfiguracion, updateConfiguracion, upload };
