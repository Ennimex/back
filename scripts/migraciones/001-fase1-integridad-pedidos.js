// Migración 001 — Fase 1: integridad y pedidos.
//
// Qué hace (y nada más):
//   1. En cada solicitud, renombra en los renglones de `productos`:
//        nombre    -> nombreAlPedir
//        imagenURL -> imagenAlPedir
//      y completa `cantidad: 1` y `tallaElegida: null` donde falten.
//   2. Si la solicitud no tiene `historialEstados`, crea la primera entrada
//      con su estado actual y su fecha de creación (adminId en null).
//   3. Pone `activo: true` a los productos, categorías, localidades y tallas
//      que todavía no tienen el campo (borrado lógico).
//
// Es idempotente: solo toca documentos que necesitan el cambio, así que una
// segunda corrida reporta 0 cambios. Con --simulacion solo cuenta e informa.
const { esSimulacion, informar, ejecutarMigracion } = require('./utilidades');
const Solicitud = require('../../models/Solicitud');
const Producto = require('../../models/Producto');
const Categoria = require('../../models/Categorias');
const Localidad = require('../../models/Localidades');
const Talla = require('../../models/Tallas');

// Devuelve el renglón con los nombres nuevos y los campos faltantes
// completados, o el mismo renglón si ya estaba al día. Trabaja sobre el
// documento crudo (sin esquema) para no disparar validaciones.
const normalizarRenglon = (renglon) => {
  const renglonNormalizado = { ...renglon };
  let cambio = false;

  // Copia del nombre bajo el nombre nuevo y retiro del viejo
  if (renglon.nombre !== undefined) {
    if (renglonNormalizado.nombreAlPedir === undefined) {
      renglonNormalizado.nombreAlPedir = renglon.nombre || '';
    }
    delete renglonNormalizado.nombre;
    cambio = true;
  }

  // Copia de la imagen bajo el nombre nuevo y retiro del viejo
  if (renglon.imagenURL !== undefined) {
    if (renglonNormalizado.imagenAlPedir === undefined) {
      renglonNormalizado.imagenAlPedir = renglon.imagenURL || '';
    }
    delete renglonNormalizado.imagenURL;
    cambio = true;
  }

  // Campos nuevos con su valor por defecto
  if (renglonNormalizado.cantidad === undefined) {
    renglonNormalizado.cantidad = 1;
    cambio = true;
  }
  if (renglonNormalizado.tallaElegida === undefined) {
    renglonNormalizado.tallaElegida = null;
    cambio = true;
  }

  return { renglonNormalizado, cambio };
};

// Paso 1 y 2: recorre todas las solicitudes y actualiza las que lo necesiten.
// Resultado: número de solicitudes modificadas (o que se modificarían).
const migrarSolicitudes = async () => {
  const coleccionSolicitudes = Solicitud.collection;
  const cursor = coleccionSolicitudes.find({});
  let solicitudesModificadas = 0;

  for await (const solicitud of cursor) {
    const cambiosParaEstaSolicitud = {};

    // Renglones de productos con los nombres nuevos
    const renglonesOriginales = Array.isArray(solicitud.productos) ? solicitud.productos : [];
    let algunRenglonCambio = false;
    const renglonesNormalizados = renglonesOriginales.map((renglon) => {
      const { renglonNormalizado, cambio } = normalizarRenglon(renglon);
      if (cambio) algunRenglonCambio = true;
      return renglonNormalizado;
    });
    if (algunRenglonCambio) {
      cambiosParaEstaSolicitud.productos = renglonesNormalizados;
    }

    // Primera entrada del historial si no existe
    const historialVacio = !Array.isArray(solicitud.historialEstados) || solicitud.historialEstados.length === 0;
    if (historialVacio) {
      cambiosParaEstaSolicitud.historialEstados = [
        {
          estado: solicitud.estado || 'pendiente',
          fecha: solicitud.createdAt || new Date(),
          adminId: null,
        },
      ];
    }

    const necesitaCambios = Object.keys(cambiosParaEstaSolicitud).length > 0;
    if (!necesitaCambios) continue;

    solicitudesModificadas += 1;
    if (!esSimulacion) {
      await coleccionSolicitudes.updateOne({ _id: solicitud._id }, { $set: cambiosParaEstaSolicitud });
    }
  }

  informar(`Solicitudes con renglones o historial por actualizar: ${solicitudesModificadas}`);
  return solicitudesModificadas;
};

// Paso 3: marca como activos los documentos que aún no tienen el campo.
// Resultado: número de documentos marcados por colección.
const marcarActivos = async (Modelo, nombreLegible) => {
  const filtroSinCampo = { activo: { $exists: false } };
  const pendientes = await Modelo.countDocuments(filtroSinCampo);

  if (!esSimulacion && pendientes > 0) {
    await Modelo.updateMany(filtroSinCampo, { $set: { activo: true } });
  }

  informar(`${nombreLegible} sin campo activo: ${pendientes} (se marcan como activos)`);
  return pendientes;
};

ejecutarMigracion('001 Fase 1: integridad y pedidos', async () => {
  await migrarSolicitudes();
  await marcarActivos(Producto, 'Productos');
  await marcarActivos(Categoria, 'Categorías');
  await marcarActivos(Localidad, 'Localidades');
  await marcarActivos(Talla, 'Tallas');
});
