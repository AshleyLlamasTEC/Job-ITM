import type { SchemaFacade } from "../../support/database/schema";

/**
 * Vacantes guardadas por un estudiante.
 *
 * Tabla de union con llave primaria compuesta: no hace falta un id propio
 * porque el par (estudiante, vacante) ya es unico, y ese mismo par es el que
 * impide guardar dos veces la misma vacante.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("favoritos", (t) => {
    t.foreignId("estudiante_id").constrained("estudiantes").cascadeOnDelete();
    t.foreignId("vacante_id").constrained("vacantes").cascadeOnDelete();
    t.dateTime("creado_en").useCurrent();

    t.primary(["estudiante_id", "vacante_id"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("favoritos");
}
