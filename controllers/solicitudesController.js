// Solicitudes de cotización: creación por el usuario, consulta de las propias
// y administración (listado completo y cambio de estado) por el admin.
const mongoose = require('mongoose');
const Solicitud = require('../models/Solicitud');
const Producto = require('../models/Producto');
const Talla = require('../models/Tallas');
const User = require('../models/User');
const ConfiguracionSitio = require('../models/ConfiguracionSitio');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSolicitudEmail } = require('../utils/email');
const { FILTRO_ACTIVOS } = require('../utils/filtroActivos');

const MAXIMO_RENGLONES_POR_SOLICITUD = 50;
const MAXIMO_CARACTERES_MENSAJE = 2000;

// Convierte la cantidad recibida en un entero mayor o igual a 1.
// Resultado: 1 cuando no viene o no es válida; el entero en otro caso.
const normalizarCantidad = (valorRecibido) => {
  const cantidadEntera = parseInt(valorRecibido, 10);
  if (Number.isNaN(cantidadEntera) || cantidadEntera < 1) {
    return 1;
  }
  return cantidadEntera;
};

// Valida la talla elegida para un producto. Para aceptarse debe:
//   1. tener formato de id válido,
//   2. estar en `tallasDisponibles` del producto (si el producto no maneja
//      tallas, no se acepta ninguna),
//   3. existir y estar activa.
// Resultado: el id de la talla, o null si el renglón no trae talla.
const validarTallaElegida = async (tallaRecibida, productoReal) => {
  if (!tallaRecibida) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(tallaRecibida)) {
    throw new ApiError(400, 'La talla elegida tiene un identificador inválido');
  }

  // 2) La talla debe ser una de las que ofrece el producto
  const tallasDelProducto = (productoReal.tallasDisponibles || []).map(String);
  if (tallasDelProducto.length === 0) {
    throw new ApiError(400, `${productoReal.nombre} no maneja tallas; envía el renglón sin talla`);
  }
  const tallaPerteneceAlProducto = tallasDelProducto.includes(String(tallaRecibida));
  if (!tallaPerteneceAlProducto) {
    throw new ApiError(400, `La talla elegida no está disponible para ${productoReal.nombre}`);
  }

  // 3) La talla debe existir y seguir activa
  const tallaEnBase = await Talla.findById(tallaRecibida).select('activo').lean();
  if (!tallaEnBase) {
    throw new ApiError(400, 'La talla elegida no existe');
  }
  if (tallaEnBase.activo === false) {
    throw new ApiError(400, `La talla elegida para ${productoReal.nombre} está desactivada`);
  }
  return tallaRecibida;
};

// Construye los renglones del pedido a partir de lo que mandó el cliente.
// El nombre y la imagen se copian desde la base de datos (no desde el
// cliente) para que la copia guardada sea fiel al producto real.
// Resultado: arreglo de renglones listos para guardar; lanza 400 si algún
// producto no existe o está desactivado.
const construirRenglonesDelPedido = async (productosRecibidos) => {
  const renglonesRecibidos = productosRecibidos.slice(0, MAXIMO_RENGLONES_POR_SOLICITUD);

  // 1) Reunir los ids de producto y validar su formato
  const idsDeProducto = renglonesRecibidos.map((renglon) => renglon.productoId || renglon._id);
  const idsConFormatoInvalido = idsDeProducto.filter((id) => !mongoose.Types.ObjectId.isValid(id));
  if (idsConFormatoInvalido.length > 0) {
    throw new ApiError(400, 'Hay productos con un identificador inválido');
  }

  // 2) Leer de una sola vez los productos activos que sí existen
  const productosEnBase = await Producto.find({ _id: { $in: idsDeProducto }, ...FILTRO_ACTIVOS })
    .select('nombre imagenURL tallasDisponibles')
    .lean();
  const productosPorId = new Map(productosEnBase.map((producto) => [String(producto._id), producto]));

  // 3) Armar cada renglón con la copia del producto y la talla validada
  const renglonesDelPedido = [];
  for (const renglonRecibido of renglonesRecibidos) {
    const idProducto = String(renglonRecibido.productoId || renglonRecibido._id);
    const productoReal = productosPorId.get(idProducto);
    if (!productoReal) {
      throw new ApiError(400, 'Uno de los productos ya no está disponible');
    }

    const tallaElegida = await validarTallaElegida(renglonRecibido.tallaElegida, productoReal);

    renglonesDelPedido.push({
      productoId: productoReal._id,
      tallaElegida,
      cantidad: normalizarCantidad(renglonRecibido.cantidad),
      nombreAlPedir: productoReal.nombre,
      imagenAlPedir: productoReal.imagenURL || '',
    });
  }

  return renglonesDelPedido;
};

