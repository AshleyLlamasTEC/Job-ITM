import type { SchemaFacade } from "../../support/database/schema";

/**
 * Permisos puntuales otorgados a un usuario concreto, fuera de su rol.
 *
 * El diseno lo contempla solo para excepciones: la regla general es que el
 * permiso venga del rol. Se conserva la tabla porque es parte del contrato de
 * spatie y porque evita tener que cambiar el esquema si aparece un caso
 * justificado.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("model_has_permissions", (t) => {
    t.foreignId("permission_id").constrained("permissions").cascadeOnDelete();
    t.string("model_type", 255);
    t.unsignedBigInteger("model_id");

    t.index(["model_id", "model_type"], "model_has_permissions_model_id_model_type_index");
    t.primary(["permission_id", "model_id", "model_type"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("model_has_permissions");
}
