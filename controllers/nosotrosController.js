const Nosotros = require('../models/Nosotros');

// Obtener información de nosotros
const getNosotros = async (req, res) => {
  try {
    const nosotros = await Nosotros.findOne();
    res.json(nosotros || {});
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener información de nosotros',
      detalles: error.message 
    });
  }
};

// Obtener información por ID
const getNosotrosById = async (req, res) => {
  try {
    const nosotros = await Nosotros.findById(req.params.id);
    if (!nosotros) {
      return res.status(404).json({ error: 'Información no encontrada' });
    }
    res.json(nosotros);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener la información',
      detalles: error.message 
    });
  }
};

// Crear o actualizar información de nosotros
const createOrUpdateNosotros = async (req, res) => {
  try {
    const { mision, vision } = req.body;
    
    let nosotros = await Nosotros.findOne();
    
    if (!nosotros) {
      // Si no existe, crear nuevo
      nosotros = new Nosotros({ 
        mision, 
        vision 
      });
    } else {
      // Si existe, actualizar
      nosotros.mision = mision;
      nosotros.vision = vision;
    }
    
    const nosotrosGuardado = await nosotros.save();
    res.status(201).json(nosotrosGuardado);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al crear/actualizar la información',
      detalles: error.message 
    });
  }
};

// Actualizar información de nosotros
const updateNosotros = async (req, res) => {
  try {
    const { mision, vision } = req.body;
    
    const nosotrosActualizado = await Nosotros.findByIdAndUpdate(
      req.params.id,
      { mision, vision },
      { new: true, runValidators: true }
    );
    
    if (!nosotrosActualizado) {
      return res.status(404).json({ error: 'Información no encontrada' });
    }
    
    res.json(nosotrosActualizado);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al actualizar la información',
      detalles: error.message 
    });
  }
};

// Eliminar información de nosotros
const deleteNosotros = async (req, res) => {
  try {
    const nosotrosEliminado = await Nosotros.findByIdAndDelete(req.params.id);
    
    if (!nosotrosEliminado) {
      return res.status(404).json({ error: 'Información no encontrada' });
    }
    
    res.json({ mensaje: 'Información eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al eliminar la información',
      detalles: error.message 
    });
  }
};

module.exports = {
  getNosotros,
  getNosotrosById,
  createOrUpdateNosotros,
  updateNosotros,
  deleteNosotros
};
