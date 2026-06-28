const Evento = require('../models/Eventos');
const asyncHandler = require('../utils/asyncHandler');

// Obtener todos los eventos
const getEventos = asyncHandler(async (req, res) => {
  const eventos = await Evento.find().sort({ fecha: -1 });
  res.json(eventos);
});

// Obtener un evento por ID
const getEventoById = asyncHandler(async (req, res) => {
  const evento = await Evento.findById(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json(evento);
});

// Crear nuevo evento
const createEvento = asyncHandler(async (req, res) => {
  const { titulo, descripcion, fecha, ubicacion, horaInicio, horaFin } = req.body;

  // Ajustar la fecha para evitar problemas de zona horaria
  let fechaEvento = fecha;
  if (fecha) {
    const fechaLocal = new Date(fecha);
    // Ajustar para mantener la fecha local sin conversión UTC
    fechaEvento = new Date(fechaLocal.getTime() + fechaLocal.getTimezoneOffset() * 60000);
  }

  const nuevoEvento = new Evento({
    titulo,
    descripcion,
    fecha: fechaEvento,
    ubicacion,
    horaInicio,
    horaFin
  });
  const eventoGuardado = await nuevoEvento.save();
  res.status(201).json(eventoGuardado);
});

// Actualizar evento
const updateEvento = asyncHandler(async (req, res) => {
  const { titulo, descripcion, fecha, ubicacion, horaInicio, horaFin } = req.body;

  // Ajustar la fecha para evitar problemas de zona horaria
  let fechaEvento = fecha;
  if (fecha) {
    const fechaLocal = new Date(fecha);
    // Ajustar para mantener la fecha local sin conversión UTC
    fechaEvento = new Date(fechaLocal.getTime() + fechaLocal.getTimezoneOffset() * 60000);
  }

  // Preparar datos de actualización
  const updateData = { titulo, descripcion, fecha: fechaEvento, ubicacion, horaInicio, horaFin };

  const eventoActualizado = await Evento.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  if (!eventoActualizado) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json(eventoActualizado);
});

// Eliminar evento
const deleteEvento = asyncHandler(async (req, res) => {
  const eventoEliminado = await Evento.findByIdAndDelete(req.params.id);
  if (!eventoEliminado) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json({ mensaje: 'Evento eliminado correctamente' });
});

module.exports = {
  getEventos,
  getEventoById,
  createEvento,
  updateEvento,
  deleteEvento
};
