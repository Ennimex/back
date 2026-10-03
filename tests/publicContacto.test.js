const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../index");
const ConfiguracionSitio = require("../models/ConfiguracionSitio");

describe("GET /api/public/contacto", () => {
  it("responde con los datos de contacto de la configuración", async () => {
    await ConfiguracionSitio.create({
      telefono: "771 187 5194",
      email: "hola@ejemplo.test",
      direccion: "Huejutla de Reyes, Hidalgo",
      horarios: "Lun a Sáb 10:00 a 18:00",
      redesSociales: { facebook: "https://facebook.com/x", whatsapp: "527711875194" },
    });
    const res = await request(app).get("/api/public/contacto");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      telefono: "771 187 5194",
      email: "hola@ejemplo.test",
      direccion: "Huejutla de Reyes, Hidalgo",
      horarios: "Lun a Sáb 10:00 a 18:00",
      redesSociales: expect.objectContaining({ facebook: "https://facebook.com/x", whatsapp: "527711875194" }),
    });
  });

  it("responde con campos vacíos si no hay configuración", async () => {
    const res = await request(app).get("/api/public/contacto");
    expect(res.status).toBe(200);
    expect(res.body.telefono).toBe("");
    expect(res.body.redesSociales).toEqual({});
  });
});

describe("modelos huérfanos", () => {
  it.each([
    "Beneficio", "Collection", "ContactInfo", "Contacto", "Equipo",
    "Historia", "InformacionEmpresa", "Reason", "Region", "SocialNetwork",
  ])("models/%s.js ya no existe", (nombre) => {
    expect(fs.existsSync(path.join(__dirname, "..", "models", `${nombre}.js`))).toBe(false);
  });
});
