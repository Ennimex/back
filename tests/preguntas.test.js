const request = require("supertest");
const app = require("../index");
const PreguntaFrecuente = require("../models/PreguntaFrecuente");
const User = require("../models/User");

const tokenAdmin = async () => {
  const admin = await User.create({
    name: "Admin Pruebas", email: "admin@pruebas.com", phone: "0000000000",
    password: "contrasena-segura", role: "admin",
  });
  return admin.getSignedJwtToken();
};

describe("preguntas frecuentes", () => {
  it("GET público devuelve solo activas, ordenadas por orden", async () => {
    await PreguntaFrecuente.create([
      { pregunta: "¿Hacen envíos?", respuesta: "Sí, a todo México.", orden: 2 },
      { pregunta: "¿Cuánto tarda un pedido?", respuesta: "Depende del bordado.", orden: 1 },
      { pregunta: "Borrador", respuesta: "No publicar", orden: 0, activa: false },
    ]);
    const res = await request(app).get("/api/preguntas-frecuentes");
    expect(res.status).toBe(200);
    expect(res.body.map((p) => p.pregunta)).toEqual(["¿Cuánto tarda un pedido?", "¿Hacen envíos?"]);
  });

  it("POST exige admin", async () => {
    const res = await request(app).post("/api/preguntas-frecuentes").send({ pregunta: "x", respuesta: "y" });
    expect(res.status).toBe(401);
  });

  it("rechaza pregunta sin respuesta", async () => {
    const token = await tokenAdmin();
    const res = await request(app)
      .post("/api/preguntas-frecuentes")
      .set("Authorization", `Bearer ${token}`)
      .send({ pregunta: "Sin respuesta" });
    expect(res.status).toBe(400);
  });

  it("admin crea, lista todas, desactiva y borra", async () => {
    const token = await tokenAdmin();
    const auth = { Authorization: `Bearer ${token}` };

    const creada = await request(app).post("/api/preguntas-frecuentes").set(auth)
      .send({ pregunta: "¿Rentan?", respuesta: "Pregúntanos por WhatsApp." });
    expect(creada.status).toBe(201);
    const id = creada.body._id;

    const todas = await request(app).get("/api/preguntas-frecuentes/todas").set(auth);
    expect(todas.body).toHaveLength(1);

    const editada = await request(app).put(`/api/preguntas-frecuentes/${id}`).set(auth)
      .send({ activa: false, orden: 5 });
    expect(editada.body.activa).toBe(false);
    expect(editada.body.orden).toBe(5);

    const publicas = await request(app).get("/api/preguntas-frecuentes");
    expect(publicas.body).toHaveLength(0);

    const borrada = await request(app).delete(`/api/preguntas-frecuentes/${id}`).set(auth);
    expect(borrada.status).toBe(200);
    expect(await PreguntaFrecuente.countDocuments()).toBe(0);
  });
});
