// Respalda colecciones completas a archivos JSON antes de correr una migración.
// Usa el formato EJSON (relajado) para que ObjectId y fechas se conserven y se
// puedan restaurar con mongoimport si hiciera falta.
//
// Los respaldos contienen datos personales (correos, hashes, tokens), por eso
// se escriben FUERA del repositorio: en ../respaldos-aterciopelada/<fecha>/,
// carpeta que además está en .gitignore.
//
// Uso (con MONGODB_URI en back/.env o en el entorno):
//   node scripts/respaldarColecciones.js                      → todas las colecciones, destino por defecto
//   node scripts/respaldarColecciones.js --destino <carpeta>  → otra carpeta
//   node scripts/respaldarColecciones.js productos fotos      → solo esas colecciones
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
// EJSON viene con el driver de MongoDB que mongoose ya incluye
const { EJSON } = mongoose.mongo.BSON;

// Carpeta por defecto: fuera del repo, con la fecha y hora de la corrida
const marcaDeTiempo = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const carpetaPorDefecto = path.resolve(__dirname, '..', '..', 'respaldos-aterciopelada', marcaDeTiempo);

// Argumentos: --destino <carpeta> opcional y, el resto, nombres de colección
const argumentos = process.argv.slice(2);
const posicionDestino = argumentos.indexOf('--destino');
const carpetaDestino = posicionDestino >= 0 ? argumentos[posicionDestino + 1] : carpetaPorDefecto;
const coleccionesPedidas = argumentos.filter((arg, i) => arg !== '--destino' && i !== posicionDestino + 1);

if (posicionDestino >= 0 && !carpetaDestino) {
  console.error('Uso: node scripts/respaldarColecciones.js [--destino <carpeta>] [colecciones...]');
  process.exit(1);
}

// Escribe cada colección en <carpetaDestino>/<coleccion>.json.
// Resultado: una línea por colección con el número de documentos guardados.
const respaldar = async () => {
  const uriDeMongo = process.env.MONGODB_URI;
  if (!uriDeMongo) {
    console.error('Falta MONGODB_URI en back/.env o en el entorno.');
    process.exit(1);
  }

  await mongoose.connect(uriDeMongo);
  fs.mkdirSync(carpetaDestino, { recursive: true });

  // Qué colecciones respaldar: las pedidas o todas las que existen
  const coleccionesExistentes = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  const coleccionesARespaldar = coleccionesPedidas.length > 0 ? coleccionesPedidas : coleccionesExistentes;

  for (const nombre of coleccionesARespaldar) {
    if (!coleccionesExistentes.includes(nombre)) {
      console.log(`${nombre}: no existe en la base, se omite`);
      continue;
    }
    const documentos = await mongoose.connection.db.collection(nombre).find({}).toArray();
    const rutaDelArchivo = path.join(carpetaDestino, `${nombre}.json`);
    fs.writeFileSync(rutaDelArchivo, EJSON.stringify(documentos, { relaxed: true }, 2));
    console.log(`${nombre}: ${documentos.length} documento(s) -> ${rutaDelArchivo}`);
  }

  await mongoose.disconnect();
};

respaldar().catch(async (error) => {
  console.error('El respaldo falló:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
