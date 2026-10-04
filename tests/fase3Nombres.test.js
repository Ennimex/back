const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../index");
const User = require("../models/User");
const Localidad = require("../models/Localidades");
const Categoria = require("../models/Categorias");
const Talla = require("../models/Tallas");
const Producto = require("../models/Producto");
const Foto = require("../models/Fotos");
const Solicitud = require("../models/Solicitud");
const Valor = require("../models/Valor");
const MensajeBuzon = require("../models/MensajeBuzon");

// Crea un usuario con el rol indicado usando los nombres NUEVOS de campo
const crearUsuarioConToken = async (rol, correo) => {
  const usuario = await User.create({
    nombre: `Usuario ${rol}`,
    email: correo,
    telefono: "7710000000",
    password: "contrasena-segura",
    role: rol,
  });
  return { usuario, token: usuario.getSignedJwtToken() };
};

describe("fase 3: nombres en español en User con compatibilidad", () => {
  it("User.create con los nombres viejos (name, phone) guarda nombre y telefono", async () => {
    const usuario = await User.create({
      name: "Compat Vieja",
      phone: "7719999999",
      email: "compat@pruebas.com",
      password: "contrasena-segura",
    });
    const enBase = await User.collection.findOne({ _id: usuario._id });
    expect(enBase.nombre).toBe("Compat Vieja");
    expect(enBase.telefono).toBe("7719999999");
    expect(enBase.name).toBeUndefined();
    expect(enBase.phone).toBeUndefined();
    // Timestamps de Mongoose activos
    expect(enBase.createdAt).toBeInstanceOf(Date);
    expect(enBase.updatedAt).toBeInstanceOf(Date);
  });

  it("registro acepta name/phone, y login devuelve nombre y name", async () => {
    const resRegistro = await request(app)
      .post("/api/auth/register")
      .send({ name: "Nueva Cliente", phone: "7712222222", email: "nueva@pruebas.com", password: "contrasena-segura" });
    expect(resRegistro.status).toBe(201);

    const enBase = await User.collection.findOne({ email: "nueva@pruebas.com" });
    expect(enBase.nombre).toBe("Nueva Cliente");
    expect(enBase.telefono).toBe("7712222222");

    const resLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "nueva@pruebas.com", password: "contrasena-segura" });
    expect(resLogin.status).toBe(200);
    expect(resLogin.body.user.nombre).toBe("Nueva Cliente");
    expect(resLogin.body.user.name).toBe("Nueva Cliente");
  });

  it("GET /api/perfil devuelve ambos nombres y PUT acepta los nuevos o los viejos", async () => {
    const { token } = await crearUsuarioConToken("user", "perfil@pruebas.com");
    const autorizacion = ["Authorization", `Bearer ${token}`];

    const resPerfil = await request(app).get("/api/perfil").set(...autorizacion);
    expect(resPerfil.status).toBe(200);
    expect(resPerfil.body.data.nombre).toBe("Usuario user");
    expect(resPerfil.body.data.name).toBe("Usuario user");
    expect(resPerfil.body.data.telefono).toBe("7710000000");
    expect(resPerfil.body.data.phone).toBe("7710000000");

    const resNuevos = await request(app)
      .put("/api/perfil")
      .set(...autorizacion)
      .send({ nombre: "Nombre Nuevo", email: "perfil@pruebas.com", telefono: "7713333333" });
    expect(resNuevos.status).toBe(200);
    expect(resNuevos.body.data.nombre).toBe("Nombre Nuevo");

    const resViejos = await request(app)
      .put("/api/perfil")
      .set(...autorizacion)
      .send({ name: "Nombre Viejo", email: "perfil@pruebas.com", phone: "7714444444" });
    expect(resViejos.status).toBe(200);
    expect(resViejos.body.data.name).toBe("Nombre Viejo");
    expect(resViejos.body.data.telefono).toBe("7714444444");
  });

  it("el admin lista usuarios con nombre y name, y los crea o edita con cualquiera de los dos", async () => {
    const { token } = await crearUsuarioConToken("admin", "admin@pruebas.com");
    const autorizacion = ["Authorization", `Bearer ${token}`];

    const resAlta = await request(app)
      .post("/api/admin/users")
      .set(...autorizacion)
      .send({ name: "Creado Viejo", phone: "7715555555", email: "creado@pruebas.com", password: "contrasena-segura" });
    expect(resAlta.status).toBe(201);
    expect(resAlta.body.data.nombre).toBe("Creado Viejo");

    const resEdicion = await request(app)
      .put(`/api/admin/users/${resAlta.body.data._id}`)
      .set(...autorizacion)
      .send({ nombre: "Editado Nuevo" });
    expect(resEdicion.status).toBe(200);
    expect(resEdicion.body.data.nombre).toBe("Editado Nuevo");
    expect(resEdicion.body.data.name).toBe("Editado Nuevo");

    const resLista = await request(app).get("/api/admin/users").set(...autorizacion);
    const creado = resLista.body.find((u) => u.email === "creado@pruebas.com");
    expect(creado.nombre).toBe("Editado Nuevo");
    expect(creado.name).toBe("Editado Nuevo");
    expect(creado.password).toBeUndefined();

    const resDashboard = await request(app).get("/api/admin/dashboard").set(...autorizacion);
    expect(resDashboard.status).toBe(200);
    expect(resDashboard.body.recientes.usuarios[0].name).toBeDefined();
  });

  it("una solicitud copia nombre y telefono del usuario con los campos nuevos", async () => {
    const localidad = await Localidad.create({ nombre: "Huejutla" });
    const producto = await Producto.create({ nombre: "Blusa", localidadId: localidad._id });
    const { token } = await crearUsuarioConToken("user", "cliente@pruebas.com");

    const res = await request(app)
      .post("/api/solicitudes")
      .set("Authorization", `Bearer ${token}`)
      .send({ productos: [{ productoId: producto._id }] });
    expect(res.status).toBe(201);
    expect(res.body.solicitud.nombre).toBe("Usuario user");
    expect(res.body.solicitud.telefono).toBe("7710000000");
    expect(res.body.solicitud.createdAt).toBeDefined();
    expect(res.body.solicitud.updatedAt).toBeDefined();
  });
});

