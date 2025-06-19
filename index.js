// index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Cargar variables de entorno desde el archivo .envrs
dotenv.config();

// Importar rutas
const uploadRoutes = require("./routes/uploadRoutes");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const publicContenidoRoutes = require("./routes/publicContenido");
const adminContenidoRoutes = require("./routes/adminContenido");
const productoRoutes = require("./routes/productoRoutes");
const tallasRoutes = require("./routes/tallasRoutes");
const categoriasRoutes = require("./routes/categoriasRoutes");
const localidadesRoutes = require("./routes/localidadesRoutes");
const fotosRoutes = require("./routes/fotosRoutes");
const videosRoutes = require("./routes/videosRoutes");

// Inicializar la aplicación Express
const app = express();

// Middlewares
app.use(cors()); // Permitir solicitudes desde el frontend
app.use(express.json()); // Parsear solicitudes JSON
app.use(express.urlencoded({ extended: true })); // Parsear solicitudes URL-encoded

// Conexión a la base de datos (si está en config)
const db = require("./config/db");
db.connect();

// Rutas públicas (sin autenticación)
app.use("/api/auth", authRoutes); // Login/registro

// Rutas protegidas (requieren JWT)
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/public", publicContenidoRoutes);
app.use("/api/admin/content", adminContenidoRoutes);
// Rutas de productos
app.use("/api/productos", productoRoutes);
// Rutas de tallas
app.use("/api/tallas", tallasRoutes);
// Rutas de categorías
app.use("/api/categorias", categoriasRoutes);
// Ruta para las localidades
app.use("/api/localidades", localidadesRoutes);
// Rutas para la administración de galería
// Rutas para la galería
app.use("/api/fotos", fotosRoutes);
app.use("/api/videos", videosRoutes);

// Ruta raíz (GET /)
app.get("/", (req, res) => {
  res.send("Bienvenidos a mi API");
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
