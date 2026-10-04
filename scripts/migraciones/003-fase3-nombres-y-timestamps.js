// Migración 003 — Fase 3: nombres en español, colecciones fijas y timestamps.
//
// Qué hace (y nada más):
//   1. Renombra colecciones que Mongoose había pluralizado en inglés:
//        solicituds    -> solicitudes
//        valors        -> valores
//        mensajebuzons -> mensajesbuzon
//      Si el destino ya existe y el origen está vacío, elimina el origen. Si
//      los dos tienen documentos, no toca nada y lo informa para revisarlo a mano.
//   2. users: renombra los campos name -> nombre y phone -> telefono.
//   3. fotos y videos: fechaSubida pasa a createdAt (si ya había createdAt,
//      solo se retira fechaSubida).
//   4. En todas las colecciones, completa createdAt (con la fecha que trae el
//      _id) y updatedAt (igual a createdAt) donde falten, para que los
//      timestamps de Mongoose tengan valor en los documentos antiguos.
//
// Es idempotente: una segunda corrida reporta cero cambios. Con --simulacion
// solo cuenta e informa, sin escribir.
const mongoose = require('mongoose');
const { esSimulacion, informar, ejecutarMigracion } = require('./utilidades');
const Categoria = require('../../models/Categorias');
const Colaborador = require('../../models/Colaboradores');
const ConfiguracionSitio = require('../../models/ConfiguracionSitio');
const Evento = require('../../models/Eventos');
const Foto = require('../../models/Fotos');
const Localidad = require('../../models/Localidades');
const MensajeBuzon = require('../../models/MensajeBuzon');
const Nosotros = require('../../models/Nosotros');
const PreguntaFrecuente = require('../../models/PreguntaFrecuente');
const Producto = require('../../models/Producto');
const Servicio = require('../../models/Servicio');
const Solicitud = require('../../models/Solicitud');
const Talla = require('../../models/Tallas');
const User = require('../../models/User');
const Valor = require('../../models/Valor');
const Video = require('../../models/Video');

// Colecciones cuyo nombre cambia (origen pluralizado por Mongoose -> nombre fijo)
const RENOMBRES_DE_COLECCIONES = [
  { origen: 'solicituds', destino: 'solicitudes' },
  { origen: 'valors', destino: 'valores' },
  { origen: 'mensajebuzons', destino: 'mensajesbuzon' },
];

// Todos los modelos, para completar timestamps en cada colección
const TODOS_LOS_MODELOS = [
  Categoria, Colaborador, ConfiguracionSitio, Evento, Foto, Localidad, MensajeBuzon,
  Nosotros, PreguntaFrecuente, Producto, Servicio, Solicitud, Talla, User, Valor, Video,
];

// Paso 1: renombra las colecciones. Resultado: una línea por colección con lo que hizo.
const renombrarColecciones = async () => {
  const baseDeDatos = mongoose.connection.db;
  const nombresExistentes = (await baseDeDatos.listCollections().toArray()).map((c) => c.name);

  for (const { origen, destino } of RENOMBRES_DE_COLECCIONES) {
    const existeOrigen = nombresExistentes.includes(origen);
    const existeDestino = nombresExistentes.includes(destino);

    if (!existeOrigen) {
      informar(`${origen} -> ${destino}: ${origen} ya no existe; nada que hacer`);
      continue;
    }

    const documentosEnOrigen = await baseDeDatos.collection(origen).countDocuments();

    if (existeDestino) {
      const documentosEnDestino = await baseDeDatos.collection(destino).countDocuments();

      // Origen vacío: basta con eliminarlo, el destino ya tiene los datos
      if (documentosEnOrigen === 0) {
        informar(`${origen} -> ${destino}: ${destino} ya existe (${documentosEnDestino} doc(s)) y ${origen} está vacía; se elimina ${origen}`);
        if (!esSimulacion) await baseDeDatos.collection(origen).drop();
        continue;
      }

      // Destino vacío: lo crea el código nuevo al preparar sus índices antes de
      // correr esta migración. Se elimina y se renombra el origen en su lugar.
      if (documentosEnDestino === 0) {
        informar(`${origen} -> ${destino}: ${destino} existe vacía (la crea el código nuevo); se elimina y se renombra ${origen} (${documentosEnOrigen} doc(s))`);
        if (!esSimulacion) {
          await baseDeDatos.collection(destino).drop();
          await baseDeDatos.collection(origen).rename(destino);
        }
        continue;
      }

      // Las dos tienen datos: no se adivina, se revisa a mano
      informar(`${origen} -> ${destino}: AMBAS tienen documentos (${documentosEnOrigen} y ${documentosEnDestino}); revisar a mano, no se toca`);
      continue;
    }

    informar(`${origen} -> ${destino}: se renombra (${documentosEnOrigen} doc(s))`);
    if (!esSimulacion) await baseDeDatos.collection(origen).rename(destino);
  }
};

