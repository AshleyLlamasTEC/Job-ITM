import type { SchemaFacade } from "../../support/database/schema";

/**
 * Asignacion de roles a usuarios (polimorfica, como en spatie).
 *
 * model_type guarda el nombre de la clase del modelo y model_id su llave. Hoy
 * solo se usa con User, pero la estructura se conserva identica a la del
 * paquete para que los datos sobrevivan a una migracion a Laravel.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("model_has_roles", (t) => {
    t.foreignId("role_id").constrained("roles").cascadeOnDelete();
    t.string("model_type", 255);
    t.unsignedBigInteger("model_id");

    t.index(["model_id", "model_type"], "model_has_roles_model_id_model_type_index");
    t.primary(["role_id", "model_id", "model_type"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("model_has_roles");
}
