const request = require("supertest");
const app = require("../index");
const MensajeBuzon = require("../models/MensajeBuzon");
const User = require("../models/User");

const tokenAdmin = async () => {
  const admin = await User.create({
    name: "Admin Pruebas", email: "admin@pruebas.com", phone: "0000000000",
    password: "contrasena-segura", role: "admin",
  });
  return admin.getSignedJwtToken();
};

describe("POST /api/buzon", () => {
  it("acepta una queja anónima, la guarda como nueva y responde aunque el correo falle", async () => {
    // En pruebas no hay BREVO_API_KEY: el aviso por correo falla y no debe bloquear
    const res = await request(app).post("/api/buzon")
      .send({ tipo: "queja", mensaje: "La entrega se retrasó una semana." });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const guardado = await MensajeBuzon.findOne();
    expect(guardado.estado).toBe("nuevo");
    expect(guardado.nombre).toBe("");
    expect(guardado.usuario).toBeNull();
  });

  it("rechaza tipo inválido y mensaje vacío", async () => {
    expect((await request(app).post("/api/buzon").send({ tipo: "otro", mensaje: "x" })).status).toBe(400);
    expect((await request(app).post("/api/buzon").send({ tipo: "queja", mensaje: "   " })).status).toBe(400);
  });

  it("rechaza correo mal formado", async () => {
    const res = await request(app).post("/api/buzon")
      .send({ tipo: "sugerencia", mensaje: "Más colores", email: "no-es-correo" });
    expect(res.status).toBe(400);
  });

  it("exige correo o teléfono cuando pide que lo contacten", async () => {
    const res = await request(app).post("/api/buzon")
      .send({ tipo: "sugerencia", mensaje: "Más colores", quiereContacto: true });
    expect(res.status).toBe(400);
    const ok = await request(app).post("/api/buzon")
      .send({ tipo: "sugerencia", mensaje: "Más colores", quiereContacto: true, telefono: "7711875194" });
    expect(ok.status).toBe(201);
  });

  it("guarda el usuario si viene un token válido", async () => {
    const token = await tokenAdmin();
    await request(app).post("/api/buzon").set("Authorization", `Bearer ${token}`)
      .send({ tipo: "felicitacion", mensaje: "Me encantó la blusa." });
    const guardado = await MensajeBuzon.findOne();
    expect(guardado.usuario).not.toBeNull();
  });
});

describe("admin /api/buzon", () => {
  it("GET exige admin", async () => {
    expect((await request(app).get("/api/buzon")).status).toBe(401);
  });

  it("lista, filtra por estado, cambia estado y nota, y borra", async () => {
    const token = await tokenAdmin();
    const auth = { Authorization: `Bearer ${token}` };
    await MensajeBuzon.create([
      { tipo: "queja", mensaje: "Uno" },
      { tipo: "sugerencia", mensaje: "Dos", estado: "atendido" },
    ]);

    const todos = await request(app).get("/api/buzon").set(auth);
    expect(todos.body).toHaveLength(2);

    const nuevos = await request(app).get("/api/buzon?estado=nuevo").set(auth);
    expect(nuevos.body).toHaveLength(1);
    const id = nuevos.body[0]._id;

    const invalido = await request(app).patch(`/api/buzon/${id}`).set(auth).send({ estado: "otro" });
    expect(invalido.status).toBe(400);

    const atendido = await request(app).patch(`/api/buzon/${id}`).set(auth)
      .send({ estado: "atendido", notaInterna: "Se le llamó y se repuso la prenda." });
    expect(atendido.body.estado).toBe("atendido");
    expect(atendido.body.notaInterna).toContain("repuso");

    const borrado = await request(app).delete(`/api/buzon/${id}`).set(auth);
    expect(borrado.status).toBe(200);
    expect(await MensajeBuzon.countDocuments()).toBe(1);
  });
});