// Después de renombrar, las colecciones nuevas necesitan los índices que
// define su esquema (Mongoose solo los crea al arrancar). syncIndexes los
// crea si faltan y no toca los que ya existen.
const sincronizarIndicesRenombrados = async () => {
  if (esSimulacion) {
    informar('Índices de solicitudes, valores y mensajesbuzon: se sincronizarían');
    return;
  }
  for (const Modelo of [Solicitud, Valor, MensajeBuzon]) {
    await Modelo.syncIndexes();
  }
  informar('Índices de solicitudes, valores y mensajesbuzon sincronizados');
};

// Paso 2: users, name -> nombre y phone -> telefono.
// Resultado: número de usuarios con campos por renombrar.
const renombrarCamposDeUsuarios = async () => {
  const coleccion = User.collection;
  const filtroConCamposViejos = { $or: [{ name: { $exists: true } }, { phone: { $exists: true } }] };
  const usuariosPorRenombrar = await coleccion.countDocuments(filtroConCamposViejos);

  if (!esSimulacion && usuariosPorRenombrar > 0) {
    await coleccion.updateMany(filtroConCamposViejos, { $rename: { name: 'nombre', phone: 'telefono' } });
  }

  informar(`Usuarios con name/phone por renombrar a nombre/telefono: ${usuariosPorRenombrar}`);
  return usuariosPorRenombrar;
};

// Paso 3: fechaSubida -> createdAt en fotos y videos.
// Resultado: número de documentos tocados en la colección.
const migrarFechaSubida = async (Modelo, nombreLegible) => {
  const coleccion = Modelo.collection;
  const filtroSinCreatedAt = { fechaSubida: { $exists: true }, createdAt: { $exists: false } };
  const filtroConAmbos = { fechaSubida: { $exists: true }, createdAt: { $exists: true } };
  const porRenombrar = await coleccion.countDocuments(filtroSinCreatedAt);
  const porLimpiar = await coleccion.countDocuments(filtroConAmbos);

  if (!esSimulacion) {
    if (porRenombrar > 0) await coleccion.updateMany(filtroSinCreatedAt, { $rename: { fechaSubida: 'createdAt' } });
    if (porLimpiar > 0) await coleccion.updateMany(filtroConAmbos, { $unset: { fechaSubida: '' } });
  }

  informar(`${nombreLegible}: fechaSubida -> createdAt en ${porRenombrar}; fechaSubida sobrante retirada en ${porLimpiar}`);
  return porRenombrar + porLimpiar;
};

// Paso 4: completa createdAt y updatedAt donde falten. createdAt se toma de la
// fecha que lleva el propio _id (ObjectId) y updatedAt se iguala a createdAt.
// Resultado: documentos completados en la colección.
const completarTimestamps = async (Modelo) => {
  const coleccion = Modelo.collection;
  const sinCreatedAt = await coleccion.countDocuments({ createdAt: { $exists: false } });
  const sinUpdatedAt = await coleccion.countDocuments({ updatedAt: { $exists: false } });

  if (!esSimulacion) {
    if (sinCreatedAt > 0) {
      await coleccion.updateMany({ createdAt: { $exists: false } }, [{ $set: { createdAt: { $toDate: '$_id' } } }]);
    }
    if (sinUpdatedAt > 0) {
      await coleccion.updateMany({ updatedAt: { $exists: false } }, [{ $set: { updatedAt: '$createdAt' } }]);
    }
  }

  if (sinCreatedAt > 0 || sinUpdatedAt > 0) {
    informar(`${coleccion.collectionName}: sin createdAt ${sinCreatedAt}, sin updatedAt ${sinUpdatedAt} (se completan)`);
  }
  return sinCreatedAt + sinUpdatedAt;
};

ejecutarMigracion('003 Fase 3: nombres en español, colecciones fijas y timestamps', async () => {
  await renombrarColecciones();
  await sincronizarIndicesRenombrados();
  await renombrarCamposDeUsuarios();
  await migrarFechaSubida(Foto, 'Fotos');
  await migrarFechaSubida(Video, 'Videos');

  let totalCompletados = 0;
  for (const Modelo of TODOS_LOS_MODELOS) {
    totalCompletados += await completarTimestamps(Modelo);
  }
  informar(`Timestamps completados en total: ${totalCompletados}`);
});
