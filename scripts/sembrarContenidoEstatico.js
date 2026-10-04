// Siembra en la base de datos el contenido que antes vivía escrito en el código
// del frontend (ver docs/contenido-estatico-frontend.md), SOLO donde la base
// está vacía. Nunca pisa lo que la clienta ya capturó desde el panel.
//
// Uso (con MONGODB_URI en .env o en el entorno):
//   node scripts/sembrarContenidoEstatico.js            → siembra
//   node scripts/sembrarContenidoEstatico.js --dry-run  → solo informa qué haría
require("dotenv").config();
const mongoose = require("mongoose");
const Servicio = require("../models/Servicio");
const Valor = require("../models/Valor");
const Nosotros = require("../models/Nosotros");
const ConfiguracionSitio = require("../models/ConfiguracionSitio");

const DRY = process.argv.includes("--dry-run");

const SERVICIOS = [
  {
    nombre: "confeccion",
    titulo: "Confección Artesanal",
    descripcion:
      "Creamos prendas únicas utilizando técnicas tradicionales huastecas transmitidas por generaciones. Cada pieza cuenta una historia de tradición y maestría artesanal.",
  },
  {
    nombre: "bordado",
    titulo: "Bordado Tradicional",
    descripcion:
      "Bordados elaborados a mano con técnicas ancestrales que reflejan la rica simbología y colorido de la cultura huasteca.",
  },
  {
    nombre: "accesorios",
    titulo: "Accesorios Exclusivos",
    descripcion:
      "Diseñamos complementos únicos como rebozos, bolsos y joyería textil que realzan tu estilo personal con la elegancia de la artesanía huasteca.",
  },
  {
    nombre: "talleres",
    titulo: "Talleres Educativos",
    descripcion:
      "Compartimos nuestro conocimiento a través de talleres donde enseñamos las técnicas tradicionales de confección y bordado huasteco.",
  },
];

const VALORES = [
  {
    icon: "Heart",
    titulo: "Comercio Justo",
    descripcion:
      "Garantizamos precios equitativos y condiciones dignas para nuestras artesanas, construyendo relaciones duraderas basadas en el respeto mutuo.",
  },
  {
    icon: "Leaf",
    titulo: "Sostenibilidad",
    descripcion:
      "Utilizamos materiales naturales y procesos eco-amigables, preservando el medio ambiente para las futuras generaciones.",
  },
  {
    icon: "Palette",
    titulo: "Autenticidad",
    descripcion:
      "Cada pieza conserva las técnicas tradicionales de la cultura huasteca, manteniendo viva nuestra herencia ancestral.",
  },
];

const NOSOTROS = {
  mision:
    "Preservar y modernizar las técnicas artesanales huastecas, creando piezas únicas que celebren nuestra herencia cultural mientras apoyamos a las comunidades locales con comercio justo y sostenible.",
  vision:
    "Ser reconocidos como el referente en moda artesanal huasteca, combinando tradición y diseño contemporáneo para llevar nuestra cultura al mundo.",
  historia:
    "La Aterciopelada nació como un sueño de preservar y celebrar las tradiciones artesanales de la región Huasteca. A lo largo de los años, hemos crecido desde nuestras humildes raíces hasta convertirnos en una boutique reconocida por la calidad excepcional de nuestras creaciones. Cada pieza cuenta una historia, cada bordado lleva consigo la sabiduría ancestral de nuestras maestras artesanas. Nuestro compromiso trasciende la simple comercialización: somos guardianes de una herencia cultural que se transmite de generación en generación, adaptándose a los tiempos modernos sin perder su esencia tradicional.",
};

// Textos de la configuración que el front mostraba como respaldo. Solo se usan si el campo está vacío.
const CONFIG_RESPALDO = {
  descripcion: "Descubre la elegancia y calidad en cada prenda. Somos tu destino para la moda que refleja tu estilo único.",
  horarios: "Lunes a Viernes: 9:00 AM - 7:00 PM\nSábados: 10:00 AM - 4:00 PM\nDomingos: Cerrado",
};

const log = (...a) => console.log(DRY ? "[dry-run]" : "[siembra]", ...a);

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error("Falta MONGODB_URI (ponla en .env o en el entorno).");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const nServicios = await Servicio.countDocuments();
  if (nServicios === 0) {
    log(`servicios: colección vacía → se insertan ${SERVICIOS.length}`);
    if (!DRY) await Servicio.insertMany(SERVICIOS);
  } else log(`servicios: ya hay ${nServicios}, no se toca`);

  const nValores = await Valor.countDocuments();
  if (nValores === 0) {
    log(`valores: colección vacía → se insertan ${VALORES.length}`);
    if (!DRY) await Valor.insertMany(VALORES);
  } else log(`valores: ya hay ${nValores}, no se toca`);

  const nosotros = await Nosotros.findOne();
  if (!nosotros) {
    log("nosotros: no existe → se crea con misión, visión e historia");
    if (!DRY) await Nosotros.create(NOSOTROS);
  } else {
    const faltan = ["mision", "vision", "historia"].filter((k) => !nosotros[k]);
    if (faltan.length) {
      log(`nosotros: campos vacíos → se rellenan: ${faltan.join(", ")}`);
      if (!DRY) {
        faltan.forEach((k) => (nosotros[k] = NOSOTROS[k]));
        await nosotros.save();
      }
    } else log("nosotros: completo, no se toca");
  }

  const config = await ConfiguracionSitio.findOne();
  if (config) {
    const faltan = Object.keys(CONFIG_RESPALDO).filter((k) => !config[k]);
    if (faltan.length) {
      log(`configuracion: campos vacíos → se rellenan: ${faltan.join(", ")}`);
      if (!DRY) {
        faltan.forEach((k) => (config[k] = CONFIG_RESPALDO[k]));
        await config.save();
      }
    } else log("configuracion: descripción y horarios ya capturados, no se toca");
  } else log("configuracion: no existe aún; se crea sola al abrir el sitio");

  await mongoose.disconnect();
  log("listo");
})().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
