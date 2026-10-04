// Funciones compartidas para manejar archivos en Cloudinary. Todos los
// controladores que suben o borran imágenes pasan por aquí, así la regla
// "subir, guardar url + publicId, borrar por publicId" vive en un solo lugar.
const cloudinary = require('../config/cloudinaryConfig');
const multer = require('multer');
const streamifier = require('streamifier');

const MEGABYTE = 1024 * 1024;

// Multer en memoria que solo acepta imágenes. No escribe en disco (compatible
// con Render/Vercel). Resultado: instancia lista para upload.single('imagen').
const multerDeImagenes = (limiteEnMB = 10) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limiteEnMB * MEGABYTE },
    fileFilter: (req, archivo, continuar) => {
      if (archivo.mimetype.startsWith('image/')) {
        continuar(null, true);
      } else {
        continuar(new Error('Solo se permiten imágenes'));
      }
    },
  });

// Sube un buffer a la carpeta indicada de Cloudinary.
// Resultado: { url, publicId } listo para guardar en un campo esquemaImagen.
const subirImagen = (buffer, carpeta) =>
  new Promise((resolve, reject) => {
    const flujoDeSubida = cloudinary.uploader.upload_stream({ folder: carpeta }, (error, resultado) => {
      if (error) return reject(error);
      resolve({ url: resultado.secure_url, publicId: resultado.public_id });
    });
    streamifier.createReadStream(buffer).pipe(flujoDeSubida);
  });

// Obtiene el public_id a partir de una URL de Cloudinary. Sirve para los
// documentos antiguos que solo guardaron la URL. Ejemplos:
//   .../image/upload/v1700000/galeria/fotos/abc.jpg          -> galeria/fotos/abc
//   .../video/upload/c_scale,w_480/so_0/galeria/videos/abc.jpg -> galeria/videos/abc
// Resultado: el public_id, o '' si la URL no es de Cloudinary.
const extraerPublicIdDeUrl = (url) => {
  if (typeof url !== 'string' || !url.includes('/upload/')) {
    return '';
  }

  // Lo que sigue a /upload/ es: [transformaciones/] [vVERSION/] carpeta/archivo.ext
  const rutaDespuesDeUpload = url.split('/upload/')[1].split('?')[0];
  const segmentos = rutaDespuesDeUpload.split('/');

  // Se descartan la versión (v123456) y las transformaciones (c_scale,w_480 o so_0),
  // que van antes de la carpeta y no forman parte del public_id
  const esVersion = (segmento) => /^v\d+$/.test(segmento);
  const esTransformacion = (segmento) => segmento.includes(',') || /^[a-z]{1,3}_[^/]*$/.test(segmento);
  while (segmentos.length > 1 && (esVersion(segmentos[0]) || esTransformacion(segmentos[0]))) {
    segmentos.shift();
  }

  const rutaSinPrefijos = segmentos.join('/');
  const rutaSinExtension = rutaSinPrefijos.replace(/\.[a-zA-Z0-9]+$/, '');
  return rutaSinExtension;
};

// Devuelve el public_id de una imagen guardada: el que tiene el documento o,
// para documentos antiguos que no lo guardaron, el que se deduce de la URL.
// Resultado: public_id o '' si no hay imagen.
const publicIdDeImagen = (imagen) => {
  if (!imagen) {
    return '';
  }
  return imagen.publicId || extraerPublicIdDeUrl(imagen.url);
};

// Borra un archivo de Cloudinary por su public_id. Si no hay public_id no
// hace nada. Si Cloudinary falla solo se registra: el documento de la base
// ya se actualizó y no conviene dejar la operación a medias por un archivo.
// Resultado: true si se pidió el borrado, false si no había nada que borrar.
const eliminarArchivo = async (publicId, tipoDeRecurso = 'image') => {
  if (!publicId) {
    return false;
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: tipoDeRecurso });
    return true;
  } catch (error) {
    console.warn(`No se pudo borrar ${publicId} de Cloudinary:`, error.message);
    return false;
  }
};

// Atajo para imágenes (el tipo de recurso por defecto en Cloudinary)
const eliminarImagen = (publicId) => eliminarArchivo(publicId, 'image');

module.exports = {
  multerDeImagenes,
  subirImagen,
  extraerPublicIdDeUrl,
  publicIdDeImagen,
  eliminarArchivo,
  eliminarImagen,
};
