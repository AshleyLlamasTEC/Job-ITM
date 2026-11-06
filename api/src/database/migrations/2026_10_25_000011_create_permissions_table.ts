import type { SchemaFacade } from "../../support/database/schema";

/**
 * Catalogo de permisos por accion (equivalente a spatie/laravel-permission).
 *
 * El nombre sigue la convencion `recurso.accion` (vacantes.moderar,
 * postulaciones.gestionar) para que la matriz de permisos del documento de
 * diseno se pueda leer directamente sobre la base.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("permissions", (t) => {
    t.id();
    t.string("name", 125);
    t.string("guard_name", 125);
    t.timestampsLaravel();

    t.unique(["name", "guard_name"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("permissions");
}
