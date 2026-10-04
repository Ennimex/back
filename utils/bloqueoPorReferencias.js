// Antes de desactivar una categoría, localidad o talla se revisa si hay
// productos activos que la referencien. Si los hay, no se desactiva: el
// admin debe desactivar esos productos o reasignarlos primero. Así el sitio
// nunca muestra un producto cuya categoría, localidad o talla ya no existe.
const Producto = require('../models/Producto');
const { FILTRO_ACTIVOS } = require('./filtroActivos');

// Cuántos productos se listan en la respuesta de conflicto (el total sí se informa completo)
const MAXIMO_PRODUCTOS_EN_LA_RESPUESTA = 5;

// Busca productos activos que cumplan el filtro de referencia recibido,
// por ejemplo { categoriaId: id } o { tallasDisponibles: id }.
// Resultado: { total, muestra } donde `muestra` son hasta 5 { _id, nombre }.
const buscarProductosActivosQueReferencian = async (filtroDeReferencia) => {
  const filtroCompleto = { ...filtroDeReferencia, ...FILTRO_ACTIVOS };

  const total = await Producto.countDocuments(filtroCompleto);
  if (total === 0) {
    return { total: 0, muestra: [] };
  }

  const productosEncontrados = await Producto.find(filtroCompleto)
    .select('nombre')
    .limit(MAXIMO_PRODUCTOS_EN_LA_RESPUESTA)
    .lean();
  const muestra = productosEncontrados.map((producto) => ({ _id: producto._id, nombre: producto.nombre }));

  return { total, muestra };
};

// Responde 409 (conflicto) explicando por qué no se puede desactivar y qué
// productos lo impiden. `nombreDelRecurso` es "categoría", "localidad" o "talla".
const responderConflictoPorProductos = (res, nombreDelRecurso, { total, muestra }) => {
  const mensaje =
    `No se puede desactivar: ${total} producto(s) activo(s) usan esta ${nombreDelRecurso}. ` +
    'Desactívalos o reasígnalos primero.';

  return res.status(409).json({
    success: false,
    error: mensaje,
    message: mensaje,
    productosActivos: total,
    productos: muestra,
  });
};

module.exports = { buscarProductosActivosQueReferencian, responderConflictoPorProductos };
