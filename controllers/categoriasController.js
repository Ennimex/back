const Categoria = require("../models/Categorias");
const Producto = require("../models/Producto");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { FILTRO_ACTIVOS } = require("../utils/filtroActivos");
const {
  buscarProductosActivosQueReferencian,
  responderConflictoPorProductos,
} = require("../utils/bloqueoPorReferencias");

// Multer en memoria: el archivo llega como buffer y se sube a Cloudinary
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Subir un buffer de imagen a Cloudinary (promesa sobre upload_stream)
const subirImagen = (buffer, folder = "categorias") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Derivar el public_id de Cloudinary a partir de la URL guardada
const publicIdDesdeUrl = (url) => {
  const partesDeLaUrl = url.split("/");
  return "categorias/" + partesDeLaUrl[partesDeLaUrl.length - 1].split(".")[0];
};

// Lista categorías según el filtro recibido y agrega a cada una cuántos
// productos activos tiene (en una sola consulta de agregación).
// Resultado: arreglo de categorías con `productosCount`.
const listarCategoriasConConteo = async (filtroDeCategorias) => {
  const categorias = await Categoria.find(filtroDeCategorias).lean();

  const conteosPorCategoria = await Producto.aggregate([
    { $match: { categoriaId: { $ne: null }, ...FILTRO_ACTIVOS } },
    { $group: { _id: "$categoriaId", total: { $sum: 1 } } },
  ]);
  const mapaDeConteos = {};
  conteosPorCategoria.forEach((conteo) => {
    mapaDeConteos[String(conteo._id)] = conteo.total;
  });

  return categorias.map((categoria) => ({
    ...categoria,
    productosCount: mapaDeConteos[String(categoria._id)] || 0,
  }));
};

// Pública: solo categorías activas, con conteo de productos
const getCategorias = asyncHandler(async (req, res) => {
  const categoriasActivas = await listarCategoriasConConteo(FILTRO_ACTIVOS);
  res.json(categoriasActivas);
});

// Admin: todas las categorías, activas y desactivadas
const getCategoriasAdmin = asyncHandler(async (req, res) => {
  const todasLasCategorias = await listarCategoriasConConteo({});
  res.json(todasLasCategorias);
});

// Crear una categoría (con imagen opcional)
const createCategoria = asyncHandler(async (req, res) => {
  const duplicada = await Categoria.findOne({ nombre: req.body.nombre });
  if (duplicada) {
    throw new ApiError(400, "Ya existe una categoría con ese nombre");
  }

  let imagenURL = req.body.imagenURL || "";
  if (req.file) {
    const resultadoDeSubida = await subirImagen(req.file.buffer);
    imagenURL = resultadoDeSubida.secure_url;
  }

  const nuevaCategoria = new Categoria({
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    imagenURL,
  });

  const categoriaGuardada = await nuevaCategoria.save();
  res.status(201).json({
    mensaje: "Categoría creada correctamente",
    categoria: categoriaGuardada,
  });
});

// Actualizar una categoría (nombre, descripción e imagen opcional)
const updateCategoria = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de categoría inválido");
  }

  const categoriaExistente = await Categoria.findById(id);
  if (!categoriaExistente) {
    throw new ApiError(404, "Categoría no encontrada");
  }

  const datosActualizados = {
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
  };

  // Si viene una nueva imagen, subirla y borrar la anterior
  if (req.file) {
    const resultadoDeSubida = await subirImagen(req.file.buffer);

    if (categoriaExistente.imagenURL) {
      try {
        await cloudinary.uploader.destroy(publicIdDesdeUrl(categoriaExistente.imagenURL));
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen antigua:", cloudinaryError.message);
      }
    }

    datosActualizados.imagenURL = resultadoDeSubida.secure_url;
  }

  const categoriaActualizada = await Categoria.findByIdAndUpdate(id, datosActualizados, {
    new: true,
    runValidators: true,
  });

  res.json({
    mensaje: "Categoría actualizada correctamente",
    categoria: categoriaActualizada,
  });
});

// "Eliminar" una categoría = desactivarla (borrado lógico). Solo se permite
// cuando ningún producto activo la usa; los productos desactivados conservan
// su categoriaId y la imagen se queda en Cloudinary porque se puede reactivar.
const desactivarCategoria = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de categoría inválido");
  }

  const categoriaExistente = await Categoria.findById(id);
  if (!categoriaExistente) {
    throw new ApiError(404, "Categoría no encontrada");
  }

  // Si hay productos activos que la usan, no se desactiva (409): el admin
  // debe desactivarlos o cambiarlos de categoría primero
  const referenciasActivas = await buscarProductosActivosQueReferencian({ categoriaId: id });
  if (referenciasActivas.total > 0) {
    return responderConflictoPorProductos(res, "categoría", referenciasActivas);
  }

  const categoriaDesactivada = await Categoria.findByIdAndUpdate(id, { activo: false }, { new: true });

  res.json({
    mensaje: "Categoría desactivada correctamente",
    categoria: categoriaDesactivada,
  });
});

// Reactivar una categoría desactivada
const reactivarCategoria = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de categoría inválido");
  }

  const categoriaReactivada = await Categoria.findByIdAndUpdate(id, { activo: true }, { new: true });
  if (!categoriaReactivada) {
    throw new ApiError(404, "Categoría no encontrada");
  }

  res.json({
    mensaje: "Categoría reactivada correctamente",
    categoria: categoriaReactivada,
  });
});

// Exportar controladores
module.exports = {
  getCategorias,
  getCategoriasAdmin,
  createCategoria,
  updateCategoria,
  desactivarCategoria,
  reactivarCategoria,
  upload,
};
