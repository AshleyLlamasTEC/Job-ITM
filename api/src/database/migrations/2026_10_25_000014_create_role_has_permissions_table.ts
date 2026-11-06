import type { SchemaFacade } from "../../support/database/schema";

/**
 * Permisos que incluye cada rol.
 *
 * Es la tabla que se edita al ajustar la matriz del apartado 4.7 del documento
 * de diseno. Ningun permiso se escribe en el codigo: todos se resuelven
 * consultando esta relacion.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("role_has_permissions", (t) => {
    t.foreignId("permission_id").constrained("permissions").cascadeOnDelete();
    t.foreignId("role_id").constrained("roles").cascadeOnDelete();

    t.primary(["permission_id", "role_id"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("role_has_permissions");
}
