import type { SchemaFacade } from "../../support/database/schema";

/**
 * Avisos internos que se muestran en la campana de la interfaz.
 *
 * El correo se dispara por el mismo evento, pero no se guarda aqui: esta tabla
 * es la copia persistente que garantiza que el usuario se entere aunque el
 * envio de correo falle.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("notificaciones", (t) => {
    t.id();
    t.foreignId("user_id").constrained("users").cascadeOnDelete();
    t.string("tipo", 40).comment("Clave del evento, por ejemplo postulacion_recibida.");
    t.string("titulo", 120);
    t.string("mensaje", 400);
    t.string("url", 200).nullable();
    t.dateTime("leida_en").nullable();
    t.dateTime("creado_en").useCurrent();

    t.index(["user_id", "leida_en"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("notificaciones");
}
