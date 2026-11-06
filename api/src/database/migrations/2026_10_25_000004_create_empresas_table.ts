import type { SchemaFacade } from "../../support/database/schema";

/**
 * Organizacion que publica vacantes.
 *
 * Relacion uno a uno con users. El RFC es unico para evitar registrar dos veces
 * a la misma organizacion. Mientras `estatus_validacion` sea pendiente, la
 * empresa no puede publicar: esa es la primera barrera de calidad del portal.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("empresas", (t) => {
    t.id();
    t.foreignId("user_id").constrained("users").cascadeOnDelete();
    t.string("razon_social", 160);
    t.string("rfc", 13).unique();
    t.string("giro", 80);
    t.string("sitio_web", 120).nullable();
    t.string("telefono", 15);
    t.string("contacto_nombre", 120);
    t.string("contacto_correo", 150);
    t.string("logo_ruta", 255).nullable();
    t.enum("estatus_validacion", ["pendiente", "aprobada", "rechazada"]).default("pendiente");
    t.string("motivo_rechazo", 255).nullable();
    t.foreignId("validado_por").nullable().constrained("users").nullOnDelete();
    t.dateTime("validado_en").nullable();
    t.timestamps();

    t.unique("user_id");
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("empresas");
}
