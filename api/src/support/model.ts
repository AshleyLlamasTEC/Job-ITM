/**
 * Modelo base.
 *
 * No es un ORM completo: es una capa delgada sobre el query builder que aporta
 * lo que hace falta para que el codigo se lea como en Laravel (tabla, llave,
 * marcas de tiempo, campos ocultos y conversiones de tipos) sin esconder el SQL.
 *
 * Cada modelo declara su tabla y, si lo necesita, sus conversiones. Las
 * consultas concretas viven en los repositorios o en los servicios, no aqui.
 */
import type { Knex } from "knex";

import { db } from "./database/connection";
import { NoEncontrado } from "./http/errors";

export type Registro = Record<string, any>;
export type Conversion = "booleano" | "entero" | "decimal" | "json";

export class Modelo {
  static tabla = "";
  static llave = "id";
  static usaTimestamps = true;
  static campoCreado = "creado_en";
  static campoActualizado = "actualizado_en";
  static ocultos: string[] = [];
  static conversiones: Record<string, Conversion> = {};

  /** Constructor de consultas sobre la tabla del modelo. */
  static q(trx?: Knex.Transaction): Knex.QueryBuilder {
    const conexion = trx ?? db;
    return conexion(this.tabla);
  }

  static nombreEntidad(): string {
    return this.tabla.replace(/_/g, " ");
  }

  static async buscar<T = Registro>(id: number | string, trx?: Knex.Transaction): Promise<T | undefined> {
    return (await this.q(trx).where(this.llave, id).first()) as T | undefined;
  }

  static async buscarOError<T = Registro>(id: number | string, trx?: Knex.Transaction): Promise<T> {
    const fila = await this.buscar<T>(id, trx);
    if (!fila) throw new NoEncontrado(`No se encontro el registro en ${this.nombreEntidad()}.`);
    return fila;
  }

  static async todos<T = Registro>(trx?: Knex.Transaction): Promise<T[]> {
    return (await this.q(trx).select("*")) as T[];
  }

  static async crear(datos: Registro, trx?: Knex.Transaction): Promise<number> {
    const fila: Registro = { ...datos };
    if (this.usaTimestamps) {
      const ahora = new Date();
      fila[this.campoCreado] ??= ahora;
      fila[this.campoActualizado] ??= ahora;
    }
    const [id] = await this.q(trx).insert(fila);
    return Number(id);
  }

  static async actualizar(id: number | string, datos: Registro, trx?: Knex.Transaction): Promise<number> {
    const fila: Registro = { ...datos };
    if (this.usaTimestamps) fila[this.campoActualizado] = new Date();
    return this.q(trx).where(this.llave, id).update(fila);
  }

  static async borrar(id: number | string, trx?: Knex.Transaction): Promise<number> {
    return this.q(trx).where(this.llave, id).delete();
  }

  /** Cuenta los registros de una consulta sin arrastrar el orden ni los limites. */
  static async contar(consulta: Knex.QueryBuilder): Promise<number> {
    const fila = await consulta
      .clone()
      .clear("select")
      .clear("order")
      .clear("limit")
      .clear("offset")
      .count({ total: "*" })
      .first();
    return Number((fila as { total?: string | number } | undefined)?.total ?? 0);
  }

  /** Aplica las conversiones declaradas y quita los campos ocultos. */
  static presentar<T extends Registro | undefined>(fila: T): T {
    if (!fila) return fila;
    const salida: Registro = { ...fila };

    for (const [campo, tipo] of Object.entries(this.conversiones)) {
      const valor = salida[campo];
      if (valor === null || valor === undefined) continue;
      switch (tipo) {
        case "booleano":
          salida[campo] = Boolean(Number(valor));
          break;
        case "entero":
          salida[campo] = Number(valor);
          break;
        case "decimal":
          salida[campo] = Number(valor);
          break;
        case "json":
          salida[campo] = typeof valor === "string" ? JSON.parse(valor) : valor;
          break;
      }
    }

    for (const campo of this.ocultos) delete salida[campo];
    return salida as T;
  }

  /** Presenta una lista completa. */
  static presentarLista<T extends Registro>(filas: T[]): T[] {
    return filas.map((fila) => this.presentar(fila));
  }
}
