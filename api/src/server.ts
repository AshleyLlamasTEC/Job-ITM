/**
 * Punto de entrada del servidor.
 *
 *   npm run dev     reinicia al guardar (tsx watch)
 *   npm start       modo normal
 *
 * Al recibir SIGINT o SIGTERM se deja de aceptar peticiones, se cierra el pool
 * de MySQL y recien entonces termina el proceso: asi no se cortan transacciones
 * a medias.
 */
import { crearAplicacion } from "./bootstrap/app";
import { config } from "./config";
import { cerrarConexion, db } from "./support/database/connection";

async function principal(): Promise<void> {
  // Se comprueba la base al arrancar para no descubrir que falta en la primera
  // peticion del usuario.
  try {
    await db.raw("SELECT 1");
  } catch (error) {
    console.error("[arranque] No se pudo conectar a MySQL:", (error as Error).message);
    console.error("  Revisa DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME y DB_PASSWORD en api/.env");
    process.exitCode = 1;
    return;
  }

  const app = crearAplicacion();
  const servidor = app.listen(config.app.puerto, () => {
    console.log("");
    console.log(`  ${config.app.nombre}  (${config.app.entorno})`);
    console.log(`  API   ${config.app.url}/api/v1`);
    console.log(`  Salud ${config.app.url}/salud`);
    console.log(`  Base  ${config.db.base} en ${config.db.host}:${config.db.puerto}`);
    console.log("");
  });

  const apagar = (senal: string) => {
    console.log(`\n[${senal}] Cerrando el servidor...`);
    servidor.close(async () => {
      await cerrarConexion();
      console.log("[apagado] Listo.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => apagar("SIGINT"));
  process.on("SIGTERM", () => apagar("SIGTERM"));
}

principal().catch((error: unknown) => {
  console.error("[arranque] Error fatal:", error);
  process.exitCode = 1;
});
