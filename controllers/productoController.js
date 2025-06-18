const Producto = require("../models/Producto");
const Talla = require("../models/Tallas"); // Import Talla model for validation
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier"); // importar para manejar streams
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const mongoose = require('mongoose');

// Obtener todos los productos con referencias pobladas
const getProductos = async (req, res) => {
  try {
    const productos = await Producto.find()
      .populate({
        path: "localidadId",
        select: "nombre descripcion"
      })
      .populate({
        path: "tallasDisponibles",
        populate: {
          path: "categoriaId"
        }
      })
      .lean();

    if (!productos || productos.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontraron productos en la base de datos"
      });
    }

    res.json(productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({
      error: "Error al obtener productos",
      detalles: error.message
    });
  }
};

// Crear nuevo producto con subida de imagen a Cloudinary
const createProducto = async (req, res) => {
  try {
    // Validar ObjectId para localidadId
    if (!mongoose.Types.ObjectId.isValid(req.body.localidadId)) {
      return res.status(400).json({
        error: "ID de localidad inválido"
      });
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

    // Prepare product data
    const productData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      localidadId: req.body.localidadId,
      tipoTela: req.body.tipoTela,
      tallasDisponibles: tallasDisponibles,
      imagenURL: req.body.imagenURL || ""
    };

    if (req.file) {
      // If there's a file, upload it to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "productos" },
        async (error, result) => {
          if (error) {
            console.error("Error al subir a Cloudinary:", error);
            return res.status(500).json({
              error: "Error al subir la imagen",
              detalles: error.message
            });
          }

          // Update imagenURL with Cloudinary URL
          productData.imagenURL = result.secure_url;

          try {
            // Create and save the product
            const nuevoProducto = new Producto(productData);
            const productoGuardado = await nuevoProducto.save();
            res.status(201).json({
              mensaje: "Producto creado correctamente",
              producto: productoGuardado
            });
          } catch (saveError) {
            console.error("Error al guardar producto:", saveError);
            res.status(400).json({
              error: "Error al crear producto",
              detalles: saveError.message
            });
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      // No file uploaded, save product directly
      const nuevoProducto = new Producto(productData);
      const productoGuardado = await nuevoProducto.save();
      res.status(201).json({
        mensaje: "Producto creado correctamente",
        producto: productoGuardado
      });
    }
  } catch (error) {
    console.error("Error general en createProducto:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      detalles: error.message
    });
  }
};

// Actualizar un producto existente
const updateProducto = async (req, res) => {
  try {
    const { id } = req.params; // Extraer el id de los parámetros

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "ID de producto inválido"
      });
    }

    // Obtener el producto existente para manipulación de imagen
    const productoExistente = await Producto.findById(id);
    if (!productoExistente) {
      return res.status(404).json({
        error: "Producto no encontrado"
      });
    }

    if (req.body.localidadId && !mongoose.Types.ObjectId.isValid(req.body.localidadId)) {
      return res.status(400).json({
        error: "ID de localidad inválido"
      });
    }

    // Validar tallasDisponibles si se incluyen en la actualización
    if (req.body.tallasDisponibles) {
      let tallasDisponibles = Array.isArray(req.body.tallasDisponibles) 
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

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre;
    if (req.body.descripcion !== undefined) updateData.descripcion = req.body.descripcion;
    if (req.body.localidadId !== undefined) updateData.localidadId = req.body.localidadId;
    if (req.body.tipoTela !== undefined) updateData.tipoTela = req.body.tipoTela;
    if (req.body.tallasDisponibles !== undefined) updateData.tallasDisponibles = req.body.tallasDisponibles;
    if (req.body.imagenURL !== undefined) updateData.imagenURL = req.body.imagenURL;

    // Handle image upload if there's a new file
    if (req.file) {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "productos" },
        async (error, result) => {
          if (error) {
            console.error("Error al subir a Cloudinary:", error);
            return res.status(500).json({
              error: "Error al subir la imagen",
              detalles: error.message
            });
          }

          // Delete old image from Cloudinary if it exists
          if (productoExistente.imagenURL) {
            const publicId = productoExistente.imagenURL.split('/').pop().split('.')[0];
            try {
              await cloudinary.uploader.destroy(`productos/${publicId}`);
            } catch (cloudinaryError) {
              console.error("Error al eliminar imagen antigua de Cloudinary:", cloudinaryError);
            }
          }

          // Update imagenURL with new Cloudinary URL
          updateData.imagenURL = result.secure_url;

          try {
            // Update the product - usar id extraído de req.params
            const productoActualizado = await Producto.findByIdAndUpdate(
              id,
              updateData,
              { new: true, runValidators: true }
            ).populate({
              path: "localidadId",
              select: "nombre descripcion"
            }).populate({
              path: "tallasDisponibles",
              populate: {
                path: "categoriaId"
              }
            });

            res.json({
              mensaje: "Producto actualizado correctamente",
              producto: productoActualizado
            });
          } catch (updateError) {
            console.error("Error al actualizar producto:", updateError);
            res.status(400).json({
              error: "Error al actualizar producto",
              detalles: updateError.message
            });
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } else {
      // No new image, update product directly
      try {
        const productoActualizado = await Producto.findByIdAndUpdate(
          id, // Usar id extraído de req.params
          updateData,
          { new: true, runValidators: true }
        ).populate({
          path: "localidadId",
          select: "nombre descripcion"
        }).populate({
          path: "tallasDisponibles",
          populate: {
            path: "categoriaId"
          }
        });

        res.json({
          mensaje: "Producto actualizado correctamente",
          producto: productoActualizado
        });
      } catch (updateError) {
        console.error("Error al actualizar producto:", updateError);
        res.status(400).json({
          error: "Error al actualizar producto",
          detalles: updateError.message
        });
      }
    }
  } catch (error) {
    console.error("Error general en updateProducto:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      detalles: error.message
    });
  }
};

// Eliminar un producto por ID
const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.findById(id);
    
    if (!producto) {
      return res.status(404).json({
        mensaje: "Producto no encontrado"
      });
    }

    if (producto.imagenURL) {
      const publicId = producto.imagenURL.split('/').pop().split('.')[0];
      try {
        await cloudinary.uploader.destroy(`productos/${publicId}`);
      } catch (cloudinaryError) {
        console.error("Error al eliminar imagen de Cloudinary:", cloudinaryError);
      }
    }

    await Producto.findByIdAndDelete(id);

    res.json({
      mensaje: "Producto eliminado correctamente",
      productoEliminado: producto
    });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({
      error: "Error al eliminar producto",
      detalles: error.message
    });
  }
};

module.exports = {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  upload
};