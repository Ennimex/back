const Producto = require("../models/Producto");
const Categoria = require("../models/Categorias");
const Localidad = require("../models/Localidades");
const Talla = require("../models/Tallas");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { FILTRO_ACTIVOS } = require("../utils/filtroActivos");
const {
  multerDeImagenes,
  subirImagen,
  eliminarImagen,
  publicIdDeImagen,
  extraerPublicIdDeUrl,
} = require("../utils/imagenesCloudinary");

// Carpeta de Cloudinary donde viven las imágenes de productos
const CARPETA_CLOUDINARY = "productos";

// Multer en memoria: el archivo llega como buffer y se sube a Cloudinary
const upload = multerDeImagenes();

// Poblar referencias de un query de productos (localidad, categoría y tallas)
const poblarProducto = (query) =>
  query
    .populate({ path: "localidadId", select: "nombre descripcion" })
    .populate({ path: "categoriaId", select: "nombre" })
    .populate({ path: "tallasDisponibles", populate: { path: "categoriaId" } });

// Convierte lo que llega en `tallasDisponibles` en un arreglo limpio de ids.
// Puede venir vacío, como un solo string (formulario multipart con una talla)
// o como arreglo. Resultado: arreglo de strings, posiblemente vacío.
const normalizarListaDeTallas = (valorRecibido) => {
  const noVieneNada = valorRecibido === undefined || valorRecibido === null || valorRecibido === "";
  if (noVieneNada) {
    return [];
  }
  const listaCruda = Array.isArray(valorRecibido) ? valorRecibido : [valorRecibido];
  const listaSinVacios = listaCruda.filter((id) => id !== "" && id !== null && id !== undefined);
  return listaSinVacios.map(String);
};

// Verifica que la localidad exista. Lanza 400 con mensaje claro si no.
const verificarLocalidad = async (localidadId) => {
  if (!mongoose.Types.ObjectId.isValid(localidadId)) {
    throw new ApiError(400, "ID de localidad inválido");
  }
  const localidadExiste = await Localidad.exists({ _id: localidadId });
  if (!localidadExiste) {
    throw new ApiError(400, "La localidad indicada no existe");
  }
};

// Verifica que la categoría exista (cuando viene una). Lanza 400 si no.
const verificarCategoria = async (categoriaId) => {
  if (!categoriaId) {
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(categoriaId)) {
    throw new ApiError(400, "ID de categoría inválido");
  }
  const categoriaExiste = await Categoria.exists({ _id: categoriaId });
  if (!categoriaExiste) {
    throw new ApiError(400, "La categoría indicada no existe");
  }
};

// Verifica que todas las tallas existan y pertenezcan a la categoría del
// producto. Un producto sin categoría no puede tener tallas, porque las
// tallas se definen por categoría. Lanza 400 con el detalle si algo falla.
const verificarTallasDeLaCategoria = async (tallasIds, categoriaId) => {
  const idsConFormatoInvalido = tallasIds.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (idsConFormatoInvalido.length > 0) {
    throw new ApiError(400, `IDs de talla inválidos: ${idsConFormatoInvalido.join(", ")}`);
  }
  if (tallasIds.length === 0) {
    return;
  }
  if (!categoriaId) {
    throw new ApiError(400, "Asigna una categoría al producto antes de elegir tallas");
  }

  const tallasEncontradas = await Talla.find({ _id: { $in: tallasIds } }).select("categoriaId talla").lean();
  const cantidadDeIdsDistintos = new Set(tallasIds).size;
  if (tallasEncontradas.length !== cantidadDeIdsDistintos) {
    throw new ApiError(400, "Alguna de las tallas indicadas no existe");
  }

  const tallasDeOtraCategoria = tallasEncontradas.filter(
    (talla) => String(talla.categoriaId) !== String(categoriaId)
  );
  if (tallasDeOtraCategoria.length > 0) {
    const nombresDeTallas = tallasDeOtraCategoria.map((talla) => talla.talla).join(", ");
    throw new ApiError(400, `Las tallas ${nombresDeTallas} no pertenecen a la categoría del producto`);
  }
};

// Pública: productos activos con referencias pobladas
// (devuelve [] cuando no hay productos; antes respondía 404 y rompía a los consumidores)
// Sin .lean(): los documentos se serializan con virtuales (imagenURL).
const getProductos = asyncHandler(async (req, res) => {
  const productosActivos = await poblarProducto(Producto.find(FILTRO_ACTIVOS));
  res.json(productosActivos || []);
});

// Admin: todos los productos, activos y desactivados, para poder reactivarlos
const getProductosAdmin = asyncHandler(async (req, res) => {
  const todosLosProductos = await poblarProducto(Producto.find());
  res.json(todosLosProductos || []);
});

