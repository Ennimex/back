const express = require('express');
const router = express.Router();
const {
    getVideos,
    getVideoById,
    createVideo,
    updateVideo,
    deleteVideo,
    upload
} = require('../controllers/videosController');
const { authenticate, isAdmin } = require("../middlewares/auth");
// Importa el middleware de logging
const requestLogger = require('../middlewares/requestLogger');

// Aplicar logging a todas las rutas de videos
router.use(requestLogger);

// Rutas públicas
router.get('/', getVideos);
router.get('/:id', getVideoById);

// Rutas protegidas (solo admin)
router.post('/', authenticate, isAdmin, upload.single('video'), createVideo);
router.put('/:id', authenticate, isAdmin, upload.single('video'), updateVideo);
router.delete('/:id', authenticate, isAdmin, deleteVideo);

module.exports = router;
