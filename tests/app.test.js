const request = require("supertest");
const app = require("../index");

describe("API", () => {
  it("responde en la raíz", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Bienvenidos a mi API");
  });

  it("devuelve 404 JSON en rutas desconocidas", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Ruta no encontrada" });
  });
});
