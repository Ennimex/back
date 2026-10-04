const Talla = require("../models/Tallas");
const Categoria = require("../models/Categorias");
const Producto = require("../models/Producto");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { FILTRO_ACTIVOS } = require("../utils/filtroActivos");

// Verifica que la categoría de la talla exista. Lanza 400 si no.
const verificarCategoriaDeLaTalla = async (categoriaId) => {
  if (!mongoose.Types.ObjectId.isValid(categoriaId)) {
    throw new ApiError(400, "ID de categoría inválido");
  }
  const categoriaExiste = await Categoria.exists({ _id: categoriaId });
  if (!categoriaExiste) {
    throw new ApiError(400, "La categoría indicada no existe");
  }
};

// Pública: solo tallas activas, con su categoría
const getTallas = asyncHandler(async (req, res) => {
  const tallasActivas = await Talla.find(FILTRO_ACTIVOS).populate("categoriaId");
  res.json(tallasActivas);
});

// Admin: todas las tallas, activas y desactivadas
const getTallasAdmin = asyncHandler(async (req, res) => {
  const todasLasTallas = await Talla.find().populate("categoriaId");
  res.json(todasLasTallas);
});

// Crear nueva talla dentro de una categoría existente
const createTalla = asyncHandler(async (req, res) => {
  const { categoriaId, genero, talla, rangoEdad, medida } = req.body;
  await verificarCategoriaDeLaTalla(categoriaId);

  const nuevaTalla = new Talla({ categoriaId, genero, talla, rangoEdad, medida });
  const tallaGuardada = await nuevaTalla.save();
  res.status(201).json({
    mensaje: "Talla creada correctamente",
    talla: tallaGuardada,
  });
});

// Actualizar talla (si cambia de categoría, la nueva debe existir)
const updateTalla = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de talla inválido");
  }
  if (req.body.categoriaId !== undefined) {
    await verificarCategoriaDeLaTalla(req.body.categoriaId);
  }

  // Solo se actualizan los campos del formulario; `activo` se maneja aparte
  const { categoriaId, genero, talla, rangoEdad, medida } = req.body;
  const datosActualizados = {};
  if (categoriaId !== undefined) datosActualizados.categoriaId = categoriaId;
  if (genero !== undefined) datosActualizados.genero = genero;
  if (talla !== undefined) datosActualizados.talla = talla;
  if (rangoEdad !== undefined) datosActualizados.rangoEdad = rangoEdad;
  if (medida !== undefined) datosActualizados.medida = medida;

  const tallaActualizada = await Talla.findByIdAndUpdate(id, datosActualizados, {
    new: true,
    runValidators: true,
  }).populate("categoriaId");

  if (!tallaActualizada) {
    throw new ApiError(404, "Talla no encontrada");
  }

  res.json({
    mensaje: "Talla actualizada correctamente",
    talla: tallaActualizada,
  });
});

// "Eliminar" una talla = desactivarla (borrado lógico). Los productos y las
// solicitudes que la referencian la conservan y se puede reactivar.
const desactivarTalla = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de talla inválido");
  }

  const tallaDesactivada = await Talla.findByIdAndUpdate(id, { activo: false }, { new: true });
  if (!tallaDesactivada) {
    throw new ApiError(404, "Talla no encontrada");
  }

  // Cuántos productos activos siguen ofreciendo esta talla
  const productosActivosConEstaTalla = await Producto.countDocuments({
    tallasDisponibles: id,
    ...FILTRO_ACTIVOS,
  });

  res.json({
    mensaje: "Talla desactivada correctamente",
    talla: tallaDesactivada,
    productosActivos: productosActivosConEstaTalla,
  });
});

// Reactivar una talla desactivada
const reactivarTalla = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de talla inválido");
  }

  const tallaReactivada = await Talla.findByIdAndUpdate(id, { activo: true }, { new: true });
  if (!tallaReactivada) {
    throw new ApiError(404, "Talla no encontrada");
  }

  res.json({
    mensaje: "Talla reactivada correctamente",
    talla: tallaReactivada,
  });
});

module.exports = {
  getTallas,
  getTallasAdmin,
  createTalla,
  updateTalla,
  desactivarTalla,
  reactivarTalla,
};
