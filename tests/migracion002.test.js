const { execFileSync } = require("child_process");
const path = require("path");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../index");
const Categoria = require("../models/Categorias");
const Producto = require("../models/Producto");
const Servicio = require("../models/Servicio");
const Foto = require("../models/Fotos");
const Colaborador = require("../models/Colaboradores");
const Video = require("../models/Video");

const rutaDelScript = path.resolve(__dirname, "..", "scripts", "migraciones", "002-fase2-imagenes-cloudinary.js");

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

const CLOUD = "https://res.cloudinary.com/demo";

// Inserta documentos con la forma antigua (URL en texto) directo en las
// colecciones, sin pasar por los esquemas nuevos
const sembrarDatosAntiguos = async () => {
  await Categoria.collection.insertOne({ nombre: "Blusas", imagenURL: `${CLOUD}/image/upload/v1/categorias/blusas.jpg` });
  await Producto.collection.insertOne({
    nombre: "Blusa",
    localidadId: new mongoose.Types.ObjectId(),
    imagenURL: `${CLOUD}/image/upload/v2/productos/blusa.png`,
  });
  await Producto.collection.insertOne({ nombre: "Sin foto", localidadId: new mongoose.Types.ObjectId(), imagenURL: "" });
  await Servicio.collection.insertOne({ nombre: "bordado", titulo: "Bordado", imagen: `${CLOUD}/image/upload/v3/servicios/bordado.jpg` });
  await Servicio.collection.insertOne({ nombre: "talleres", titulo: "Talleres" });
  await Foto.collection.insertOne({ titulo: "Foto", url: `${CLOUD}/image/upload/v1791076698/galeria/fotos/vbm887yxywbkwj8owooe.jpg` });
  await Colaborador.collection.insertOne({
    nombre: "Ana",
    imagen: `${CLOUD}/image/upload/v4/colaboradores/ana.jpg`,
    imagenPublicId: "colaboradores/ana-guardado",
  });
  await Video.collection.insertOne({
    titulo: "Festival",
    url: `${CLOUD}/video/upload/v5/galeria/videos/fest.mp4`,
    miniatura: `${CLOUD}/video/upload/c_scale,w_480/so_0/galeria/videos/fest.jpg`,
    miniaturaPublicId: "fest",
  });
};

describe("migración 002 (fase 2: imágenes como { url, publicId })", () => {
  it("con --simulacion informa qué cambiaría sin escribir nada", async () => {
    await sembrarDatosAntiguos();

    const salida = correrMigracion(["--simulacion"]);
    expect(salida).toMatch(/\[simulación\]/);
    expect(salida).toMatch(/Categorías: 1 documento/);
    expect(salida).toMatch(/Productos: 2 documento/);
    expect(salida).toMatch(/Servicios: 1 documento/);
    expect(salida).toMatch(/Fotos: 1 documento/);
    expect(salida).toMatch(/Colaboradores: 1 documento/);
    expect(salida).toMatch(/Videos sin publicId del archivo: 1/);
    expect(salida).toMatch(/Videos \(miniatura\): 1 documento/);

    const categoria = await Categoria.collection.findOne({});
    expect(typeof categoria.imagenURL).toBe("string");
    expect(categoria.imagen).toBeUndefined();
  });

  it("convierte cada campo, deduce el publicId de la URL y la segunda corrida no cambia nada", async () => {
    await sembrarDatosAntiguos();

    correrMigracion();

    // Categoría y producto: imagenURL -> imagen { url, publicId }
    const categoria = await Categoria.collection.findOne({});
    expect(categoria.imagen).toEqual({ url: `${CLOUD}/image/upload/v1/categorias/blusas.jpg`, publicId: "categorias/blusas" });
    expect(categoria.imagenURL).toBeUndefined();

    const producto = await Producto.collection.findOne({ nombre: "Blusa" });
    expect(producto.imagen).toEqual({ url: `${CLOUD}/image/upload/v2/productos/blusa.png`, publicId: "productos/blusa" });
    const productoSinFoto = await Producto.collection.findOne({ nombre: "Sin foto" });
    expect(productoSinFoto.imagen).toEqual({ url: "", publicId: "" });
    expect(productoSinFoto.imagenURL).toBeUndefined();

    // Servicio: el mismo campo cambia de texto a objeto; el que no tenía imagen no se toca
    const servicio = await Servicio.collection.findOne({ nombre: "bordado" });
    expect(servicio.imagen).toEqual({ url: `${CLOUD}/image/upload/v3/servicios/bordado.jpg`, publicId: "servicios/bordado" });
    const servicioSinImagen = await Servicio.collection.findOne({ nombre: "talleres" });
    expect(servicioSinImagen.imagen).toBeUndefined();

    // Foto: url -> imagen
    const foto = await Foto.collection.findOne({});
    expect(foto.imagen.publicId).toBe("galeria/fotos/vbm887yxywbkwj8owooe");
    expect(foto.url).toBeUndefined();

    // Colaborador: conserva el publicId que ya tenía guardado
    const colaborador = await Colaborador.collection.findOne({});
    expect(colaborador.imagen).toEqual({ url: `${CLOUD}/image/upload/v4/colaboradores/ana.jpg`, publicId: "colaboradores/ana-guardado" });
    expect(colaborador.imagenPublicId).toBeUndefined();

    // Video: publicId del archivo deducido de la URL; la miniatura lo comparte
    const video = await Video.collection.findOne({});
    expect(video.publicId).toBe("galeria/videos/fest");
    expect(video.miniatura).toEqual({ url: `${CLOUD}/video/upload/c_scale,w_480/so_0/galeria/videos/fest.jpg`, publicId: "galeria/videos/fest" });
    expect(video.miniaturaPublicId).toBeUndefined();

    // Los endpoints siguen entregando los campos viejos como virtuales
    const resCategorias = await request(app).get("/api/categorias");
    expect(resCategorias.body[0].imagenURL).toBe(`${CLOUD}/image/upload/v1/categorias/blusas.jpg`);
    const resFotos = await request(app).get("/api/fotos");
    expect(resFotos.body[0].url).toBe(`${CLOUD}/image/upload/v1791076698/galeria/fotos/vbm887yxywbkwj8owooe.jpg`);
    const resVideos = await request(app).get("/api/videos");
    expect(resVideos.body[0].miniaturaURL).toContain("/galeria/videos/fest.jpg");

    // Idempotencia
    const segundaSalida = correrMigracion();
    expect(segundaSalida).toMatch(/Categorías: 0 documento/);
    expect(segundaSalida).toMatch(/Productos: 0 documento/);
    expect(segundaSalida).toMatch(/Servicios: 0 documento/);
    expect(segundaSalida).toMatch(/Fotos: 0 documento/);
    expect(segundaSalida).toMatch(/Colaboradores: 0 documento/);
    expect(segundaSalida).toMatch(/Videos sin publicId del archivo: 0/);
    expect(segundaSalida).toMatch(/Videos \(miniatura\): 0 documento/);
  });
});
