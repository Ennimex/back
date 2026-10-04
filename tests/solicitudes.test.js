const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const Localidad = require("../models/Localidades");
const Categoria = require("../models/Categorias");
const Talla = require("../models/Tallas");
const Producto = require("../models/Producto");
const Solicitud = require("../models/Solicitud");

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

// Crea localidad, categoría, una talla de esa categoría y un producto que la ofrece
const crearCatalogoBasico = async () => {
  const localidad = await Localidad.create({ nombre: "Huejutla" });
  const categoria = await Categoria.create({ nombre: "Blusas" });
  const talla = await Talla.create({ categoriaId: categoria._id, genero: "mujer", talla: "M" });
  const producto = await Producto.create({
    nombre: "Blusa bordada",
    imagen: { url: "https://res.cloudinary.com/demo/productos/blusa.jpg", publicId: "productos/blusa" },
    localidadId: localidad._id,
    categoriaId: categoria._id,
    tallasDisponibles: [talla._id],
  });
  return { localidad, categoria, talla, producto };
};

describe("solicitudes de cotización", () => {
  it("copia nombre e imagen desde la base (no del cliente), cantidad 1 e historial inicial", async () => {
    const { producto, talla } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");

    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productos: [
          { productoId: producto._id, nombre: "Nombre inventado", imagenURL: "https://otra", tallaElegida: talla._id },
        ],
        mensaje: "Me interesa",
      });

    expect(res.status).toBe(201);
    const renglon = res.body.solicitud.productos[0];
    expect(renglon.nombreAlPedir).toBe("Blusa bordada");
    expect(renglon.imagenAlPedir).toBe("https://res.cloudinary.com/demo/productos/blusa.jpg");
    expect(renglon.cantidad).toBe(1);
    expect(String(renglon.tallaElegida)).toBe(String(talla._id));
    // Compatibilidad con el front y la app, que todavía leen los nombres viejos
    expect(renglon.nombre).toBe("Blusa bordada");
    expect(renglon.imagenURL).toBe("https://res.cloudinary.com/demo/productos/blusa.jpg");
    // Historial con el estado inicial generado por el sistema
    expect(res.body.solicitud.historialEstados).toHaveLength(1);
    expect(res.body.solicitud.historialEstados[0].estado).toBe("pendiente");
    expect(res.body.solicitud.historialEstados[0].adminId).toBeNull();
  });

  it("respeta la cantidad enviada y corrige una cantidad menor a 1", async () => {
    const { producto } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");

    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        productos: [
          { productoId: producto._id, cantidad: 3 },
          { productoId: producto._id, cantidad: 0 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.solicitud.productos.map((r) => r.cantidad)).toEqual([3, 1]);
  });

  it("rechaza un producto desactivado y uno inexistente", async () => {
    const { producto } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");
    await Producto.findByIdAndUpdate(producto._id, { activo: false });

    const resDesactivado = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ productos: [{ productoId: producto._id }] });
    expect(resDesactivado.status).toBe(400);
    expect(resDesactivado.body.error).toMatch(/ya no está disponible/);

    const resInexistente = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ productos: [{ productoId: "64b000000000000000000000" }] });
    expect(resInexistente.status).toBe(400);
  });

  it("rechaza una talla que el producto no ofrece", async () => {
    const { producto, categoria } = await crearCatalogoBasico();
    const tallaNoOfrecida = await Talla.create({ categoriaId: categoria._id, genero: "mujer", talla: "XL" });
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");

    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ productos: [{ productoId: producto._id, tallaElegida: tallaNoOfrecida._id }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/talla elegida no está disponible/);
  });

  it("rechaza una talla desactivada aunque el producto la liste", async () => {
    const { producto, talla } = await crearCatalogoBasico();
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");
    await Talla.findByIdAndUpdate(talla._id, { activo: false });

    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ productos: [{ productoId: producto._id, tallaElegida: talla._id }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/está desactivada/);
  });

  it("rechaza cualquier talla cuando el producto no maneja tallas", async () => {
    const { localidad, talla } = await crearCatalogoBasico();
    const productoSinTallas = await Producto.create({ nombre: "Rebozo", localidadId: localidad._id });
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");

    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ productos: [{ productoId: productoSinTallas._id, tallaElegida: talla._id }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no maneja tallas/);
  });

  it("el admin cambia el estado y queda en el historial con su id; repetirlo no duplica", async () => {
    const { producto } = await crearCatalogoBasico();
    const { usuario: cliente } = await crearUsuarioConToken("user", "cliente@pruebas.com");
    const { usuario: admin, token: tokenAdmin } = await crearUsuarioConToken("admin", "admin@pruebas.com");
    const solicitud = await Solicitud.create({
      usuario: cliente._id,
      productos: [{ productoId: producto._id, nombreAlPedir: producto.nombre }],
      historialEstados: [{ estado: "pendiente", adminId: null }],
    });

    const resCambio = await request(app)
      .patch(`/api/admin/solicitudes/${solicitud._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ estado: "atendida" });
    expect(resCambio.status).toBe(200);
    expect(resCambio.body.data.estado).toBe("atendida");
    expect(resCambio.body.data.historialEstados).toHaveLength(2);
    expect(String(resCambio.body.data.historialEstados[1].adminId)).toBe(String(admin._id));

    const resRepetido = await request(app)
      .patch(`/api/admin/solicitudes/${solicitud._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ estado: "atendida" });
    expect(resRepetido.status).toBe(200);
    expect(resRepetido.body.data.historialEstados).toHaveLength(2);

    const resInvalido = await request(app)
      .patch(`/api/admin/solicitudes/${solicitud._id}`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ estado: "entregada" });
    expect(resInvalido.status).toBe(400);
  });

  it("cada usuario ve solo sus solicitudes", async () => {
    const { producto } = await crearCatalogoBasico();
    const { usuario: clienteA, token: tokenA } = await crearUsuarioConToken("user", "a@pruebas.com");
    const { usuario: clienteB } = await crearUsuarioConToken("user", "b@pruebas.com");
    await Solicitud.create({ usuario: clienteA._id, productos: [{ productoId: producto._id }] });
    await Solicitud.create({ usuario: clienteB._id, productos: [{ productoId: producto._id }] });

    const res = await request(app).get("/api/solicitudes").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(String(res.body[0].usuario)).toBe(String(clienteA._id));
  });
});
