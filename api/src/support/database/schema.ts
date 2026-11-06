/**
 * Fachada Schema.
 *
 * Es el punto de entrada que usan las migraciones. Mantiene la misma forma que
 * la de Laravel (Schema::create, Schema::table, Schema::dropIfExists) para que
 * el archivo de migracion se pueda leer y portar sin traduccion mental.
 */
import { Blueprint } from "./blueprint";
import { db } from "./connection";

export type SchemaFacade = typeof Schema;

export const Schema = {
  /** Crea una tabla nueva. */
  async create(tabla: string, definicion: (t: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint();
    definicion(blueprint);
    await db.schema.createTable(tabla, (constructor) => blueprint.compilar(constructor));
  },

  /** Modifica una tabla existente (agregar columnas, indices o llaves). */
  async table(tabla: string, definicion: (t: Blueprint) => void): Promise<void> {
    const blueprint = new Blueprint();
    definicion(blueprint);
    await db.schema.alterTable(tabla, (constructor) => blueprint.compilar(constructor, true));
  },

  async dropIfExists(tabla: string): Promise<void> {
    await db.schema.dropTableIfExists(tabla);
  },

  async drop(tabla: string): Promise<void> {
    await db.schema.dropTable(tabla);
  },

  async hasTable(tabla: string): Promise<boolean> {
    return db.schema.hasTable(tabla);
  },

  async hasColumn(tabla: string, columna: string): Promise<boolean> {
    return db.schema.hasColumn(tabla, columna);
  },

  async renameTable(desde: string, hasta: string): Promise<void> {
    await db.schema.renameTable(desde, hasta);
  },

  /** Desactiva la revision de llaves foraneas. Solo para migrate:fresh y pruebas. */
  async sinLlavesForaneas<T>(accion: () => Promise<T>): Promise<T> {
    await db.raw("SET FOREIGN_KEY_CHECKS = 0");
    try {
      return await accion();
    } finally {
      await db.raw("SET FOREIGN_KEY_CHECKS = 1");
    }
  },
};
