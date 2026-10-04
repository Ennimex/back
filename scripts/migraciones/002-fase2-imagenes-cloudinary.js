// Migración 002 — Fase 2: imágenes de Cloudinary como { url, publicId }.
//
// Qué hace (y nada más):
//   1. Convierte el campo de imagen de cada colección al subesquema
//      { url, publicId }:
//        categorias    imagenURL (texto)               -> imagen
//        productos     imagenURL (texto)               -> imagen
//        servicios     imagen (texto)                  -> imagen
//        fotos         url (texto)                     -> imagen
//        colaboradores imagen (texto) + imagenPublicId -> imagen
//        videos        miniatura (texto) + miniaturaPublicId -> miniatura
//   2. Para documentos sin publicId, lo deduce de la URL de Cloudinary.
//   3. En videos, completa `publicId` del archivo si faltaba. La miniatura
//      puede ser una transformación del propio video (entonces comparte su
//      publicId y no hay archivo aparte) o una imagen subida por separado
//      (entonces conserva su propio publicId para poder borrarla después).
//
// Es idempotente: solo toca documentos con la forma vieja o sin publicId.
// Con --simulacion solo cuenta e informa, sin escribir.
const { esSimulacion, informar, ejecutarMigracion } = require('./utilidades');
const { extraerPublicIdDeUrl } = require('../../utils/imagenesCloudinary');
const Categoria = require('../../models/Categorias');
const Producto = require('../../models/Producto');
const Servicio = require('../../models/Servicio');
const Foto = require('../../models/Fotos');
const Colaborador = require('../../models/Colaboradores');
const Video = require('../../models/Video');

// Calcula qué cambios necesita un documento para que su campo de imagen
// quede como { url, publicId }. Trabaja sobre el documento crudo.
// Resultado: { set, unset } con los operadores a aplicar, o null si no hay cambios.
const calcularCambiosDeImagen = (documento, opciones) => {
  const { campoViejo, campoNuevo, campoViejoPublicId, resolverPublicId } = opciones;
  const valorViejo = documento[campoViejo];
  const valorNuevo = documento[campoNuevo];
  const set = {};
  const unset = {};

  // Cómo se obtiene el publicId de una URL: con la regla propia de la
  // colección (si la tiene), o bien el que el documento ya guardaba y, si no,
  // el que se deduce de la URL de Cloudinary.
  const obtenerPublicId = (url) => {
    if (resolverPublicId) {
      return resolverPublicId(documento, url) || '';
    }
    const publicIdGuardado = campoViejoPublicId ? documento[campoViejoPublicId] || '' : '';
    return publicIdGuardado || extraerPublicIdDeUrl(url);
  };

  // Caso A: todavía tiene la forma vieja (la URL como texto)
  const tieneFormaVieja = typeof valorViejo === 'string';
  if (tieneFormaVieja) {
    const url = valorViejo;
    set[campoNuevo] = { url: url || '', publicId: url ? obtenerPublicId(url) : '' };

    if (campoViejo !== campoNuevo) unset[campoViejo] = '';
    if (campoViejoPublicId) unset[campoViejoPublicId] = '';
    return { set, unset };
  }

  // Caso B: ya es objeto pero sin publicId y la URL permite deducirlo
  const esObjetoSinPublicId = valorNuevo && typeof valorNuevo === 'object' && valorNuevo.url && !valorNuevo.publicId;
  if (esObjetoSinPublicId) {
    const publicIdDeducido = obtenerPublicId(valorNuevo.url);
    if (publicIdDeducido) {
      set[`${campoNuevo}.publicId`] = publicIdDeducido;
      return { set, unset };
    }
  }

  return null;
};

// Regla para la miniatura de un video. Si la URL es una transformación del
// propio video (su public_id coincide con el del video), comparte el publicId
// del video y no existe un archivo aparte. Si apunta a otro archivo (una
// imagen subida por separado), conserva su propio publicId para poder
// borrarla después. El `miniaturaPublicId` viejo solo guardaba el nombre del
// archivo sin carpeta, así que se usa únicamente como último recurso.
const publicIdDeMiniaturaDeVideo = (video, urlDeMiniatura) => {
  const publicIdDelVideo = video.publicId || extraerPublicIdDeUrl(video.url);
  const publicIdSegunLaUrl = extraerPublicIdDeUrl(urlDeMiniatura);
  const esTransformacionDelVideo = publicIdSegunLaUrl === publicIdDelVideo;
  if (esTransformacionDelVideo) {
    return publicIdDelVideo;
  }
  return publicIdSegunLaUrl || video.miniaturaPublicId || '';
};

// Recorre una colección y aplica los cambios de imagen a cada documento.
// Resultado: número de documentos modificados (o que se modificarían).
const migrarImagenesDe = async (Modelo, nombreLegible, opciones) => {
  const coleccion = Modelo.collection;
  const cursor = coleccion.find({});
  let documentosModificados = 0;

  for await (const documento of cursor) {
    const cambios = calcularCambiosDeImagen(documento, opciones);
    if (!cambios) continue;

    documentosModificados += 1;
    if (!esSimulacion) {
      const operacion = { $set: cambios.set };
      if (Object.keys(cambios.unset).length > 0) operacion.$unset = cambios.unset;
      await coleccion.updateOne({ _id: documento._id }, operacion);
    }
  }

  informar(`${nombreLegible}: ${documentosModificados} documento(s) con imagen por migrar`);
  return documentosModificados;
};

// Videos: el archivo de video también debe tener su publicId; si falta, se
// deduce de la URL. Resultado: número de videos completados.
const completarPublicIdDeVideos = async () => {
  const coleccion = Video.collection;
  const cursor = coleccion.find({ $or: [{ publicId: { $exists: false } }, { publicId: '' }, { publicId: null }] });
  let videosCompletados = 0;

  for await (const video of cursor) {
    const publicIdDeducido = extraerPublicIdDeUrl(video.url);
    if (!publicIdDeducido) continue;

    videosCompletados += 1;
    if (!esSimulacion) {
      await coleccion.updateOne({ _id: video._id }, { $set: { publicId: publicIdDeducido } });
    }
  }

  informar(`Videos sin publicId del archivo: ${videosCompletados} (se deduce de la URL)`);
  return videosCompletados;
};

ejecutarMigracion('002 Fase 2: imágenes de Cloudinary como { url, publicId }', async () => {
  await migrarImagenesDe(Categoria, 'Categorías', { campoViejo: 'imagenURL', campoNuevo: 'imagen' });
  await migrarImagenesDe(Producto, 'Productos', { campoViejo: 'imagenURL', campoNuevo: 'imagen' });
  await migrarImagenesDe(Servicio, 'Servicios', { campoViejo: 'imagen', campoNuevo: 'imagen' });
  await migrarImagenesDe(Foto, 'Fotos', { campoViejo: 'url', campoNuevo: 'imagen' });
  await migrarImagenesDe(Colaborador, 'Colaboradores', {
    campoViejo: 'imagen',
    campoNuevo: 'imagen',
    campoViejoPublicId: 'imagenPublicId',
  });
  await completarPublicIdDeVideos();
  await migrarImagenesDe(Video, 'Videos (miniatura)', {
    campoViejo: 'miniatura',
    campoNuevo: 'miniatura',
    // El campo viejo se retira: el publicId queda dentro de `miniatura`
    campoViejoPublicId: 'miniaturaPublicId',
    resolverPublicId: publicIdDeMiniaturaDeVideo,
  });
});
