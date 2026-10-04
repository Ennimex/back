const mongoose = require('mongoose');

// Estados por los que pasa una solicitud. Se exporta en el modelo
// (Solicitud.ESTADOS) para que controladores y pruebas usen la misma lista.
const ESTADOS_SOLICITUD = ['pendiente', 'atendida', 'cerrada'];

// Un renglón del pedido: qué producto, en qué talla y cuántas piezas.
// Guarda además una copia del nombre y la imagen del producto tal como
// estaban al momento de pedir, para que la solicitud siga siendo legible
// aunque el producto cambie de nombre o se desactive después.
const ProductoPedidoSchema = new mongoose.Schema(
  {
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: [true, 'Cada renglón del pedido necesita un producto'],
    },
    tallaElegida: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tallas',
      default: null,
    },
    cantidad: {
      type: Number,
      min: [1, 'La cantidad mínima es 1'],
      default: 1,
    },
    // Copia del producto al momento de pedir
    nombreAlPedir: { type: String, default: '' },
    imagenAlPedir: { type: String, default: '' },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Compatibilidad temporal: el front y la app todavía leen `nombre` e
// `imagenURL` en cada renglón. Estos virtuales devuelven la copia guardada
// bajo los nombres viejos sin duplicar datos en la base.
ProductoPedidoSchema.virtual('nombre').get(function () {
  return this.nombreAlPedir;
});
ProductoPedidoSchema.virtual('imagenURL').get(function () {
  return this.imagenAlPedir;
});

// Registro de cada cambio de estado: a qué estado pasó, cuándo y qué
// administrador lo hizo (adminId queda en null cuando lo generó el sistema,
// por ejemplo el estado "pendiente" inicial al crear la solicitud).
const CambioEstadoSchema = new mongoose.Schema(
  {
    estado: { type: String, enum: ESTADOS_SOLICITUD, required: true },
    fecha: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

// Solicitud de cotización que un usuario registrado envía sobre uno o varios
// productos. No hay precios: es la lista de productos más un mensaje libre.
const SolicitudSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // se consulta por usuario en "Mis Solicitudes"
    },
    // Copia de los datos de contacto del usuario al momento de solicitar
    nombre: String,
    email: String,
    telefono: String,
    // Renglones del pedido (al menos uno)
    productos: {
      type: [ProductoPedidoSchema],
      validate: {
        validator: (renglones) => Array.isArray(renglones) && renglones.length > 0,
        message: 'Debes incluir al menos un producto',
      },
    },
    mensaje: { type: String, default: '' },
    estado: {
      type: String,
      enum: ESTADOS_SOLICITUD,
      default: 'pendiente',
      index: true, // el panel filtra y cuenta por estado
    },
    // Bitácora de cambios de estado, del más antiguo al más reciente
    historialEstados: { type: [CambioEstadoSchema], default: [] },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const Solicitud = mongoose.model('Solicitud', SolicitudSchema);
Solicitud.ESTADOS = ESTADOS_SOLICITUD;

module.exports = Solicitud;
