/**
 * Conexion unica a MySQL.
 *
 * Se expone una sola instancia de Knex para toda la aplicacion. Knex actua como
 * el query builder del proyecto: arma SQL parametrizado, administra el pool y
 * permite transacciones. Es el equivalente al Query Builder de Laravel, no a
 * Eloquent.
 */
import knex, { type Knex } from "knex";
import { config } from "../../config";

/**
 * MySQL devuelve TINYINT(1) como numero y las columnas DECIMAL como texto.
 * Aqui se corrigen los dos casos en el origen para que el resto del codigo no
 * tenga que acordarse de convertirlos.
 */
const conexion = {
  host: config.db.host,
  port: config.db.puerto,
  user: config.db.usuario,
  password: config.db.contrasena,
  database: config.db.base,
  charset: "utf8mb4",
  timezone: "Z",
  // Las columnas DATE viajan como texto "AAAA-MM-DD" para no arrastrar zona
  // horaria: una fecha de cierre no es un instante, es un dia.
  dateStrings: ["DATE"],
  typeCast(field: { type: string; length: number; string(): string | null }, next: () => unknown) {
    if (field.type === "TINY" && field.length === 1) {
      const valor = field.string();
      return valor === null ? null : valor === "1";
    }
    return next();
  },
};

export const db: Knex = knex({
  client: "mysql2",
  connection: conexion as unknown as Knex.StaticConnectionConfig,
  pool: {
    min: config.db.poolMin,
    max: config.db.poolMax,
    /**
     * MySQL calcula CURRENT_TIMESTAMP con la zona horaria de su sesion. Si esa
     * zona es la del sistema operativo y el driver interpreta los DATETIME como
     * UTC (opcion `timezone: "Z"`), los valores que pone MySQL por omision
     * quedan corridos respecto a los que escribe Node.
     *
     * Se fija la sesion en UTC para que ambas fuentes coincidan y toda la base
     * hable en la misma unidad de tiempo, como pide el apartado 5.1.
     */
    afterCreate(conexion: { query: (sql: string, cb: (error: Error | null) => void) => void }, hecho: (error: Error | null, conexion: unknown) => void) {
      conexion.query("SET time_zone = '+00:00'", (error) => hecho(error, conexion));
    },
  },
  migrations: {
    tableName: "migrations",
  },
});

/** Cierra el pool. Se usa al terminar un comando de consola o al apagar el servidor. */
export async function cerrarConexion(): Promise<void> {
  await db.destroy();
}
