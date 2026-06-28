const Producto = require("../models/Producto");
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier"); // importar para manejar streams
const mongoose = require('mongoose');
const asyncHandler = require("../utils/asyncHandler");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Subir un buffer de imagen a Cloudinary (promesa sobre upload_stream)
const subirImagen = (buffer, folder = "productos") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// Poblar referencias de un query de productos (localidad, categoría y tallas)
const poblarProducto = (query) =>
  query
    .populate({ path: "localidadId", select: "nombre descripcion" })
    .populate({ path: "categoriaId", select: "nombre" })
    .populate({ path: "tallasDisponibles", populate: { path: "categoriaId" } });

// Obtener todos los productos con referencias pobladas
// (devuelve [] cuando no hay productos; antes respondía 404 y rompía a los consumidores)
const getProductos = asyncHandler(async (req, res) => {
  const productos = await poblarProducto(Producto.find()).lean();
  res.json(productos || []);
});

// Crear nuevo producto con subida de imagen a Cloudinary
const createProducto = asyncHandler(async (req, res) => {
  // Validar ObjectId para localidadId
  if (!mongoose.Types.ObjectId.isValid(req.body.localidadId)) {
    return res.status(400).json({ error: "ID de localidad inválido" });
  }

  // Validar array de tallasDisponibles
  let tallasDisponibles = req.body.tallasDisponibles;
  if (typeof tallasDisponibles === "string") {
    tallasDisponibles = [tallasDisponibles];
  }

  // Validar que cada ID de talla sea un ObjectId válido
  if (tallasDisponibles && tallasDisponibles.length > 0) {
    const invalidTallas = tallasDisponibles.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidTallas.length > 0) {
      return res.status(400).json({
        error: "IDs de talla inválidos",
        detalles: `Los siguientes IDs no son válidos: ${invalidTallas.join(", ")}`
      });
    }
  }

  // Validar categoriaId si viene (opcional)
  if (req.body.categoriaId && !mongoose.Types.ObjectId.isValid(req.body.categoriaId)) {
    return res.status(400).json({ error: "ID de categoría inválido" });
  }

  // Preparar datos del producto
  const productData = {
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    localidadId: req.body.localidadId,
    categoriaId: req.body.categoriaId || null,
    tipoTela: req.body.tipoTela,
    tallasDisponibles: tallasDisponibles,
    imagenURL: req.body.imagenURL || ""
  };

  // Si viene un archivo, subirlo a Cloudinary
  if (req.file) {
    const result = await subirImagen(req.file.buffer, "productos");
    productData.imagenURL = result.secure_url;
  }

  const nuevoProducto = new Producto(productData);
  const productoGuardado = await nuevoProducto.save();
  res.status(201).json({
    mensaje: req.file
      ? "Producto creado correctamente con imagen subida"
      : "Producto creado correctamente sin imagen",
    producto: productoGuardado,
    imagenSubida: !!req.file
  });
});

// Actualizar un producto existente
const updateProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  // Obtener el producto existente para manipulación de imagen
  const productoExistente = await Producto.findById(id);
  if (!productoExistente) {
    return res.status(404).json({ error: "Producto no encontrado" });
  }

  if (req.body.localidadId && !mongoose.Types.ObjectId.isValid(req.body.localidadId)) {
    return res.status(400).json({ error: "ID de localidad inválido" });
  }

  // categoriaId puede venir con un id válido (asignar), vacío (limpiar) o ausente (no tocar)
  if (req.body.categoriaId && !mongoose.Types.ObjectId.isValid(req.body.categoriaId)) {
    return res.status(400).json({ error: "ID de categoría inválido" });
  }

  // Validar tallasDisponibles si se incluyen en la actualización
  if (req.body.tallasDisponibles) {
    const tallasDisponibles = Array.isArray(req.body.tallasDisponibles)
      ? req.body.tallasDisponibles
      : [req.body.tallasDisponibles];

    const invalidTallas = tallasDisponibles.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidTallas.length > 0) {
      return res.status(400).json({
        error: "IDs de talla inválidos",
        detalles: `Los siguientes IDs no son válidos: ${invalidTallas.join(", ")}`
      });
    }
  }

  // Preparar datos de actualización (solo los campos provistos)
  const updateData = {};
  if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre;
  if (req.body.descripcion !== undefined) updateData.descripcion = req.body.descripcion;
  if (req.body.localidadId !== undefined) updateData.localidadId = req.body.localidadId;
  if (req.body.categoriaId !== undefined) updateData.categoriaId = req.body.categoriaId || null;
  if (req.body.tipoTela !== undefined) updateData.tipoTela = req.body.tipoTela;
  if (req.body.tallasDisponibles !== undefined) updateData.tallasDisponibles = req.body.tallasDisponibles;
  if (req.body.imagenURL !== undefined) updateData.imagenURL = req.body.imagenURL;

  // Si viene una nueva imagen, subirla y borrar la anterior
  if (req.file) {
    const result = await subirImagen(req.file.buffer, "productos");

    if (productoExistente.imagenURL) {
      const publicId = productoExistente.imagenURL.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`productos/${publicId}`);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen antigua de Cloudinary:", cloudinaryError.message);
      }
    }

    updateData.imagenURL = result.secure_url;
  }

  const productoActualizado = await poblarProducto(
    Producto.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
  );

  res.json({
    mensaje: req.file
      ? "Producto actualizado correctamente con nueva imagen"
      : "Producto actualizado correctamente",
    producto: productoActualizado,
    imagenActualizada: !!req.file
  });
});

// Eliminar un producto por ID
const deleteProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const producto = await Producto.findById(id);

  if (!producto) {
    return res.status(404).json({ mensaje: "Producto no encontrado" });
  }

  if (producto.imagenURL) {
    const publicId = producto.imagenURL.split('/').pop().split('.')[0];
    try {
      await cloudinary.uploader.destroy(`productos/${publicId}`);
    } catch (cloudinaryError) {
      console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError.message);
    }
  }

  await Producto.findByIdAndDelete(id);

  res.json({
    mensaje: "Producto eliminado correctamente",
    productoEliminado: {
      id: producto._id,
      nombre: producto.nombre,
      imagenEliminada: !!producto.imagenURL
    }
  });
});

module.exports = {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  upload
};
