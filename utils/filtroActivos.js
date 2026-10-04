// Filtro para los listados públicos del catálogo: solo registros activos.
//
// Se usa `{ activo: { $ne: false } }` y no `{ activo: true }` a propósito:
// los documentos creados antes del borrado lógico todavía no tienen el campo
// `activo`, y con `$ne: false` siguen apareciendo mientras no se corra la
// migración que les pone `activo: true`.
//
// Resultado: un objeto listo para usar en Model.find(FILTRO_ACTIVOS) o para
// mezclar en otra consulta con { _id: id, ...FILTRO_ACTIVOS }.
const FILTRO_ACTIVOS = { activo: { $ne: false } };

module.exports = { FILTRO_ACTIVOS };
