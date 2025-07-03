const cloudinary = require('cloudinary').v2;

// Limpiar las variables de entorno de espacios en blanco y caracteres especiales
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// Validar que las variables de entorno estén presentes
if (!cloudName || !apiKey || !apiSecret) {
  console.error('Error: Variables de entorno de Cloudinary no están configuradas correctamente');
  console.error('CLOUDINARY_CLOUD_NAME:', cloudName ? 'Configurado' : 'No configurado');
  console.error('CLOUDINARY_API_KEY:', apiKey ? 'Configurado' : 'No configurado');
  console.error('CLOUDINARY_API_SECRET:', apiSecret ? 'Configurado' : 'No configurado');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
  timeout: 120000 // Timeout global de 2 minutos
});

module.exports = cloudinary;