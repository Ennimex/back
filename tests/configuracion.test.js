const request = require("supertest");
const app = require("../index");
const ConfiguracionSitio = require("../models/ConfiguracionSitio");
const User = require("../models/User");

const tokenAdmin = async () => {
  const admin = await User.create({
    name: "Admin Pruebas",
    email: "admin@pruebas.com",
    phone: "0000000000",
    password: "contrasena-segura",
    role: "admin",
  });
  return admin.getSignedJwtToken();
};

describe("GET /api/configuracion", () => {
  it("siembra sin teléfono ni WhatsApp inventados y con dirección en Hidalgo", async () => {
    const res = await request(app).get("/api/configuracion");
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe("La Aterciopelada");
    expect(res.body.nombreCorto).toBe("La Aterciopelada");
    expect(res.body.lema).toBe("Boutique Huasteca");
    expect(res.body.telefono).toBe("");
    expect(res.body.redesSociales.whatsapp).toBe("");
    expect(res.body.redesSociales.facebook).toContain("61567232369483");
    expect(res.body.direccion).toContain("Huejutla de Reyes, Hidalgo");
    expect(res.body.direccion).not.toContain("San Luis");
    expect(res.body.terminosCondiciones).toBe("");
    expect(res.body.avisoPrivacidad).toBe("");
  });

  it("no sobreescribe un documento existente con datos de la clienta", async () => {
    await ConfiguracionSitio.create({
      nombre: "La Aterciopelada",
      descripcion: "Texto de la clienta",
      telefono: "771 187 5194",
      direccion: "Calle Real 1, Huejutla",
      redesSociales: { whatsapp: "https://wa.me/527711875194" },
    });
    const res = await request(app).get("/api/configuracion");
    expect(res.body.telefono).toBe("771 187 5194");
    expect(res.body.direccion).toBe("Calle Real 1, Huejutla");
    expect(res.body.redesSociales.whatsapp).toBe("https://wa.me/527711875194");
  });
});

describe("PUT /api/configuracion", () => {
  it("rechaza sin token", async () => {
    const res = await request(app).put("/api/configuracion").field("lema", "x");
    expect(res.status).toBe(401);
  });

  it("guarda nombre corto, lema, términos y aviso", async () => {
    const token = await tokenAdmin();
    const res = await request(app)
      .put("/api/configuracion")
      .set("Authorization", `Bearer ${token}`)
      .field("nombreCorto", "Aterciopelada")
      .field("lema", "Boutique Huasteca · Huejutla")
      .field("terminosCondiciones", "Términos de prueba")
      .field("avisoPrivacidad", "Aviso de prueba");
    expect(res.status).toBe(200);

    const leido = await request(app).get("/api/configuracion");
    expect(leido.body.nombreCorto).toBe("Aterciopelada");
    expect(leido.body.lema).toBe("Boutique Huasteca · Huejutla");
    expect(leido.body.terminosCondiciones).toBe("Términos de prueba");
    expect(leido.body.avisoPrivacidad).toBe("Aviso de prueba");
  });
});