// Crear nuevo producto con subida de imagen a Cloudinary
const createProducto = asyncHandler(async (req, res) => {
  if (!req.body.localidadId) {
    throw new ApiError(400, "La localidad es obligatoria");
  }

  // Referencias: localidad, categoría y tallas coherentes con la categoría
  const categoriaId = req.body.categoriaId || null;
  const tallasIds = normalizarListaDeTallas(req.body.tallasDisponibles);
  await verificarLocalidad(req.body.localidadId);
  await verificarCategoria(categoriaId);
  await verificarTallasDeLaCategoria(tallasIds, categoriaId);

  // Preparar datos del producto
  const datosDelProducto = {
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    localidadId: req.body.localidadId,
    categoriaId,
    tipoTela: req.body.tipoTela,
    tallasDisponibles: tallasIds,
    // Si el panel manda una URL ya existente (sin archivo), se guarda tal cual
    imagen: {
      url: req.body.imagenURL || "",
      publicId: extraerPublicIdDeUrl(req.body.imagenURL || ""),
    },
  };

  // Si viene un archivo, subirlo a Cloudinary (tiene prioridad sobre la URL)
  if (req.file) {
    datosDelProducto.imagen = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
  }

  const nuevoProducto = new Producto(datosDelProducto);
  const productoGuardado = await nuevoProducto.save();
  res.status(201).json({
    mensaje: req.file
      ? "Producto creado correctamente con imagen subida"
      : "Producto creado correctamente sin imagen",
    producto: productoGuardado,
    imagenSubida: !!req.file,
  });
});

// Actualizar un producto existente (solo los campos provistos)
const updateProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de producto inválido");
  }

  // Obtener el producto existente para manipulación de imagen y referencias
  const productoExistente = await Producto.findById(id);
  if (!productoExistente) {
    throw new ApiError(404, "Producto no encontrado");
  }

  // Qué referencias cambian en esta petición. Solo se valida lo que cambia,
  // para que editar el nombre de un producto antiguo no falle por sus tallas.
  const seCambiaLocalidad = req.body.localidadId !== undefined;
  const seCambiaCategoria = req.body.categoriaId !== undefined;
  const seCambianTallas = req.body.tallasDisponibles !== undefined;

  if (seCambiaLocalidad) {
    await verificarLocalidad(req.body.localidadId);
  }

  // categoriaId puede venir con un id válido (asignar), vacío (limpiar) o ausente (no tocar)
  const categoriaResultante = seCambiaCategoria
    ? req.body.categoriaId || null
    : productoExistente.categoriaId;
  const tallasResultantes = seCambianTallas
    ? normalizarListaDeTallas(req.body.tallasDisponibles)
    : (productoExistente.tallasDisponibles || []).map(String);

  if (seCambiaCategoria) {
    await verificarCategoria(categoriaResultante);
  }
  if (seCambiaCategoria || seCambianTallas) {
    await verificarTallasDeLaCategoria(tallasResultantes, categoriaResultante);
  }

  // Preparar datos de actualización (solo los campos provistos)
  const datosActualizados = {};
  if (req.body.nombre !== undefined) datosActualizados.nombre = req.body.nombre;
  if (req.body.descripcion !== undefined) datosActualizados.descripcion = req.body.descripcion;
  if (seCambiaLocalidad) datosActualizados.localidadId = req.body.localidadId;
  if (seCambiaCategoria) datosActualizados.categoriaId = categoriaResultante;
  if (req.body.tipoTela !== undefined) datosActualizados.tipoTela = req.body.tipoTela;
  if (seCambianTallas) datosActualizados.tallasDisponibles = tallasResultantes;
  if (req.body.imagenURL !== undefined) {
    datosActualizados.imagen = {
      url: req.body.imagenURL,
      publicId: extraerPublicIdDeUrl(req.body.imagenURL),
    };
  }

  // Si viene una nueva imagen, subirla y borrar la anterior de Cloudinary
  if (req.file) {
    const imagenNueva = await subirImagen(req.file.buffer, CARPETA_CLOUDINARY);
    await eliminarImagen(publicIdDeImagen(productoExistente.imagen));
    datosActualizados.imagen = imagenNueva;
  }

  const productoActualizado = await poblarProducto(
    Producto.findByIdAndUpdate(id, datosActualizados, { new: true, runValidators: true })
  );

  res.json({
    mensaje: req.file
      ? "Producto actualizado correctamente con nueva imagen"
      : "Producto actualizado correctamente",
    producto: productoActualizado,
    imagenActualizada: !!req.file,
  });
});

// "Eliminar" un producto = desactivarlo (borrado lógico). Deja de aparecer
// en el sitio, pero las solicitudes y favoritos que lo referencian siguen
// íntegros y se puede reactivar. La imagen se conserva en Cloudinary.
const desactivarProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de producto inválido");
  }

  const productoDesactivado = await Producto.findByIdAndUpdate(id, { activo: false }, { new: true });
  if (!productoDesactivado) {
    throw new ApiError(404, "Producto no encontrado");
  }

  res.json({
    mensaje: "Producto desactivado correctamente",
    producto: productoDesactivado,
  });
});

// Reactivar un producto desactivado para que vuelva a aparecer en el sitio
const reactivarProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "ID de producto inválido");
  }

  const productoReactivado = await Producto.findByIdAndUpdate(id, { activo: true }, { new: true });
  if (!productoReactivado) {
    throw new ApiError(404, "Producto no encontrado");
  }

  res.json({
    mensaje: "Producto reactivado correctamente",
    producto: productoReactivado,
  });
});

module.exports = {
  getProductos,
  getProductosAdmin,
  createProducto,
  updateProducto,
  desactivarProducto,
  reactivarProducto,
  upload,
};
