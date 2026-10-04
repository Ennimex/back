const PreguntaFrecuente = require("../models/PreguntaFrecuente");
const asyncHandler = require("../utils/asyncHandler");

// Público: solo activas, en el orden que definió la clienta
const getPublicas = asyncHandler(async (req, res) => {
  const preguntas = await PreguntaFrecuente.find({ activa: true }).sort({ orden: 1, createdAt: 1 }).lean();
  res.json(preguntas);
});

// Admin: todas, incluidas las desactivadas
const getTodas = asyncHandler(async (req, res) => {
  const preguntas = await PreguntaFrecuente.find().sort({ orden: 1, createdAt: 1 }).lean();
  res.json(preguntas);
});

const crear = asyncHandler(async (req, res) => {
  const { pregunta, respuesta, orden, activa } = req.body;
  if (!pregunta || !String(pregunta).trim() || !respuesta || !String(respuesta).trim()) {
    return res.status(400).json({ error: "Pregunta y respuesta son obligatorias" });
  }
  const creada = await PreguntaFrecuente.create({
    pregunta,
    respuesta,
    orden: Number(orden) || 0,
    activa: activa === undefined ? true : Boolean(activa),
  });
  res.status(201).json(creada);
});

const actualizar = asyncHandler(async (req, res) => {
  const cambios = {};
  ["pregunta", "respuesta", "orden", "activa"].forEach((campo) => {
    if (req.body[campo] !== undefined) cambios[campo] = req.body[campo];
  });
  const actualizada = await PreguntaFrecuente.findByIdAndUpdate(req.params.id, cambios, {
    new: true,
    runValidators: true,
  });
  if (!actualizada) return res.status(404).json({ error: "Pregunta no encontrada" });
  res.json(actualizada);
});

const eliminar = asyncHandler(async (req, res) => {
  const borrada = await PreguntaFrecuente.findByIdAndDelete(req.params.id);
  if (!borrada) return res.status(404).json({ error: "Pregunta no encontrada" });
  res.json({ mensaje: "Pregunta eliminada" });
});

module.exports = { getPublicas, getTodas, crear, actualizar, eliminar };
