// index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Validar variables de entorno críticas antes de arrancar
if (!process.env.JWT_SECRET) {
  console.error("❌ Falta JWT_SECRET en las variables de entorno. Abortando.");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("❌ Falta MONGODB_URI en las variables de entorno. Abortando.");
  process.exit(1);
}

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
const nosotrosRoutes = require("./routes/nosotrosRoutes");
const serviciosRoutes = require("./routes/serviciosRoutes");
const fotosRoutes = require("./routes/fotosRoutes");
const videosRoutes = require("./routes/videosRoutes");
const eventosRoutes = require('./routes/eventosRoutes');
const perfilRoutes = require('./routes/perfilRoutes');

// Middleware de autenticación/autorización
const { authenticate, isAdmin } = require("./middlewares/auth");

// Inicializar la aplicación Express
const app = express();

// Confiar en el primer proxy (Render/Vercel van detrás de un balanceador).
// Necesario para que express-rate-limit identifique bien la IP via X-Forwarded-For.
app.set("trust proxy", 1);

// --- Seguridad ---
// Cabeceras HTTP seguras
app.use(helmet());

// CORS con lista blanca de orígenes (FRONTEND_URL puede ser varios separados por comas).
// Si no se configura, se permite todo (solo recomendable en desarrollo).
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn("⚠️  FRONTEND_URL no configurado: CORS permite TODOS los orígenes (solo dev).");
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (Postman, apps móviles, server-to-server)
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
  })
);

// Límite global de peticiones para mitigar abuso
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 peticiones por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Límite estricto para autenticación (anti fuerza bruta)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intenta de nuevo más tarde." },
});

// Parseo del cuerpo con límites de tamaño
app.use(express.json({ limit: "1mb" })); // Parsear solicitudes JSON
app.use(express.urlencoded({ extended: true, limit: "1mb" })); // Parsear solicitudes URL-encoded

// Conexión a la base de datos (si está en config)
const db = require("./config/db");
db.connect();

// Rutas públicas (sin autenticación) — con límite estricto anti fuerza bruta
app.use("/api/auth", authLimiter, authRoutes); // Login/registro

// Rutas protegidas (requieren JWT)
app.use("/api/admin", adminRoutes);
app.use("/api/upload", authenticate, isAdmin, uploadRoutes);
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
// Ruta para nosotros (misión y visión)
app.use("/api/nosotros", nosotrosRoutes);
// Ruta para servicios
app.use("/api/servicios", serviciosRoutes);
// Rutas para la galería
app.use("/api/fotos", fotosRoutes);
app.use("/api/videos", videosRoutes);
// Rutas para eventos
app.use("/api/eventos", eventosRoutes);
// Rutas para perfil de usuario
app.use("/api/perfil", perfilRoutes);

// Ruta raíz (GET /)
app.get("/", (req, res) => {
  res.send("Bienvenidos a mi API");
});

// 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Manejador de errores global (no filtra detalles internos en producción)
app.use((err, req, res, next) => {
  if (err.message === "Origen no permitido por CORS") {
    return res.status(403).json({ error: "Origen no permitido por CORS" });
  }
  console.error("Error no controlado:", err.message);
  const esProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: "Error interno del servidor",
    ...(esProd ? {} : { detalles: err.message }),
  });
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

module.exports = app; // Exportar la aplicación para pruebas u otros usos