describe("fase 3: modelos en singular, colecciones fijas y timestamps", () => {
  it("los modelos se registran en singular y las colecciones tienen nombre fijo", () => {
    expect(mongoose.model("Talla").collection.name).toBe("tallas");
    expect(mongoose.model("Localidad").collection.name).toBe("localidades");
    expect(mongoose.model("Evento").collection.name).toBe("eventos");
    expect(mongoose.model("Servicio").collection.name).toBe("servicios");
    expect(mongoose.model("Colaborador").collection.name).toBe("colaboradores");
    expect(() => mongoose.model("Tallas")).toThrow();
    expect(() => mongoose.model("Eventos")).toThrow();

    expect(Solicitud.collection.name).toBe("solicitudes");
    expect(Valor.collection.name).toBe("valores");
    expect(MensajeBuzon.collection.name).toBe("mensajesbuzon");
    expect(User.collection.name).toBe("users");
  });

  it("populate funciona con las referencias en singular", async () => {
    const localidad = await Localidad.create({ nombre: "Huejutla" });
    const categoria = await Categoria.create({ nombre: "Blusas" });
    const talla = await Talla.create({ categoriaId: categoria._id, genero: "mujer", talla: "M" });
    await Producto.create({ nombre: "Blusa", localidadId: localidad._id, categoriaId: categoria._id, tallasDisponibles: [talla._id] });

    const res = await request(app).get("/api/productos");
    expect(res.status).toBe(200);
    expect(res.body[0].localidadId.nombre).toBe("Huejutla");
    expect(res.body[0].categoriaId.nombre).toBe("Blusas");
    expect(res.body[0].tallasDisponibles[0].talla).toBe("M");
    expect(res.body[0].tallasDisponibles[0].categoriaId.nombre).toBe("Blusas");
  });

  it("Foto lleva timestamps y expone fechaSubida como alias de createdAt", async () => {
    const foto = await Foto.create({ titulo: "Nueva", imagen: { url: "https://x/y.jpg", publicId: "y" } });
    const res = await request(app).get(`/api/fotos/${foto._id}`);
    expect(res.status).toBe(200);
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
    expect(res.body.fechaSubida).toBe(res.body.createdAt);
  });
});
