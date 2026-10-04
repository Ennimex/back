const { execFileSync } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const Foto = require("../models/Fotos");
const Categoria = require("../models/Categorias");
const Solicitud = require("../models/Solicitud");
const Valor = require("../models/Valor");
const MensajeBuzon = require("../models/MensajeBuzon");

const rutaDelScript = path.resolve(__dirname, "..", "scripts", "migraciones", "003-fase3-nombres-y-timestamps.js");

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

// Colecciones con nombre viejo que el setup de pruebas no limpia solo (no son de ningún modelo)
const COLECCIONES_VIEJAS = ["solicituds", "valors", "mensajebuzons"];
const baseDeDatos = () => mongoose.connection.db;

const borrarColeccionesViejas = async () => {
  const existentes = (await baseDeDatos().listCollections().toArray()).map((c) => c.name);
  for (const nombre of COLECCIONES_VIEJAS) {
    if (existentes.includes(nombre)) await baseDeDatos().collection(nombre).drop();
  }
};

afterEach(borrarColeccionesViejas);

// Reproduce el estado real antes de la fase 3: colecciones pluralizadas en
// inglés, `valores` ya existente con datos y `valors` vacía, usuarios con
// name/phone, fotos con fechaSubida y documentos sin timestamps.
const sembrarDatosAntiguos = async () => {
  await baseDeDatos().collection("solicituds").insertOne({ usuario: new mongoose.Types.ObjectId(), estado: "pendiente", productos: [] });
  await baseDeDatos().createCollection("valors");
  await Valor.collection.insertOne({ icon: "star", titulo: "Tradición" });
  await baseDeDatos().collection("mensajebuzons").insertOne({ tipo: "queja", mensaje: "Hola" });

  await User.collection.insertOne({
    name: "Ana Pérez",
    phone: "7711111111",
    email: "ana@pruebas.com",
    password: "hash",
    role: "user",
    createdAt: new Date("2026-02-01T00:00:00Z"),
  });

  await Foto.collection.insertOne({ titulo: "Vieja", imagen: { url: "", publicId: "" }, fechaSubida: new Date("2026-03-05T12:00:00Z") });
  await Foto.collection.insertOne({ titulo: "Con ambas", imagen: { url: "", publicId: "" }, fechaSubida: new Date("2026-03-06T12:00:00Z"), createdAt: new Date("2026-03-07T12:00:00Z") });

  await Categoria.collection.insertOne({ nombre: "Blusas", activo: true });
};

describe("migración 003 (fase 3: nombres, colecciones fijas y timestamps)", () => {
  it("con --simulacion informa qué cambiaría sin escribir nada", async () => {
    await sembrarDatosAntiguos();

    const salida = correrMigracion(["--simulacion"]);
    expect(salida).toMatch(/\[simulación\]/);
    // Las colecciones destino ya existen vacías (Mongoose las crea al preparar
    // índices del código nuevo), que es el mismo escenario que tendrá producción
    expect(salida).toMatch(/solicituds -> solicitudes: .*se renombra solicituds \(1 doc/);
    expect(salida).toMatch(/valors -> valores: valores ya existe \(1 doc\(s\)\) y valors está vacía; se elimina valors/);
    expect(salida).toMatch(/mensajebuzons -> mensajesbuzon: .*se renombra mensajebuzons \(1 doc/);
    expect(salida).toMatch(/Usuarios con name\/phone por renombrar a nombre\/telefono: 1/);
    expect(salida).toMatch(/Fotos: fechaSubida -> createdAt en 1; fechaSubida sobrante retirada en 1/);

    // Nada se movió: el origen conserva su documento y el destino sigue vacío
    expect(await baseDeDatos().collection("solicituds").countDocuments()).toBe(1);
    expect(await Solicitud.countDocuments()).toBe(0);
    const usuario = await User.collection.findOne({});
    expect(usuario.name).toBe("Ana Pérez");
    expect(usuario.nombre).toBeUndefined();
  });

  it("renombra colecciones y campos, completa timestamps, y la segunda corrida no cambia nada", async () => {
    await sembrarDatosAntiguos();

    correrMigracion();

    // Colecciones con nombre fijo; la vacía `valors` desaparece y `valores` conserva sus datos
    const existentes = (await baseDeDatos().listCollections().toArray()).map((c) => c.name);
    expect(existentes).toContain("solicitudes");
    expect(existentes).not.toContain("solicituds");
    expect(existentes).toContain("mensajesbuzon");
    expect(existentes).not.toContain("mensajebuzons");
    expect(existentes).not.toContain("valors");
    expect(await Solicitud.countDocuments()).toBe(1);
    expect(await MensajeBuzon.countDocuments()).toBe(1);
    expect(await Valor.countDocuments()).toBe(1);

    // La colección renombrada recibe los índices que define el esquema
    const indicesDeSolicitudes = await Solicitud.collection.indexes();
    expect(indicesDeSolicitudes.map((i) => i.name)).toEqual(expect.arrayContaining(["usuario_1", "estado_1"]));

    // Usuario con los campos en español y sin los viejos; createdAt conservado
    const usuario = await User.collection.findOne({});
    expect(usuario.nombre).toBe("Ana Pérez");
    expect(usuario.telefono).toBe("7711111111");
    expect(usuario.name).toBeUndefined();
    expect(usuario.phone).toBeUndefined();
    expect(usuario.createdAt).toEqual(new Date("2026-02-01T00:00:00Z"));
    expect(usuario.updatedAt).toEqual(new Date("2026-02-01T00:00:00Z"));

    // Fotos: fechaSubida pasa a createdAt; si ya había createdAt, se respeta
    const fotoVieja = await Foto.collection.findOne({ titulo: "Vieja" });
    expect(fotoVieja.createdAt).toEqual(new Date("2026-03-05T12:00:00Z"));
    expect(fotoVieja.fechaSubida).toBeUndefined();
    const fotoConAmbas = await Foto.collection.findOne({ titulo: "Con ambas" });
    expect(fotoConAmbas.createdAt).toEqual(new Date("2026-03-07T12:00:00Z"));
    expect(fotoConAmbas.fechaSubida).toBeUndefined();

    // Documento sin timestamps: createdAt sale de la fecha del _id y updatedAt la copia
    const categoria = await Categoria.collection.findOne({});
    expect(categoria.createdAt).toEqual(categoria._id.getTimestamp());
    expect(categoria.updatedAt).toEqual(categoria.createdAt);

    // Idempotencia
    const segundaSalida = correrMigracion();
    expect(segundaSalida).toMatch(/solicituds -> solicitudes: solicituds ya no existe/);
    expect(segundaSalida).toMatch(/Usuarios con name\/phone por renombrar a nombre\/telefono: 0/);
    expect(segundaSalida).toMatch(/Fotos: fechaSubida -> createdAt en 0; fechaSubida sobrante retirada en 0/);
    expect(segundaSalida).toMatch(/Timestamps completados en total: 0/);
  });
});
