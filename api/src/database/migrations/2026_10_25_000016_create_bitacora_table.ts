import type { SchemaFacade } from "../../support/database/schema";

/**
 * Bitacora de acciones administrativas.
 *
 * El apartado 8.5 del diseno exige registrar aprobaciones, rechazos, bajas y
 * cambios de rol con usuario, fecha y datos anteriores y nuevos. El documento
 * no la incluia entre las catorce tablas de negocio, pero el endpoint
 * /admin/bitacora la necesita; se crea como tabla de infraestructura.
 *
 * `datos_anteriores` y `datos_nuevos` son JSON para no atar la bitacora a un
 * modelo concreto: cualquier entidad futura se puede auditar sin migracion.
 */
export async function up(schema: SchemaFacade): Promise<void> {
  await schema.create("bitacora", (t) => {
    t.id();
    t.foreignId("user_id").nullable().constrained("users").nullOnDelete();
    t.string("accion", 80).comment("aprobar_vacante, rechazar_empresa, cambio_rol...");
    t.string("entidad", 80);
    t.unsignedBigInteger("entidad_id").nullable();
    t.json("datos_anteriores").nullable();
    t.json("datos_nuevos").nullable();
    t.string("ip", 45).nullable();
    t.dateTime("creado_en").useCurrent();

    t.index(["entidad", "entidad_id"]);
    t.index(["creado_en"]);
  });
}

export async function down(schema: SchemaFacade): Promise<void> {
  await schema.dropIfExists("bitacora");
}
