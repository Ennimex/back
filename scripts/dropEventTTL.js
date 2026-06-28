/**
 * Script de un solo uso: elimina el índice TTL de auto-borrado de eventos.
 *
 * Por qué: el modelo Eventos ya NO tiene `fechaEliminacion` ni su índice TTL,
 * pero quitarlo del código NO borra el índice que ya existe en MongoDB. Si no se
 * elimina, Mongo SEGUIRÁ auto-borrando los eventos pasados.
 *
 * Cómo ejecutarlo (una sola vez), con la URI de la base de datos (la misma de Render):
 *   MONGODB_URI="mongodb+srv://...." node scripts/dropEventTTL.js
 * (o crea un .env con MONGODB_URI y corre: node -r dotenv/config scripts/dropEventTTL.js)
 */
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Falta MONGODB_URI. Ej: MONGODB_URI="..." node scripts/dropEventTTL.js');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection('eventos');

  const indexes = await col.indexes();
  console.log('Índices actuales:', indexes.map((i) => i.name).join(', '));

  const ttl = indexes.find((i) => i.key && i.key.fechaEliminacion !== undefined);
  if (ttl) {
    await col.dropIndex(ttl.name);
    console.log(`✓ Índice TTL eliminado: ${ttl.name}`);
  } else {
    console.log('No hay índice TTL sobre fechaEliminacion (nada que borrar).');
  }

  // Limpiar el campo viejo de los documentos existentes (opcional, deja la colección prolija)
  const r = await col.updateMany({ fechaEliminacion: { $exists: true } }, { $unset: { fechaEliminacion: '' } });
  console.log(`✓ fechaEliminacion eliminado de ${r.modifiedCount} documento(s).`);

  await mongoose.disconnect();
  console.log('Listo.');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
