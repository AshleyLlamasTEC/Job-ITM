import type { SchemaFacade } from "../../support/database/schema";

/**
 * Tokens de acceso (equivalente a la tabla de Laravel Sanctum).
 *
 * El diseno habla de "Sanctum emite un token por dispositivo". Esta tabla
 * reproduce su estructura exacta: tokenable_type/tokenable_id identifican al
 * usuario, `token` guarda el hash SHA-256 (nunca el valor en claro) y
 * `abilities` queda para permisos por token.
 *
 * Es una tabla de infraestructura, no de negocio: no cuenta entre las catorce
 * del diccionario de datos.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("personal_access_tokens", (t) => {
    t.id();
    t.string("tokenable_type", 255);
    t.unsignedBigInteger("tokenable_id");
    t.string("name", 255);
    t.string("token", 64).unique();
    t.text("abilities").nullable();
    t.timestamp("last_used_at").nullable();
    t.timestamp("expires_at").nullable();
    t.timestampsLaravel();

    t.index(["tokenable_type", "tokenable_id"], "personal_access_tokens_tokenable_type_tokenable_id_index");
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("personal_access_tokens");
}
