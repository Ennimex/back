const { execFileSync } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const Solicitud = require("../models/Solicitud");
const Producto = require("../models/Producto");
const Categoria = require("../models/Categorias");
const Localidad = require("../models/Localidades");
const Talla = require("../models/Tallas");

const rutaDelScript = path.resolve(__dirname, "..", "scripts", "migraciones", "001-fase1-integridad-pedidos.js");

// Ejecuta el script de migración como proceso aparte, apuntándolo a la base
// en memoria de las pruebas (nunca a la base real). Devuelve lo que imprimió.
const correrMigracion = (argumentos = []) => {
  const { host, port, name } = mongoose.connection;
  const uriDeLaBaseEnMemoria = `mongodb://${host}:${port}/${name}`;
  return execFileSync(process.execPath, [rutaDelScript, ...argumentos], {
    env: { ...process.env, MONGODB_URI: uriDeLaBaseEnMemoria, NODE_ENV: "test" },
    encoding: "utf8",
  });
};

// Inserta documentos con la forma antigua directo en las colecciones,
// sin pasar por los esquemas (así quedaron los datos antes de la fase 1)
const sembrarDatosAntiguos = async () => {
  const localidadInsertada = await Localidad.collection.insertOne({ nombre: "Huejutla" });
  await Producto.collection.insertOne({ nombre: "Blusa", localidadId: localidadInsertada.insertedId });
  await Categoria.collection.insertOne({ nombre: "Blusas" });
  await Talla.collection.insertOne({ categoriaId: new mongoose.Types.ObjectId(), genero: "mujer", talla: "M" });

  await Solicitud.collection.insertOne({
    usuario: new mongoose.Types.ObjectId(),
    nombre: "Cliente",
    estado: "atendida",
    createdAt: new Date("2026-01-15T10:00:00Z"),
    productos: [
      { productoId: new mongoose.Types.ObjectId(), nombre: "Blusa vieja", imagenURL: "https://img/vieja.jpg" },
    ],
  });
};

describe("migración 001 (fase 1: integridad y pedidos)", () => {
  it("con --simulacion informa qué cambiaría sin escribir nada", async () => {
    await sembrarDatosAntiguos();

    const salida = correrMigracion(["--simulacion"]);
    expect(salida).toMatch(/\[simulación\]/);
    expect(salida).toMatch(/Solicitudes con renglones o historial por actualizar: 1/);
    expect(salida).toMatch(/Productos sin campo activo: 1/);

    const solicitud = await Solicitud.collection.findOne({});
    expect(solicitud.productos[0].nombre).toBe("Blusa vieja");
    expect(solicitud.historialEstados).toBeUndefined();
    const producto = await Producto.collection.findOne({});
    expect(producto.activo).toBeUndefined();
  });

  it("migra renglones, historial y activo; la segunda corrida no cambia nada", async () => {
    await sembrarDatosAntiguos();

    const primeraSalida = correrMigracion();
    expect(primeraSalida).toMatch(/Solicitudes con renglones o historial por actualizar: 1/);

    // Renglones con los nombres nuevos y sin los viejos
    const solicitud = await Solicitud.collection.findOne({});
    const renglon = solicitud.productos[0];
    expect(renglon.nombreAlPedir).toBe("Blusa vieja");
    expect(renglon.imagenAlPedir).toBe("https://img/vieja.jpg");
    expect(renglon.nombre).toBeUndefined();
    expect(renglon.imagenURL).toBeUndefined();
    expect(renglon.cantidad).toBe(1);
    expect(renglon.tallaElegida).toBeNull();

    // Historial inicial a partir del estado y la fecha que ya tenía
    expect(solicitud.historialEstados).toHaveLength(1);
    expect(solicitud.historialEstados[0].estado).toBe("atendida");
    expect(solicitud.historialEstados[0].adminId).toBeNull();
    expect(new Date(solicitud.historialEstados[0].fecha)).toEqual(new Date("2026-01-15T10:00:00Z"));

    // Catálogo marcado como activo
    for (const Modelo of [Producto, Categoria, Localidad, Talla]) {
      const documento = await Modelo.collection.findOne({});
      expect(documento.activo).toBe(true);
    }

    // Idempotencia: la segunda corrida reporta cero cambios
    const segundaSalida = correrMigracion();
    expect(segundaSalida).toMatch(/Solicitudes con renglones o historial por actualizar: 0/);
    expect(segundaSalida).toMatch(/Productos sin campo activo: 0/);
    expect(segundaSalida).toMatch(/Tallas sin campo activo: 0/);
  });
});
