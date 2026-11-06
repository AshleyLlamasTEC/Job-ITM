/**
 * Migrador.
 *
 * Equivalente a `php artisan migrate`. Lee los archivos de src/database/migrations
 * en orden alfabetico (por eso el nombre empieza con la fecha), ejecuta los que
 * no estan registrados y anota cada uno en la tabla `migrations` con su lote.
 *
 * La tabla `migrations` tiene exactamente la estructura que crea Laravel:
 *   id (int unsigned, autoincremental), migration (varchar 255), batch (int)
 *
 * Gracias a eso, el mismo esquema puede ser administrado despues por Laravel sin
 * ningun paso intermedio: reconoceria sus propias migraciones como aplicadas.
 */
import { readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { db } from "./connection";
import type { SchemaFacade } from "./schema";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const DIR_MIGRACIONES = join(AQUI, "..", "..", "database", "migrations");

export interface Migracion {
  nombre: string;
  archivo: string;
  up(schema: SchemaFacade): Promise<void>;
  down(schema: SchemaFacade): Promise<void>;
}

export interface EstadoMigracion {
  nombre: string;
  lote: number | null;
  aplicada: boolean;
}

/** Crea la tabla de control si no existe. Idempotente. */
async function asegurarTabla(): Promise<void> {
  const existe = await db.schema.hasTable("migrations");
  if (existe) return;

  await db.schema.createTable("migrations", (t) => {
    t.increments("id");
    t.string("migration", 255).notNullable();
    t.integer("batch").notNullable();
  });
}

/** Lista los archivos de migracion ordenados como los ejecutaria Laravel. */
export async function listarArchivos(): Promise<string[]> {
  const archivos = await readdir(DIR_MIGRACIONES);
  return archivos.filter((a) => a.endsWith(".ts") || a.endsWith(".js")).sort();
}

function nombreLogico(archivo: string): string {
  return basename(archivo).replace(/\.(ts|js)$/, "");
}

async function cargar(archivo: string): Promise<Migracion> {
  const ruta = pathToFileURL(join(DIR_MIGRACIONES, archivo)).href;
  const modulo = (await import(ruta)) as Partial<Migracion>;
  if (typeof modulo.up !== "function" || typeof modulo.down !== "function") {
    throw new Error(`La migracion ${archivo} debe exportar las funciones up() y down().`);
  }
  return {
    nombre: nombreLogico(archivo),
    archivo,
    up: modulo.up.bind(modulo),
    down: modulo.down.bind(modulo),
  };
}

async function loteActual(): Promise<number> {
  const fila = await db("migrations").max<{ maximo: number | null }>("batch as maximo").first();
  return Number(fila?.maximo ?? 0);
}

async function aplicadas(): Promise<Map<string, number>> {
  const filas = await db("migrations").select<{ migration: string; batch: number }[]>("migration", "batch");
  return new Map(filas.map((f) => [f.migration, f.batch]));
}

/** Ejecuta todas las migraciones pendientes. */
export async function migrar(): Promise<string[]> {
  await asegurarTabla();

  const { Schema } = await import("./schema");
  const yaAplicadas = await aplicadas();
  const archivos = await listarArchivos();
  const lote = (await loteActual()) + 1;
  const ejecutadas: string[] = [];

  for (const archivo of archivos) {
    const nombre = nombreLogico(archivo);
    if (yaAplicadas.has(nombre)) continue;

    const migracion = await cargar(archivo);
    process.stdout.write(`  → ${nombre} ... `);
    await migracion.up(Schema);
    await db("migrations").insert({ migration: nombre, batch: lote });
    process.stdout.write("listo\n");
    ejecutadas.push(nombre);
  }

  return ejecutadas;
}

/** Revierte el ultimo lote (o los ultimos N lotes). */
export async function revertir(pasos = 1): Promise<string[]> {
  await asegurarTabla();

  const { Schema } = await import("./schema");
  const lotes = await db("migrations")
    .distinct<{ batch: number }[]>("batch")
    .orderBy("batch", "desc")
    .limit(pasos);

  if (lotes.length === 0) return [];

  const numeros = lotes.map((l) => l.batch);
  const pendientes = await db("migrations")
    .whereIn("batch", numeros)
    .orderBy("batch", "desc")
    .orderBy("id", "desc")
    .select<{ migration: string }[]>("migration");

  const revertidas: string[] = [];
  for (const fila of pendientes) {
    const archivo = `${fila.migration}.ts`;
    const migracion = await cargar(archivo);
    process.stdout.write(`  ← ${migracion.nombre} ... `);
    await migracion.down(Schema);
    await db("migrations").where({ migration: fila.migration }).delete();
    process.stdout.write("revertida\n");
    revertidas.push(migracion.nombre);
  }

  return revertidas;
}

/** Borra todas las tablas y vuelve a migrar desde cero. */
export async function migrarDesdeCero(): Promise<string[]> {
  const { Schema } = await import("./schema");
  const tablas = await db.raw("SHOW TABLES");
  const lista: string[] = (tablas[0] as Record<string, string>[]).map((fila) => Object.values(fila)[0]);

  await Schema.sinLlavesForaneas(async () => {
    for (const tabla of lista) {
      await Schema.dropIfExists(tabla);
    }
  });

  return migrar();
}

/** Estado de cada migracion, para `artisan migrate:status`. */
export async function estado(): Promise<EstadoMigracion[]> {
  await asegurarTabla();
  const yaAplicadas = await aplicadas();
  const archivos = await listarArchivos();

  return archivos.map((archivo) => {
    const nombre = nombreLogico(archivo);
    const lote = yaAplicadas.get(nombre) ?? null;
    return { nombre, lote, aplicada: lote !== null };
  });
}
