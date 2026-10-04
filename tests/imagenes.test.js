const { Writable } = require("stream");

// Cloudinary simulado para toda la suite: la subida devuelve una url y un
// public_id predecibles, y el borrado solo registra con qué public_id se llamó.
let contadorDeSubidas = 0;
const mockDestroy = jest.fn().mockResolvedValue({ result: "ok" });
const mockUploadStream = jest.fn((opciones, callback) => {
  contadorDeSubidas += 1;
  const numeroDeSubida = contadorDeSubidas;
  const destino = new Writable({
    write(trozo, codificacion, siguiente) {
      siguiente();
    },
  });
  destino.on("finish", () => {
    callback(null, {
      secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${opciones.folder}/subida-${numeroDeSubida}.jpg`,
      public_id: `${opciones.folder}/subida-${numeroDeSubida}`,
    });
  });
  return destino;
});
jest.mock("../config/cloudinaryConfig", () => ({
  uploader: {
    upload_stream: (...argumentos) => mockUploadStream(...argumentos),
    destroy: (...argumentos) => mockDestroy(...argumentos),
  },
  url: () => "https://res.cloudinary.com/demo/video/upload/so_0/galeria/videos/simulado.jpg",
}));

const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const Foto = require("../models/Fotos");
const Servicio = require("../models/Servicio");
const Categoria = require("../models/Categorias");
const Video = require("../models/Video");
const { extraerPublicIdDeUrl } = require("../utils/imagenesCloudinary");

// Crea un admin y devuelve su token
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

beforeEach(() => {
  mockDestroy.mockClear();
  mockUploadStream.mockClear();
});

describe("extraerPublicIdDeUrl", () => {
  it("deduce el public_id de URLs de Cloudinary con versión, con transformaciones o sin nada", () => {
    expect(extraerPublicIdDeUrl("https://res.cloudinary.com/dtx/image/upload/v1791076698/galeria/fotos/vbm887.jpg"))
      .toBe("galeria/fotos/vbm887");
    expect(extraerPublicIdDeUrl("https://res.cloudinary.com/dtx/video/upload/c_scale,w_480/so_0/galeria/videos/abc.jpg"))
      .toBe("galeria/videos/abc");
    expect(extraerPublicIdDeUrl("https://res.cloudinary.com/dtx/image/upload/productos/xyz.png")).toBe("productos/xyz");
  });

  it("devuelve vacío cuando la URL no es de Cloudinary o no viene", () => {
    expect(extraerPublicIdDeUrl("https://ejemplo.com/imagen.jpg")).toBe("");
    expect(extraerPublicIdDeUrl("")).toBe("");
    expect(extraerPublicIdDeUrl(undefined)).toBe("");
  });
});

describe("imágenes en Cloudinary (API con Cloudinary simulado)", () => {
  it("POST /api/fotos guarda { url, publicId } en la carpeta correcta y expone `url` para el front", async () => {
    const token = await tokenAdmin();

    const res = await request(app)
      .post("/api/fotos")
      .set("Authorization", `Bearer ${token}`)
      .field("titulo", "Blusa en el patio")
      .attach("imagen", Buffer.from("bytes de prueba"), "foto.jpg");

    expect(res.status).toBe(201);
    expect(res.body.foto.imagen.publicId).toMatch(/^galeria\/fotos\/subida-\d+$/);
    expect(res.body.foto.imagen.url).toContain("/galeria/fotos/");
    expect(res.body.foto.url).toBe(res.body.foto.imagen.url);
    expect(mockUploadStream).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "galeria/fotos" }),
      expect.any(Function)
    );
  });

  it("PUT /api/fotos/:id con imagen nueva borra la anterior por publicId", async () => {
    const token = await tokenAdmin();
    const foto = await Foto.create({
      titulo: "Original",
      imagen: { url: "https://res.cloudinary.com/demo/image/upload/v1/galeria/fotos/original.jpg", publicId: "galeria/fotos/original" },
    });

    const res = await request(app)
      .put(`/api/fotos/${foto._id}`)
      .set("Authorization", `Bearer ${token}`)
      .attach("imagen", Buffer.from("bytes nuevos"), "nueva.png");

    expect(res.status).toBe(200);
    expect(res.body.foto.imagen.publicId).not.toBe("galeria/fotos/original");
    expect(mockDestroy).toHaveBeenCalledWith("galeria/fotos/original", { resource_type: "image" });
  });

  it("DELETE /api/fotos/:id borra el archivo por publicId y luego el documento", async () => {
    const token = await tokenAdmin();
    const foto = await Foto.create({
      titulo: "Para borrar",
      imagen: { url: "https://res.cloudinary.com/demo/image/upload/v1/galeria/fotos/borrar.jpg", publicId: "galeria/fotos/borrar" },
    });

    const res = await request(app).delete(`/api/fotos/${foto._id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.fotoEliminada.imagenEliminada).toBe(true);
    expect(mockDestroy).toHaveBeenCalledWith("galeria/fotos/borrar", { resource_type: "image" });
    expect(await Foto.findById(foto._id)).toBeNull();
  });

  it("borra por el publicId deducido de la URL cuando el documento antiguo no lo guardó", async () => {
    const token = await tokenAdmin();
    const fotoAntigua = await Foto.create({
      titulo: "Antigua",
      imagen: { url: "https://res.cloudinary.com/demo/image/upload/v1/galeria/fotos/antigua.jpg", publicId: "" },
    });

    await request(app).delete(`/api/fotos/${fotoAntigua._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    expect(mockDestroy).toHaveBeenCalledWith("galeria/fotos/antigua", { resource_type: "image" });
  });

  it("DELETE /api/servicios/:id borra su imagen de Cloudinary", async () => {
    const token = await tokenAdmin();
    const servicio = await Servicio.create({
      nombre: "bordado",
      titulo: "Bordado",
      imagen: { url: "https://res.cloudinary.com/demo/image/upload/v1/servicios/bordado.jpg", publicId: "servicios/bordado" },
    });

    const res = await request(app).delete(`/api/servicios/${servicio._id}`).set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockDestroy).toHaveBeenCalledWith("servicios/bordado", { resource_type: "image" });
  });

  it("no llama a Cloudinary al borrar un registro sin imagen", async () => {
    const token = await tokenAdmin();
    const servicioSinImagen = await Servicio.create({ nombre: "talleres", titulo: "Talleres" });

    await request(app).delete(`/api/servicios/${servicioSinImagen._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it("DELETE /api/videos/:id borra el video y, solo si la miniatura es un archivo aparte, también ella", async () => {
    const token = await tokenAdmin();
    const autorizacion = ["Authorization", `Bearer ${token}`];
    const videoConPortadaPropia = await Video.create({
      titulo: "Con portada propia",
      url: "https://res.cloudinary.com/demo/video/upload/v1/galeria/videos/a.mp4",
      publicId: "galeria/videos/a",
      miniatura: { url: "https://res.cloudinary.com/demo/image/upload/v1/galeria/miniaturas/a.jpg", publicId: "galeria/miniaturas/a" },
    });
    const videoConMiniaturaDerivada = await Video.create({
      titulo: "Derivado",
      url: "https://res.cloudinary.com/demo/video/upload/v1/galeria/videos/b.mp4",
      publicId: "galeria/videos/b",
      miniatura: { url: "https://res.cloudinary.com/demo/video/upload/so_0/galeria/videos/b.jpg", publicId: "galeria/videos/b" },
    });

    // Portada propia: se borran los dos archivos
    const resPortadaPropia = await request(app).delete(`/api/videos/${videoConPortadaPropia._id}`).set(...autorizacion);
    expect(resPortadaPropia.status).toBe(200);
    expect(resPortadaPropia.body.videoEliminado).toMatchObject({ archivoEliminado: true, miniaturaEliminada: true });
    expect(mockDestroy).toHaveBeenCalledWith("galeria/videos/a", { resource_type: "video" });
    expect(mockDestroy).toHaveBeenCalledWith("galeria/miniaturas/a", { resource_type: "image" });

    // Miniatura derivada: solo se borra el video
    mockDestroy.mockClear();
    const resDerivado = await request(app).delete(`/api/videos/${videoConMiniaturaDerivada._id}`).set(...autorizacion);
    expect(resDerivado.status).toBe(200);
    expect(resDerivado.body.videoEliminado.miniaturaEliminada).toBe(false);
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockDestroy).toHaveBeenCalledWith("galeria/videos/b", { resource_type: "video" });
  });

  it("POST /api/categorias acepta imagenURL como texto y deduce el publicId si es de Cloudinary", async () => {
    const token = await tokenAdmin();
    const urlExistente = "https://res.cloudinary.com/demo/image/upload/v1/categorias/faldas.jpg";

    const res = await request(app)
      .post("/api/categorias")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Faldas", imagenURL: urlExistente });

    expect(res.status).toBe(201);
    expect(res.body.categoria.imagen).toEqual({ url: urlExistente, publicId: "categorias/faldas" });
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it("GET /api/categorias incluye imagenURL de compatibilidad junto con el subdocumento", async () => {
    await Categoria.create({
      nombre: "Blusas",
      imagen: { url: "https://res.cloudinary.com/demo/image/upload/v1/categorias/blusas.jpg", publicId: "categorias/blusas" },
    });

    const res = await request(app).get("/api/categorias");

    expect(res.status).toBe(200);
    expect(res.body[0].imagen.publicId).toBe("categorias/blusas");
    expect(res.body[0].imagenURL).toBe("https://res.cloudinary.com/demo/image/upload/v1/categorias/blusas.jpg");
  });
});
