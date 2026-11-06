import type { SchemaFacade } from "../../support/database/schema";

/**
 * Tabla base del sistema: la cuenta de acceso.
 *
 * Estudiantes, empresas y personal de Vinculacion existen primero como usuario
 * y despues se especializan en su propia tabla. Por eso las credenciales y el
 * estado de la cuenta viven aqui y no en los perfiles.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("users", (t) => {
    t.id();
    t.string("nombre", 120);
    t.string("correo", 150).unique();
    t.string("contrasena", 255).comment("Hash bcrypt; nunca la contrasena en claro.");
    t.dateTime("correo_verificado_en").nullable();
    t.enum("estado", ["activo", "suspendido"]).default("activo");
    t.dateTime("ultimo_acceso_en").nullable();
    t.timestamps();
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("users");
}
