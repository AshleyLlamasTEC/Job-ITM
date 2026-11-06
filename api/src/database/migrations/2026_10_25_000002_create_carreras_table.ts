import type { SchemaFacade } from "../../support/database/schema";

/**
 * Catalogo institucional de carreras.
 *
 * No cambia con frecuencia y se administra por migracion o por el panel
 * tecnico. La columna `activa` permite ocultar una carrera sin borrar el
 * historial de vacantes y egresados que la referencian.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("carreras", (t) => {
    t.id();
    t.string("nombre", 120).unique();
    t.string("clave", 10);
    t.boolean("activa").default(true);
    t.dateTime("creado_en").useCurrent();
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("carreras");
}
