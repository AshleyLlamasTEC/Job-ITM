#!/usr/bin/env node
/**
 * Consola de la aplicacion (equivalente a `php artisan`).
 *
 *   npm run artisan -- migrate
 *   npm run artisan -- migrate:rollback --pasos=2
 *   npm run artisan -- migrate:fresh
 *   npm run artisan -- migrate:status
 *   npm run artisan -- db:seed
 *   npm run artisan -- key:generate
 *   npm run artisan -- schedule:run
 */
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { config } from "./src/config";
import { cerrarConexion, db } from "./src/support/database/connection";
import { estado, migrar, migrarDesdeCero, revertir } from "./src/support/database/migrator";

type Argumentos = Record<string, string>;

function leerArgumentos(argv: string[]): Argumentos {
  const args: Argumentos = {};
  for (const trozo of argv) {
    if (!trozo.startsWith("--")) continue;
    const [clave, valor = "true"] = trozo.slice(2).split("=");
    args[clave] = valor;
  }
  return args;
}

const COLOR = {
  gris: "\u001b[90m",
  verde: "\u001b[32m",
  amarillo: "\u001b[33m",
  rojo: "\u001b[31m",
  cian: "\u001b[36m",
  fin: "\u001b[0m",
};

function titulo(texto: string): void {
  console.log(`\n${COLOR.cian}${texto}${COLOR.fin}`);
}

const comandos: Record<string, (args: Argumentos) => Promise<void>> = {
  async migrate() {
    titulo("Ejecutando migraciones");
    const ejecutadas = await migrar();
    if (ejecutadas.length === 0) {
      console.log(`${COLOR.gris}  Nada que migrar: el esquema ya esta al dia.${COLOR.fin}`);
    } else {
      console.log(`${COLOR.verde}  ${ejecutadas.length} migracion(es) aplicadas.${COLOR.fin}`);
    }
  },

  async "migrate:rollback"(args) {
    const pasos = Number(args.pasos ?? 1);
    titulo(`Revirtiendo ${pasos} lote(s)`);
    const revertidas = await revertir(pasos);
    if (revertidas.length === 0) {
      console.log(`${COLOR.gris}  No hay nada que revertir.${COLOR.fin}`);
    } else {
      console.log(`${COLOR.verde}  ${revertidas.length} migracion(es) revertidas.${COLOR.fin}`);
    }
  },

  async "migrate:fresh"() {
    titulo("Borrando el esquema y migrando desde cero");
    const ejecutadas = await migrarDesdeCero();
    console.log(`${COLOR.verde}  ${ejecutadas.length} migracion(es) aplicadas sobre una base limpia.${COLOR.fin}`);
  },

  async "migrate:status"() {
    titulo("Estado de las migraciones");
    const filas = await estado();
    const ancho = Math.max(...filas.map((f) => f.nombre.length), 10);
    for (const fila of filas) {
      const marca = fila.aplicada ? `${COLOR.verde}SI${COLOR.fin}` : `${COLOR.amarillo}NO${COLOR.fin}`;
      const lote = fila.lote === null ? "-" : String(fila.lote);
      console.log(`  ${marca}  ${fila.nombre.padEnd(ancho)}  lote ${lote}`);
    }
    const pendientes = filas.filter((f) => !f.aplicada).length;
    console.log(
      `\n  ${filas.length} migraciones, ${filas.length - pendientes} aplicadas, ${pendientes} pendientes.`,
    );
  },

  async "db:seed"(args) {
    titulo("Cargando datos iniciales");
    const { sembrar } = await import("./src/database/seeders/index");
    const clase = args.class;
    await sembrar(clase);
    console.log(`${COLOR.verde}  Datos iniciales cargados.${COLOR.fin}`);
  },

  async "key:generate"() {
    const ruta = resolve(process.cwd(), ".env");
    const contenido = await readFile(ruta, "utf8");
    const clave = randomBytes(32).toString("base64");
    const actualizado = /^APP_KEY=.*$/m.test(contenido)
      ? contenido.replace(/^APP_KEY=.*$/m, `APP_KEY=${clave}`)
      : `${contenido}\nAPP_KEY=${clave}\n`;
    await writeFile(ruta, actualizado, "utf8");
    console.log(`${COLOR.verde}  APP_KEY generada.${COLOR.fin}`);
  },

  async "schedule:run"() {
    titulo("Ejecutando tareas programadas");
    const { ejecutarTareas } = await import("./src/console/schedule");
    await ejecutarTareas();
  },

  async about() {
    const [fila] = (await db.raw("SELECT VERSION() AS version")) as unknown as [{ version: string }[]];
    console.log(`\n  ${config.app.nombre}  (${config.app.entorno})`);
    console.log(`  Node ${process.version}`);
    console.log(`  MySQL ${fila[0]?.version}`);
    console.log(`  Base de datos: ${config.db.base}`);
    console.log(`  API: ${config.app.url}/api/v1\n`);
  },
};

async function principal(): Promise<void> {
  const [, , comando = "about", ...resto] = process.argv;
  const args = leerArgumentos(resto);

  if (comando === "list" || comando === "help" || comando === "--help") {
    console.log("\nComandos disponibles:\n");
    for (const nombre of Object.keys(comandos)) console.log(`  ${nombre}`);
    console.log("");
    return;
  }

  const ejecutar = comandos[comando];
  if (!ejecutar) {
    console.error(`${COLOR.rojo}  El comando "${comando}" no existe.${COLOR.fin}`);
    console.error(`  Prueba con: npm run artisan -- list\n`);
    process.exitCode = 1;
    return;
  }

  await ejecutar(args);
}

principal()
  .catch((error: unknown) => {
    console.error(`\n${COLOR.rojo}  ${(error as Error).message}${COLOR.fin}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cerrarConexion();
  });
