/**
 * Roles y matriz de permisos.
 *
 * Es la traduccion literal de las tablas 20 y 21 del documento de diseno
 * (apartado 4.7). La matriz vive aqui como dato, no como codigo: si Vinculacion
 * pide que un rol gane o pierda un permiso, se edita esta constante y se vuelve
 * a correr el seeder.
 *
 * `admin_tecnico` no recibe permisos: su acceso total se resuelve con la regla
 * global equivalente a Gate::before, para que el mantenimiento no dependa de que
 * alguien marque bien las casillas.
 */
import { db } from "../../support/database/connection";

export const GUARD = "api";

export const ROLES = ["estudiante", "empresa", "vinculacion", "admin_tecnico"] as const;

export const MATRIZ: Record<string, Array<(typeof ROLES)[number]>> = {

/** Permiso -> rol que lo tiene. Tomado de la tabla 21. */
  "vacantes.ver": ["estudiante", "empresa", "vinculacion"],
  "vacantes.crear": ["empresa"],
  "vacantes.editar": ["empresa"],
  "vacantes.enviar": ["empresa"],
  "vacantes.pausar": ["empresa"],
  "vacantes.cerrar": ["empresa", "vinculacion"],
  "vacantes.moderar": ["vinculacion"],
  "vacantes.dar_baja": ["vinculacion"],
  "postulaciones.crear": ["estudiante"],
  "postulaciones.propias": ["estudiante"],
  "postulaciones.gestionar": ["empresa", "vinculacion"],
  "perfil.editar": ["estudiante", "empresa", "vinculacion"],
  "favoritos.gestionar": ["estudiante"],
  "empresas.validar": ["vinculacion"],
  "reportes.crear": ["estudiante", "empresa"],
  "reportes.atender": ["vinculacion"],
  "indicadores.ver": ["empresa", "vinculacion"],
  "reportes.exportar": ["vinculacion"],
  "usuarios.gestionar": [],
  "bitacora.ver": [],
};

/** Descripcion de cada permiso, para mostrarla en el panel tecnico. */
export const DESCRIPCION_PERMISOS: Record<string, string> = {
  "vacantes.ver": "Consultar vacantes publicadas.",
  "vacantes.crear": "Crear una vacante en borrador.",
  "vacantes.editar": "Editar una vacante propia en borrador o rechazada.",
  "vacantes.enviar": "Enviar una vacante a revision.",
  "vacantes.pausar": "Pausar o reactivar una vacante publicada.",
  "vacantes.cerrar": "Cerrar una vacante y registrar el resultado.",
  "vacantes.moderar": "Aprobar o rechazar vacantes en revision.",
  "vacantes.dar_baja": "Retirar del buscador una vacante publicada.",
  "postulaciones.crear": "Postularse a una vacante vigente.",
  "postulaciones.propias": "Ver y cancelar las postulaciones propias.",
  "postulaciones.gestionar": "Ver candidatos, descargar curriculums y cambiar estados.",
  "perfil.editar": "Editar los datos propios y cargar archivos.",
  "favoritos.gestionar": "Guardar y quitar vacantes favoritas.",
  "empresas.validar": "Aprobar o rechazar el registro de una empresa.",
  "reportes.crear": "Reportar una vacante dudosa.",
  "reportes.atender": "Revisar y resolver reportes.",
  "indicadores.ver": "Consultar el tablero de indicadores.",
  "reportes.exportar": "Descargar listados en formato CSV.",
  "usuarios.gestionar": "Administrar cuentas y roles del sistema.",
  "bitacora.ver": "Consultar el registro de acciones administrativas.",
};

export async function sembrarRolesYPermisos(): Promise<void> {
  // 1. Roles
  const idRol = new Map<string, number>();
  for (const nombre of ROLES) {
    const existente = await db("roles").where({ name: nombre, guard_name: GUARD }).first();
    if (existente) {
      idRol.set(nombre, Number(existente.id));
      continue;
    }
    const [id] = await db("roles").insert({ name: nombre, guard_name: GUARD });
    idRol.set(nombre, Number(id));
  }

  // 2. Permisos
  const idPermiso = new Map<string, number>();
  for (const nombre of Object.keys(MATRIZ)) {
    const existente = await db("permissions").where({ name: nombre, guard_name: GUARD }).first();
    if (existente) {
      idPermiso.set(nombre, Number(existente.id));
      continue;
    }
    const [id] = await db("permissions").insert({ name: nombre, guard_name: GUARD });
    idPermiso.set(nombre, Number(id));
  }

  // 3. Matriz. Se reemplaza completa para que el resultado sea exactamente el
  //    documentado, aunque alguien haya cambiado filas a mano.
  await db("role_has_permissions").delete();

  const filas: Array<{ permission_id: number; role_id: number }> = [];
  for (const [permiso, roles] of Object.entries(MATRIZ)) {
    for (const rol of roles) {
      filas.push({ permission_id: idPermiso.get(permiso)!, role_id: idRol.get(rol)! });
    }
  }

  if (filas.length > 0) await db("role_has_permissions").insert(filas);

  console.log(
    `  roles: ${ROLES.length} | permisos: ${Object.keys(MATRIZ).length} | asignaciones: ${filas.length}`,
  );
}
