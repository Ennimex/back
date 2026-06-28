// controllers/configuracionController.js
const ConfiguracionSitio = require("../models/ConfiguracionSitio");
const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const streamifier = require("streamifier");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Valores iniciales (siembra): el contenido que antes estaba "hardcoded" en el
// frontend. Se usan solo al crear el documento por primera vez, para que el
// panel de admin aparezca pre-cargado y listo para editar.
const SEED_CONFIG = {
  nombre: "La Aterciopelada",
  descripcion:
    "Descubre la elegancia y calidad en cada prenda. Somos tu destino para la moda que refleja tu estilo único.",
  direccion: "Región Huasteca, San Luis Potosí, México",
  telefono: "+52 771 123 4567",
  email: "info@laaterciopelada.com",
  horarios: "Lunes a Viernes: 9:00 - 19:00, Sábados: 10:00 - 16:00",
  redesSociales: {
    facebook:
      "https://web.facebook.com/people/La-Aterciopelada/61567232369483/?sk=photos",
    instagram: "",
    whatsapp: "https://wa.me/527711234567",
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
const getConfiguracion = async (req, res) => {
  try {
    let config = await ConfiguracionSitio.findOne();
    if (!config) {
      // Primera vez: crear el documento ya sembrado con el contenido actual
      config = await ConfiguracionSitio.create(SEED_CONFIG);
    } else if (esConfigVacia(config)) {
      // Documento creado vacío antes de la siembra: rellenarlo una sola vez
      config.nombre = config.nombre || SEED_CONFIG.nombre;
      config.descripcion = SEED_CONFIG.descripcion;
      config.direccion = SEED_CONFIG.direccion;
      config.telefono = SEED_CONFIG.telefono;
      config.email = SEED_CONFIG.email;
      config.horarios = SEED_CONFIG.horarios;
      config.redesSociales = { ...config.redesSociales, ...SEED_CONFIG.redesSociales };
      await config.save();
    }
    res.json(config);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    res.status(500).json({ error: "Error al obtener la configuración del sitio" });
  }
};

// Actualizar la configuración (admin). Acepta logo opcional (multipart).
const updateConfiguracion = async (req, res) => {
  try {
    let config = await ConfiguracionSitio.findOne();
    if (!config) {
      config = new ConfiguracionSitio({});
    }

    const { nombre, descripcion, direccion, telefono, email, horarios } = req.body;

    if (nombre !== undefined) config.nombre = nombre;
    if (descripcion !== undefined) config.descripcion = descripcion;
    if (direccion !== undefined) config.direccion = direccion;
    if (telefono !== undefined) config.telefono = telefono;
    if (email !== undefined) config.email = email;
    if (horarios !== undefined) config.horarios = horarios;

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
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    res.status(500).json({ error: "Error al actualizar la configuración del sitio" });
  }
};

module.exports = { getConfiguracion, updateConfiguracion, upload };
