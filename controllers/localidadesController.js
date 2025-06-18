const Localidad = require('../models/Localidades');

// Obtener todas las localidades
const getLocalidades = async (req, res) => {
  try {
    const localidades = await Localidad.find();
    res.json(localidades);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener localidades',
      detalles: error.message 
    });
  }
};

// Obtener una localidad por ID
const getLocalidadById = async (req, res) => {
  try {
    const localidad = await Localidad.findById(req.params.id);
    if (!localidad) {
      return res.status(404).json({ error: 'Localidad no encontrada' });
    }
    res.json(localidad);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener la localidad',
      detalles: error.message 
    });
  }
};

// Crear nueva localidad
const createLocalidad = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Verificar si ya existe una localidad con el mismo nombre
    const localidadExistente = await Localidad.findOne({ nombre });
    if (localidadExistente) {
      return res.status(400).json({ error: 'Ya existe una localidad con ese nombre' });
    }
    
    const nuevaLocalidad = new Localidad({ 
      nombre, 
      descripcion 
    });
    
    const localidadGuardada = await nuevaLocalidad.save();
    res.status(201).json(localidadGuardada);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al crear la localidad',
      detalles: error.message 
    });
  }
};

// Actualizar localidad
const updateLocalidad = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    // Verificar si ya existe otra localidad con el mismo nombre
    const localidadExistente = await Localidad.findOne({ 
      nombre, 
      _id: { $ne: req.params.id } 
    });
    
    if (localidadExistente) {
      return res.status(400).json({ error: 'Ya existe otra localidad con ese nombre' });
    }
    
    const localidadActualizada = await Localidad.findByIdAndUpdate(
      req.params.id,
      { nombre, descripcion },
      { new: true, runValidators: true }
    );
    
    if (!localidadActualizada) {
      return res.status(404).json({ error: 'Localidad no encontrada' });
    }
    
    res.json(localidadActualizada);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al actualizar la localidad',
      detalles: error.message 
    });
  }
};

// Eliminar localidad
const deleteLocalidad = async (req, res) => {
  try {
    const localidadEliminada = await Localidad.findByIdAndDelete(req.params.id);
    
    if (!localidadEliminada) {
      return res.status(404).json({ error: 'Localidad no encontrada' });
    }
    
    res.json({ mensaje: 'Localidad eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al eliminar la localidad',
      detalles: error.message 
    });
  }
};

module.exports = {
  getLocalidades,
  getLocalidadById,
  createLocalidad,
  updateLocalidad,
  deleteLocalidad
};
