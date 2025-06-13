const Producto = require("../models/Producto");
const Talla = require("../models/Tallas"); // Import Talla model for validation
const multer = require("multer");
const cloudinary = require("../config/cloudinaryConfig");
const streamifier = require("streamifier");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
    // Log incoming request body for debugging
    console.log("Incoming request body:", req.body);

    // Parse tallasDisponibles as an array
    let tallasDisponibles = req.body.tallasDisponibles;
    if (typeof tallasDisponibles === "string") {
      tallasDisponibles = [tallasDisponibles];
    } else if (!Array.isArray(tallasDisponibles)) {
      tallasDisponibles = tallasDisponibles ? [tallasDisponibles] : [];
    }

    console.log("Parsed tallasDisponibles:", tallasDisponibles);

    // Validate that each talla ID exists in the database
    if (tallasDisponibles.length > 0) {
      const validTallas = await Talla.find({ _id: { $in: tallasDisponibles } });
      if (validTallas.length !== tallasDisponibles.length) {
        const invalidIds = tallasDisponibles.filter(
          id => !validTallas.some(talla => talla._id.toString() === id)
        );
        return res.status(400).json({
          error: "Tallas inválidas",
          detalles: `Los siguientes IDs de talla no existen: ${invalidIds.join(", ")}`
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
          console.log("Cloudinary upload successful, imagenURL:", productData.imagenURL);

          try {
            // Create and save the product
            const nuevoProducto = new Producto(productData);
            const productoGuardado = await nuevoProducto.save();
            console.log("Producto guardado:", productoGuardado);
            res.status(201).json(productoGuardado);
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
      console.log("Saving product without image:", productData);
      const productoGuardado = await nuevoProducto.save();
      res.status(201).json(productoGuardado);
    }
  } catch (error) {
    console.error("Error general en createProducto:", error);
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
  deleteProducto,
  createProducto,
  upload
};