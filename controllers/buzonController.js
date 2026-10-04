const MensajeBuzon = require("../models/MensajeBuzon");
const ConfiguracionSitio = require("../models/ConfiguracionSitio");
const asyncHandler = require("../utils/asyncHandler");
const { sendBuzonEmail } = require("../utils/email");
const { verifyToken } = require("../config/jwt");

const TIPOS = ["queja", "sugerencia", "felicitacion"];
const ESTADOS = ["nuevo", "leido", "atendido"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El buzón es público; si llega un token válido se guarda quién escribió
const usuarioOpcional = (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  try {
    return verifyToken(token).id;
  } catch {
    return null;
  }
};

const crear = asyncHandler(async (req, res) => {
  const { tipo, nombre, email, telefono, mensaje, quiereContacto } = req.body;

  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ error: "Tipo inválido: usa queja, sugerencia o felicitacion" });
  }
  const texto = String(mensaje || "").trim();
  if (!texto) return res.status(400).json({ error: "El mensaje es obligatorio" });

  const correo = String(email || "").trim().toLowerCase();
  const tel = String(telefono || "").trim();
  if (correo && !EMAIL_RE.test(correo)) return res.status(400).json({ error: "El correo no es válido" });
  if (quiereContacto && !correo && !tel) {
    return res.status(400).json({ error: "Para contactarte necesitamos tu correo o tu teléfono" });
  }

  const guardado = await MensajeBuzon.create({
    tipo,
    nombre: String(nombre || "").trim(),
    email: correo,
    telefono: tel,
    mensaje: texto.slice(0, 2000),
    usuario: usuarioOpcional(req),
  });

  // Aviso al negocio. Si el correo falla, el mensaje ya quedó guardado y se ve en el panel.
  try {
    const config = await ConfiguracionSitio.findOne();
    const destino = (config && config.email) || process.env.BREVO_FROM_EMAIL;
    if (destino) await sendBuzonEmail(destino, guardado);
  } catch (e) {
    console.error("No se pudo enviar el aviso del buzón:", e.message);
  }

  res.status(201).json({ success: true, message: "Gracias. Recibimos tu mensaje.", id: guardado._id });
});

const listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (ESTADOS.includes(req.query.estado)) filtro.estado = req.query.estado;
  if (TIPOS.includes(req.query.tipo)) filtro.tipo = req.query.tipo;
  const mensajes = await MensajeBuzon.find(filtro).sort({ createdAt: -1 }).lean();
  res.json(mensajes);
});

const actualizar = asyncHandler(async (req, res) => {
  const cambios = {};
  if (req.body.estado !== undefined) {
    if (!ESTADOS.includes(req.body.estado)) {
      return res.status(400).json({ error: "Estado inválido: usa nuevo, leido o atendido" });
    }
    cambios.estado = req.body.estado;
  }
  if (req.body.notaInterna !== undefined) cambios.notaInterna = String(req.body.notaInterna).slice(0, 2000);

  const actualizado = await MensajeBuzon.findByIdAndUpdate(req.params.id, cambios, {
    new: true,
    runValidators: true,
  });
  if (!actualizado) return res.status(404).json({ error: "Mensaje no encontrado" });
  res.json(actualizado);
});

const eliminar = asyncHandler(async (req, res) => {
  const borrado = await MensajeBuzon.findByIdAndDelete(req.params.id);
  if (!borrado) return res.status(404).json({ error: "Mensaje no encontrado" });
  res.json({ mensaje: "Mensaje eliminado" });
});

module.exports = { crear, listar, actualizar, eliminar };
