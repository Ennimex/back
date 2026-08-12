const Evento = require('../models/Eventos');
const Foto = require('../models/Fotos');
const Video = require('../models/Video');
const asyncHandler = require('../utils/asyncHandler');

// Obtener todos los eventos, con el total de fotos y videos de su galería
// (totalFotos / totalVideos) para que el panel muestre el estado de un vistazo.
const getEventos = asyncHandler(async (req, res) => {
  const [eventos, fotosPorEvento, videosPorEvento] = await Promise.all([
    Evento.find().sort({ fecha: -1 }).lean(),
    Foto.aggregate([
      { $match: { eventoId: { $ne: null } } },
      { $group: { _id: '$eventoId', total: { $sum: 1 } } },
    ]),
    Video.aggregate([
      { $match: { eventoId: { $ne: null } } },
      { $group: { _id: '$eventoId', total: { $sum: 1 } } },
    ]),
  ]);
  const aMapa = (lista) => Object.fromEntries(lista.map((x) => [String(x._id), x.total]));
  const nFotos = aMapa(fotosPorEvento);
  const nVideos = aMapa(videosPorEvento);
  res.json(eventos.map((e) => ({
    ...e,
    totalFotos: nFotos[String(e._id)] || 0,
    totalVideos: nVideos[String(e._id)] || 0,
  })));
});

// Obtener un evento por ID
const getEventoById = asyncHandler(async (req, res) => {
  const evento = await Evento.findById(req.params.id);
  if (!evento) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  res.json(evento);
});

// Crear nuevo evento. Solo título y fecha son obligatorios; el resto es opcional.
const createEvento = asyncHandler(async (req, res) => {
  const { titulo, descripcion, fecha, ubicacion, horaInicio, horaFin } = req.body;

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'El título del evento es obligatorio' });
  }
  if (!fecha || isNaN(new Date(fecha).getTime())) {
    return res.status(400).json({ error: 'La fecha del evento es obligatoria' });
  }

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

// Actualizar evento. Igual que en crear: título y fecha obligatorios.
const updateEvento = asyncHandler(async (req, res) => {
  const { titulo, descripcion, fecha, ubicacion, horaInicio, horaFin } = req.body;

  if (!titulo || !String(titulo).trim()) {
    return res.status(400).json({ error: 'El título del evento es obligatorio' });
  }
  if (!fecha || isNaN(new Date(fecha).getTime())) {
    return res.status(400).json({ error: 'La fecha del evento es obligatoria' });
  }

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

// Eliminar evento. Sus fotos/videos no se borran: se desvinculan (eventoId: null)
// para que vuelvan a aparecer en la galería general en vez de quedar huérfanos.
const deleteEvento = asyncHandler(async (req, res) => {
  const eventoEliminado = await Evento.findByIdAndDelete(req.params.id);
  if (!eventoEliminado) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }
  await Promise.all([
    Foto.updateMany({ eventoId: eventoEliminado._id }, { $set: { eventoId: null } }),
    Video.updateMany({ eventoId: eventoEliminado._id }, { $set: { eventoId: null } }),
  ]);
  res.json({ mensaje: 'Evento eliminado correctamente' });
});

module.exports = {
  getEventos,
  getEventoById,
  createEvento,
  updateEvento,
  deleteEvento
};
