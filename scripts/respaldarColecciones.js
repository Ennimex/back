// Respalda colecciones completas a archivos JSON antes de correr una migración.
// Usa el formato EJSON (relajado) para que ObjectId y fechas se conserven y se
// puedan restaurar con mongoimport si hiciera falta.
//
// Uso (con MONGODB_URI en back/.env o en el entorno):
//   node scripts/respaldarColecciones.js <carpetaDestino> [coleccion1 coleccion2 ...]
// Sin lista de colecciones, respalda todas las de la base.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
// EJSON viene con el driver de MongoDB que mongoose ya incluye
const { EJSON } = mongoose.mongo.BSON;

const [carpetaDestino, ...coleccionesPedidas] = process.argv.slice(2);

if (!carpetaDestino) {
  console.error('Uso: node scripts/respaldarColecciones.js <carpetaDestino> [colecciones...]');
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