// Avisa al negocio por correo de la nueva solicitud. No es crítico: si falla,
// la solicitud ya quedó guardada y el usuario la verá en "Mis Solicitudes".
const avisarAlNegocio = async (usuario, mensaje, renglonesDelPedido) => {
  try {
    const configuracion = await ConfiguracionSitio.findOne();
    const correoDestino = (configuracion && configuracion.email) || process.env.BREVO_FROM_EMAIL;
    if (!correoDestino) {
      return;
    }
    await sendSolicitudEmail(correoDestino, {
      nombre: usuario.name,
      email: usuario.email,
      telefono: usuario.phone,
      mensaje,
      productos: renglonesDelPedido,
    });
  } catch (error) {
    console.error('No se pudo enviar el correo de la solicitud:', error.message);
  }
};

// GET /api/solicitudes — solicitudes del usuario actual, más recientes primero
const listarMisSolicitudes = asyncHandler(async (req, res) => {
  const solicitudesDelUsuario = await Solicitud.find({ usuario: req.user.id }).sort({ createdAt: -1 });
  res.json(solicitudesDelUsuario);
});

// POST /api/solicitudes — crear una solicitud de cotización
// Body: { productos: [{ productoId, tallaElegida?, cantidad? }], mensaje? }
const crearSolicitud = asyncHandler(async (req, res) => {
  const { productos, mensaje } = req.body;

  if (!Array.isArray(productos) || productos.length === 0) {
    throw new ApiError(400, 'Debes incluir al menos un producto');
  }

  // Copia de los datos de contacto del usuario al momento de pedir
  const usuario = await User.findById(req.user.id).select('name email phone');
  if (!usuario) {
    throw new ApiError(404, 'Usuario no encontrado');
  }

  const renglonesDelPedido = await construirRenglonesDelPedido(productos);
  const mensajeRecortado = (mensaje || '').toString().slice(0, MAXIMO_CARACTERES_MENSAJE);

  // La solicitud nace "pendiente" y ese estado inicial queda en el historial
  const solicitudCreada = await Solicitud.create({
    usuario: usuario._id,
    nombre: usuario.name,
    email: usuario.email,
    telefono: usuario.phone,
    productos: renglonesDelPedido,
    mensaje: mensajeRecortado,
    estado: 'pendiente',
    historialEstados: [{ estado: 'pendiente', fecha: new Date(), adminId: null }],
  });

  await avisarAlNegocio(usuario, mensajeRecortado, renglonesDelPedido);

  res.status(201).json({
    success: true,
    message: 'Solicitud enviada correctamente',
    solicitud: solicitudCreada,
  });
});

// GET /api/admin/solicitudes — todas las solicitudes, más recientes primero.
// Los datos de contacto y de productos son copias guardadas en la propia
// solicitud, así que no hace falta poblar referencias.
const listarTodasLasSolicitudes = asyncHandler(async (req, res) => {
  const todasLasSolicitudes = await Solicitud.find({}).sort({ createdAt: -1 });
  res.json(todasLasSolicitudes);
});

// PATCH /api/admin/solicitudes/:id — cambiar el estado y registrarlo en el
// historial con el id del administrador que lo hizo.
const cambiarEstadoSolicitud = asyncHandler(async (req, res) => {
  const { estado: estadoNuevo } = req.body;
  const { id } = req.params;

  if (!Solicitud.ESTADOS.includes(estadoNuevo)) {
    throw new ApiError(400, 'Estado inválido. Usa pendiente, atendida o cerrada.');
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'ID de solicitud inválido');
  }

  const solicitudActual = await Solicitud.findById(id);
  if (!solicitudActual) {
    throw new ApiError(404, 'Solicitud no encontrada');
  }

  // Si el estado no cambia, no se escribe nada ni se ensucia el historial
  const estadoRealmenteCambia = solicitudActual.estado !== estadoNuevo;
  if (!estadoRealmenteCambia) {
    return res.json({
      success: true,
      data: solicitudActual,
      message: 'La solicitud ya estaba en ese estado',
    });
  }

  // Se actualiza con $set y $push para validar solo lo que cambia y no
  // volver a validar renglones antiguos que pudieran tener datos incompletos
  const entradaDelHistorial = { estado: estadoNuevo, fecha: new Date(), adminId: req.user.id };
  const solicitudActualizada = await Solicitud.findByIdAndUpdate(
    id,
    { $set: { estado: estadoNuevo }, $push: { historialEstados: entradaDelHistorial } },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: solicitudActualizada,
    message: 'Estado de la solicitud actualizado',
  });
});

module.exports = {
  listarMisSolicitudes,
  crearSolicitud,
  listarTodasLasSolicitudes,
  cambiarEstadoSolicitud,
};
