const express = require('express');
const router = express.Router();

// Importar los modelos
const Nosotros = require('../models/Nosotros');
const Servicio = require('../models/Servicio');
const Contacto = require('../models/Contacto');
const Localidad = require('../models/Localidades');
const Tallas = require('../models/Tallas');
const Categorias = require("../models/Categorias");
const Producto = require('../models/Producto');
const Foto = require('../models/Fotos');
const Video = require('../models/Video');
const Colaboradores = require('../models/Colaboradores');


// Middleware para todas las rutas (no requiere autenticación)

// Obtener información de Nosotros
router.get('/nosotros', async (req, res) => {
  try {
    const nosotros = await Nosotros.findOne();
    res.json(nosotros || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información' });
  }
});

// Obtener todos los servicios
router.get('/servicios', async (req, res) => {
  try {
    const servicios = await Servicio.find();
    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' });
  }
});

// Obtener un servicio específico
router.get('/servicios/:id', async (req, res) => {
  try {
    const servicio = await Servicio.findById(req.params.id);
    if (!servicio) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    res.json(servicio);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el servicio' });
  }
});

// Obtener todas las localidades
router.get('/localidades', async (req, res) => {
  try {
    const localidades = await Localidad.find();
    res.json(localidades);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener localidades' });
  }
});

// Ruta pública para obtener todas las tallas con su categoría
router.get('/tallas', async (req, res) => {
  try {
    const tallas = await Tallas.find().populate('categoriaId');
    res.json(tallas);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener tallas',
      detalles: error.message 
    });
  }
});

// Ruta pública para obtener todas las categorías
router.get('/categorias', async (req, res) => {
  try {
    const categorias = await Categorias.find();
    res.json(categorias);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener categorías',
      detalles: error.message 
    });
  }
});

// Obtener información de contacto
router.get('/contacto', async (req, res) => {
  try {
    const contacto = await Contacto.findOne();
    res.json(contacto || {});
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener información de contacto' });
  }
});

// Ruta pública para obtener todos los productos con sus relaciones
router.get('/productos', async (req, res) => {
  try {
    const productos = await Producto.find()
      .populate('localidadId')
      .populate({
        path: 'tallasDisponibles',
        populate: {
          path: 'categoriaId'
        }
      });
    res.json(productos);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener productos',
      detalles: error.message 
    });
  }
});

// Ruta pública para obtener el detalle de un producto por su ID
router.get('/productos/:id', async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id)
      .populate('localidadId')
      .populate({
        path: 'tallasDisponibles',
        populate: {
          path: 'categoriaId'
        }
      });
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener el producto',
      detalles: error.message 
    });
  }
});

// RUTAS PARA GALERÍA

// Obtener todas las fotos
router.get('/galeria/fotos', async (req, res) => {
  try {
    const fotos = await Foto.find().sort({ _id: -1 });
    res.json(fotos);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener fotos',
      detalles: error.message 
    });
  }
});

// Obtener una foto específica
router.get('/galeria/fotos/:id', async (req, res) => {
  try {
    const foto = await Foto.findById(req.params.id);
    if (!foto) {
      return res.status(404).json({ error: 'Foto no encontrada' });
    }
    res.json(foto);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener la foto',
      detalles: error.message 
    });
  }
});

// Obtener todos los videos
router.get('/galeria/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ _id: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener videos',
      detalles: error.message 
    });
  }
});

// Obtener un video específico
router.get('/galeria/videos/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(video);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener el video',
      detalles: error.message 
    });
  }
});

// Obtener toda la galería (fotos y videos combinados)
router.get('/galeria', async (req, res) => {
  try {
    // Obtener fotos y videos
    const fotos = await Foto.find().lean();
    const videos = await Video.find().lean();
    
    // Añadir un campo tipo para diferenciarlos en el frontend
    const fotosConTipo = fotos.map(foto => ({ ...foto, tipo: 'foto' }));
    const videosConTipo = videos.map(video => ({ ...video, tipo: 'video' }));
    
    // Combinar y ordenar por fecha de creación (más recientes primero)
    const galeria = [...fotosConTipo, ...videosConTipo]
      .sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
    
    res.json(galeria);
  } catch (error) {
    console.error('Error al obtener la galería:', error);
    res.status(500).json({
      error: 'Error al obtener elementos de la galería',
      detalles: error.message
    });
  }
});

// Obtener galería paginada
router.get('/galeria/pagina/:pagina', async (req, res) => {
  try {
    const pagina = parseInt(req.params.pagina) || 1;
    const porPagina = parseInt(req.query.limite) || 12;
    const skip = (pagina - 1) * porPagina;
    
    // Obtener total de elementos
    const totalFotos = await Foto.countDocuments();
    const totalVideos = await Video.countDocuments();
    const totalElementos = totalFotos + totalVideos;
    
    // Obtener ambos tipos de elementos
    const fotos = await Foto.find().lean();
    const videos = await Video.find().lean();
    
    // Combinar y agregar tipo
    const fotosConTipo = fotos.map(foto => ({ ...foto, tipo: 'foto' }));
    const videosConTipo = videos.map(video => ({ ...video, tipo: 'video' }));
    
    // Combinar, ordenar y paginar
    const galeriaCompleta = [...fotosConTipo, ...videosConTipo]
      .sort((a, b) => b._id.toString().localeCompare(a._id.toString()));
    
    const galeriaPaginada = galeriaCompleta.slice(skip, skip + porPagina);
    
    res.json({
      galeria: galeriaPaginada,
      paginacion: {
        total: totalElementos,
        pagina,
        porPagina,
        totalPaginas: Math.ceil(totalElementos / porPagina)
      }
    });
  } catch (error) {
    console.error('Error al obtener la galería paginada:', error);
    res.status(500).json({
      error: 'Error al obtener elementos de la galería',
      detalles: error.message
    });
  }
});

// Obtener todos los colaboradores
router.get('/colaboradores', async (req, res) => {
  try {
    const colaboradores = await Colaboradores.find();
    res.json(colaboradores);
  } catch (error) {
    res.status(500).json({ 
      error: 'Error al obtener colaboradores',
      detalles: error.message 
    });
  }
});



module.exports = router;