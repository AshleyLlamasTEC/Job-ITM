import type { SchemaFacade } from "../../support/database/schema";

/**
 * Candidatura de un estudiante a una vacante.
 *
 * Es la tabla que produce los indicadores de vinculacion. El indice unico
 * compuesto impide que el mismo alumno se postule dos veces a la misma vacante,
 * aunque la peticion llegue por fuera de la interfaz.
 *
 * `cv_ruta` guarda una copia del curriculum vigente al momento de postularse:
 * si el alumno despues actualiza su perfil, la empresa sigue viendo el archivo
 * que realmente recibio.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("postulaciones", (t) => {
    t.id();
    t.foreignId("vacante_id").constrained("vacantes").cascadeOnDelete();
    t.foreignId("estudiante_id").constrained("estudiantes").cascadeOnDelete();
    t.string("cv_ruta", 255);
    t.string("mensaje", 600).nullable();
    t.enum("estado", ["recibida", "en_revision", "contactado", "entrevista", "contratado", "rechazado"])
      .default("recibida");
    t.string("notas_empresa", 600).nullable();
    t.dateTime("fecha_estado").useCurrent();
    t.timestamps();

    t.unique(["vacante_id", "estudiante_id"]);
    t.index(["estudiante_id", "estado"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("postulaciones");
}
