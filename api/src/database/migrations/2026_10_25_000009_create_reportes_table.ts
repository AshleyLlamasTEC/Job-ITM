import type { SchemaFacade } from "../../support/database/schema";

/**
 * Reporte ciudadano sobre una vacante dudosa.
 *
 * Lo puede crear cualquier usuario autenticado y lo atiende Vinculacion. El
 * motivo es obligatorio porque es lo que permite clasificar y priorizar la
 * revision.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("reportes", (t) => {
    t.id();
    t.foreignId("vacante_id").constrained("vacantes").cascadeOnDelete();
    t.foreignId("user_id").constrained("users").cascadeOnDelete();
    t.enum("motivo", ["informacion_falsa", "duplicada", "discriminatoria", "datos_de_contacto", "otro"]);
    t.string("detalle", 600).nullable();
    t.enum("estado", ["nuevo", "en_revision", "resuelto", "descartado"]).default("nuevo");
    t.foreignId("atendido_por").nullable().constrained("users").nullOnDelete();
    t.dateTime("atendido_en").nullable();
    t.dateTime("creado_en").useCurrent();

    t.index(["estado", "creado_en"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("reportes");
}
