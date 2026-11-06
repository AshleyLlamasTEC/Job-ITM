import type { SchemaFacade } from "../../support/database/schema";

/**
 * Perfil academico del alumno o egresado.
 *
 * Relacion uno a uno con users. La matricula es la identidad institucional: es
 * unica y es el dato con el que se valida que la persona pertenece al
 * Tecnologico. `semestre` es nulo cuando el alumno ya egreso y, en ese caso, se
 * usa `anio_egreso`.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("estudiantes", (t) => {
    t.id();
    t.foreignId("user_id").constrained("users").cascadeOnDelete();
    t.string("matricula", 12).unique();
    t.foreignId("carrera_id").constrained("carreras").restrictOnDelete();
    t.tinyInteger("semestre").nullable();
    t.smallInteger("anio_egreso").nullable();
    t.string("telefono", 15).nullable();
    t.string("cv_ruta", 255).nullable();
    t.dateTime("cv_actualizado_en").nullable();
    t.string("habilidades", 400).nullable();
    t.timestamps();

    // Un usuario tiene un solo perfil de estudiante.
    t.unique("user_id");
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("estudiantes");
}
