/**
 * Prepara la base exclusiva de las pruebas automatizadas.
 *
 * Antes las pruebas corrian contra `job_itm`, la base de desarrollo. Cada
 * corrida dejaba vacantes y candidaturas de prueba, y el total del buscador
 * quedaba distinto en cada ejecucion. Por eso hay una base aparte:
 * `job_itm_test`, que este script crea, migra y siembra.
 *
 *   npm run test:prepare
 *
 * Despues de correrla, `npm test` nunca toca la base de desarrollo. Solo hay
 * que volver a ejecutarla si cambian las migraciones o las semillas.
 */
process.env.DB_DATABASE = "job_itm_test";
process.env.APP_ENV = "test";

const BASE = "job_itm_test";

const { config } = await import("../src/config");
const mysql = await import("mysql2/promise");

const conexion = await mysql.createConnection({
  host: config.db.host,
  port: config.db.puerto,
  user: config.db.usuario,
  password: config.db.contrasena,
});

await conexion.query(
  `CREATE DATABASE IF NOT EXISTS \`${BASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
);
await conexion.end();
console.log(`[pruebas] base '${BASE}' lista`);

// Se importan despues de fijar DB_DATABASE para que la conexion apunte a la
// base de pruebas y no a la de desarrollo.
const { migrarDesdeCero } = await import("../src/support/database/migrator");
const { sembrar } = await import("../src/database/seeders");
const { cerrarConexion } = await import("../src/support/database/connection");

const ejecutadas = await migrarDesdeCero();
console.log(`[pruebas] ${ejecutadas.length} migracion(es) aplicadas`);

await sembrar();
console.log("[pruebas] datos iniciales cargados");

await cerrarConexion();

// Las pruebas crean sus propios datos; no hace falta sembrar los de ejemplo.
console.log("\nAhora corre: npm test");
