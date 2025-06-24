const Evento = require('../models/Eventos');

// Obtener todos los eventos
const getEventos = async (req, res) => {
  try {
    const eventos = await Evento.find().sort({ fecha: -1 });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener eventos', detalles: error.message });
  }
};

// Obtener un evento por ID
const getEventoById = async (req, res) => {
  try {
    const evento = await Evento.findById(req.params.id);
    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(evento);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el evento', detalles: error.message });
  }
};

// Crear nuevo evento
const createEvento = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el evento', detalles: error.message });
  }
};

// Actualizar evento
const updateEvento = async (req, res) => {
  try {
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
    
    // Recalcular fecha de eliminación si se cambió la fecha o hora del evento
    if (fecha || horaFin) {
      const fechaEventoActualizada = fechaEvento || new Date();
      
      if (horaFin) {
        const [horas, minutos] = horaFin.split(':');
        fechaEventoActualizada.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      } else {
        fechaEventoActualizada.setHours(23, 59, 59, 999);
      }
      
      // Agregar 12 horas para la eliminación automática
      updateData.fechaEliminacion = new Date(fechaEventoActualizada.getTime() + (12 * 60 * 60 * 1000));
    }
    
    const eventoActualizado = await Evento.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!eventoActualizado) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json(eventoActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el evento', detalles: error.message });
  }
};

// Eliminar evento
const deleteEvento = async (req, res) => {
  try {
    const eventoEliminado = await Evento.findByIdAndDelete(req.params.id);
    if (!eventoEliminado) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    res.json({ mensaje: 'Evento eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el evento', detalles: error.message });
  }
};

module.exports = {
  getEventos,
  getEventoById,
  createEvento,
  updateEvento,
  deleteEvento
};
