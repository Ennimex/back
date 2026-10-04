const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const Localidad = require("../models/Localidades");
const Categoria = require("../models/Categorias");
const Talla = require("../models/Tallas");
const Producto = require("../models/Producto");

// Crea un usuario con el rol indicado y devuelve el usuario y su token
const crearUsuarioConToken = async (rol, correo) => {
  const usuario = await User.create({
    name: `Usuario ${rol}`,
    email: correo,
    phone: "7710000000",
    password: "contrasena-segura",
    role: rol,
  });
  return { usuario, token: usuario.getSignedJwtToken() };
};

// Crea localidad, categoría, una talla y un producto que usa las tres
const crearCatalogoBasico = async () => {
  const localidad = await Localidad.create({ nombre: "Huejutla" });
  const categoria = await Categoria.create({ nombre: "Blusas" });
  const talla = await Talla.create({ categoriaId: categoria._id, genero: "mujer", talla: "M" });
  const producto = await Producto.create({
    nombre: "Blusa bordada",
    localidadId: localidad._id,
    categoriaId: categoria._id,
    tallasDisponibles: [talla._id],
  });
  return { localidad, categoria, talla, producto };
};

describe("borrado lógico del catálogo", () => {
  it("DELETE producto lo desactiva: sale del público, sigue en /todos y se reactiva", async () => {
    const { producto } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("admin", "admin@pruebas.com");
    const autorizacion = ["Authorization", `Bearer ${token}`];

    const resBorrado = await request(app).delete(`/api/productos/${producto._id}`).set(...autorizacion);
    expect(resBorrado.status).toBe(200);
    expect(resBorrado.body.producto.activo).toBe(false);

    // El producto sigue existiendo en la base, solo desactivado
    const enBase = await Producto.findById(producto._id);
    expect(enBase).not.toBeNull();
    expect(enBase.activo).toBe(false);

    // Listados públicos: no aparece; detalle público: 404
    const resPublico = await request(app).get("/api/productos");
    expect(resPublico.body).toHaveLength(0);
    const resPublicoContenido = await request(app).get("/api/public/productos");
    expect(resPublicoContenido.body).toHaveLength(0);
    const resDetalle = await request(app).get(`/api/public/productos/${producto._id}`);
    expect(resDetalle.status).toBe(404);

    // Listado admin: aparece marcado como inactivo
    const resTodos = await request(app).get("/api/productos/todos").set(...autorizacion);
    expect(resTodos.status).toBe(200);
    expect(resTodos.body).toHaveLength(1);
    expect(resTodos.body[0].activo).toBe(false);

    // Reactivar lo devuelve al sitio
    const resReactivar = await request(app).patch(`/api/productos/${producto._id}/reactivar`).set(...autorizacion);
    expect(resReactivar.status).toBe(200);
    const resPublicoDespues = await request(app).get("/api/productos");
    expect(resPublicoDespues.body).toHaveLength(1);
  });

  it("/todos y /reactivar exigen admin", async () => {
    const { token: tokenUsuario } = await crearUsuarioConToken("user", "cliente@pruebas.com");
    const resSinToken = await request(app).get("/api/productos/todos");
    expect(resSinToken.status).toBe(401);
    const resUsuario = await request(app).get("/api/productos/todos").set("Authorization", `Bearer ${tokenUsuario}`);
    expect(resUsuario.status).toBe(403);
  });

  it("no desactiva categoría, localidad ni talla mientras un producto activo las use (409 con conteo y lista)", async () => {
    const { localidad, categoria, talla, producto } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("admin", "admin@pruebas.com");
    const autorizacion = ["Authorization", `Bearer ${token}`];

    const resCategoria = await request(app).delete(`/api/categorias/${categoria._id}`).set(...autorizacion);
    expect(resCategoria.status).toBe(409);
    expect(resCategoria.body.productosActivos).toBe(1);
    expect(resCategoria.body.productos).toEqual([{ _id: String(producto._id), nombre: "Blusa bordada" }]);
    expect(resCategoria.body.error).toMatch(/No se puede desactivar/);

    const resLocalidad = await request(app).delete(`/api/localidades/${localidad._id}`).set(...autorizacion);
    expect(resLocalidad.status).toBe(409);
    expect(resLocalidad.body.productosActivos).toBe(1);

    const resTalla = await request(app).delete(`/api/tallas/${talla._id}`).set(...autorizacion);
    expect(resTalla.status).toBe(409);
    expect(resTalla.body.productos[0].nombre).toBe("Blusa bordada");

    // Nada cambió en la base
    expect((await Categoria.findById(categoria._id)).activo).toBe(true);
    expect((await Localidad.findById(localidad._id)).activo).toBe(true);
    expect((await Talla.findById(talla._id)).activo).toBe(true);

    // Al desactivar el producto, las tres ya se pueden desactivar
    await request(app).delete(`/api/productos/${producto._id}`).set(...autorizacion).expect(200);
    await request(app).delete(`/api/categorias/${categoria._id}`).set(...autorizacion).expect(200);
    await request(app).delete(`/api/localidades/${localidad._id}`).set(...autorizacion).expect(200);
    await request(app).delete(`/api/tallas/${talla._id}`).set(...autorizacion).expect(200);
  });

  it("categoría, localidad y talla desactivadas no salen en los GET públicos", async () => {
    const { localidad, categoria, talla, producto } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("admin", "admin@pruebas.com");
    const autorizacion = ["Authorization", `Bearer ${token}`];

    // Primero se desactiva el producto que las referencia
    await request(app).delete(`/api/productos/${producto._id}`).set(...autorizacion).expect(200);
    await request(app).delete(`/api/categorias/${categoria._id}`).set(...autorizacion).expect(200);
    await request(app).delete(`/api/localidades/${localidad._id}`).set(...autorizacion).expect(200);
    await request(app).delete(`/api/tallas/${talla._id}`).set(...autorizacion).expect(200);

    expect((await request(app).get("/api/categorias")).body).toHaveLength(0);
    expect((await request(app).get("/api/localidades")).body).toHaveLength(0);
    expect((await request(app).get("/api/tallas")).body).toHaveLength(0);
    expect((await request(app).get("/api/public/categorias")).body).toHaveLength(0);
    expect((await request(app).get("/api/public/localidades")).body).toHaveLength(0);
    expect((await request(app).get("/api/public/tallas")).body).toHaveLength(0);

    // El admin las sigue viendo para poder reactivarlas
    expect((await request(app).get("/api/categorias/todos").set(...autorizacion)).body).toHaveLength(1);
    expect((await request(app).get("/api/localidades/todos").set(...autorizacion)).body).toHaveLength(1);
    expect((await request(app).get("/api/tallas/todos").set(...autorizacion)).body).toHaveLength(1);

    // El producto desactivado conserva sus referencias (no se ponen en null)
    const productoEnBase = await Producto.findById(producto._id);
    expect(String(productoEnBase.categoriaId)).toBe(String(categoria._id));
    expect(String(productoEnBase.localidadId)).toBe(String(localidad._id));
  });

  it("los documentos antiguos sin campo activo siguen apareciendo como activos", async () => {
    // Inserción directa sin esquema, como quedaron los datos antes de la migración
    const localidad = await Localidad.create({ nombre: "Huejutla" });
    await Producto.collection.insertOne({ nombre: "Producto viejo", localidadId: localidad._id });

    const res = await request(app).get("/api/productos");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nombre).toBe("Producto viejo");
  });

  it("rechaza tallas de otra categoría y tallas sin categoría al crear un producto", async () => {
    const { localidad, categoria } = await crearCatalogoBasico();
    const otraCategoria = await Categoria.create({ nombre: "Faldas" });
    const tallaDeFaldas = await Talla.create({ categoriaId: otraCategoria._id, genero: "mujer", talla: "CH" });
    const { token } = await crearUsuarioConToken("admin", "admin@pruebas.com");

    const resOtraCategoria = await request(app)
      .post("/api/productos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Blusa", localidadId: localidad._id, categoriaId: categoria._id, tallasDisponibles: [tallaDeFaldas._id] });
    expect(resOtraCategoria.status).toBe(400);
    expect(resOtraCategoria.body.error).toMatch(/no pertenecen a la categoría/);

    const resSinCategoria = await request(app)
      .post("/api/productos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Blusa", localidadId: localidad._id, tallasDisponibles: [tallaDeFaldas._id] });
    expect(resSinCategoria.status).toBe(400);
    expect(resSinCategoria.body.error).toMatch(/Asigna una categoría/);

    const resCorrecto = await request(app)
      .post("/api/productos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Falda", localidadId: localidad._id, categoriaId: otraCategoria._id, tallasDisponibles: [tallaDeFaldas._id] });
    expect(resCorrecto.status).toBe(201);
  });

  it("rechaza una localidad o categoría que no existen", async () => {
    const { token } = await crearUsuarioConToken("admin", "admin@pruebas.com");
    const res = await request(app)
      .post("/api/productos")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Blusa", localidadId: "64b000000000000000000000" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/localidad indicada no existe/);
  });

  it("favoritos omite los productos desactivados sin perder la referencia", async () => {
    const { producto } = await crearCatalogoBasico();
    const { usuario, token } = await crearUsuarioConToken("user", "cliente@pruebas.com");
    await request(app).post(`/api/favoritos/${producto._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    await Producto.findByIdAndUpdate(producto._id, { activo: false });

    const res = await request(app).get("/api/favoritos").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);

    const usuarioEnBase = await User.findById(usuario._id);
    expect(usuarioEnBase.favoritos.map(String)).toContain(String(producto._id));
  });
});
