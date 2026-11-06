import type { SchemaFacade } from "../../support/database/schema";

/**
 * Catalogo de roles (equivalente a la tabla de spatie/laravel-permission).
 *
 * Los cuatro roles del sistema son: estudiante, empresa, vinculacion y
 * admin_tecnico. La columna guard_name se conserva aunque solo exista el guard
 * "api", porque es parte del contrato del paquete y permite migrar a Laravel sin
 * tocar los datos.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("roles", (t) => {
    t.id();
    t.string("name", 125);
    t.string("guard_name", 125);
    t.timestampsLaravel();

    t.unique(["name", "guard_name"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("roles");
}
