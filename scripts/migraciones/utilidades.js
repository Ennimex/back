// Utilidades compartidas por los scripts de migración de scripts/migraciones/.
//
// Todas las migraciones siguen las mismas reglas:
//   - Son idempotentes: correrlas dos veces no cambia nada la segunda vez.
//   - Aceptan --simulacion: solo informan qué cambiarían, sin escribir.
//   - Se conectan con MONGODB_URI (del .env de back/ o del entorno).
//
// Uso típico desde back/:
//   node scripts/migraciones/001-fase1-integridad-pedidos.js --simulacion
//   node scripts/migraciones/001-fase1-integridad-pedidos.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');

// true cuando el script se corrió con --simulacion: no se escribe nada
const esSimulacion = process.argv.includes('--simulacion');

// Abre la conexión a la base. Resultado: mongoose conectado o el proceso
// termina con error si falta MONGODB_URI.
const conectar = async () => {
  const uriDeMongo = process.env.MONGODB_URI;
  if (!uriDeMongo) {
    console.error('Falta MONGODB_URI en back/.env o en el entorno.');
    process.exit(1);
  }
  await mongoose.connect(uriDeMongo);
};

// Cierra la conexión al terminar (en éxito o en error).
const desconectar = async () => {
  await mongoose.disconnect();
};

// Imprime una línea de avance, con el prefijo [simulación] cuando aplica.
const informar = (texto) => {
  const prefijo = esSimulacion ? '[simulación] ' : '';
  console.log(`${prefijo}${texto}`);
};

// Ejecuta la migración recibida con conexión, manejo de errores y cierre.
// Resultado: código de salida 0 si terminó bien, 1 si falló.
const ejecutarMigracion = async (nombre, migracion) => {
  informar(`Iniciando migración: ${nombre}`);
  try {
    await conectar();
    await migracion();
    informar(esSimulacion ? 'Simulación terminada. No se escribió nada.' : 'Migración terminada.');
  } catch (error) {
    console.error('La migración falló:', error.message);
    process.exitCode = 1;
  } finally {
    await desconectar();
  }
};

module.exports = { esSimulacion, informar, ejecutarMigracion };
