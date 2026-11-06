/**
 * Respaldo y restauración (apartado 8.5 del documento).
 *
 *   npm run backup                         crea un respaldo (base + archivos)
 *   npm run backup -- --list               muestra los respaldos disponibles
 *   npm run backup -- --restaurar=<archivo> [--quedarse]
 *
 * Qué se respalda:
 *
 *   1. La base de datos, con mysqldump, preservando rutinas, disparadores y
 *      codificación utf8mb4. Se guarda en storage/backups/AAAA-MM-DD_HHMMSS.sql.
 *   2. Los archivos privados de storage/ (curriculum, logos), en una carpeta
 *      con el mismo sello de fecha.
 *
 * Los respaldos se conservan siete días (requisito del documento) y los
 * anteriores se borran automáticamente salvo `--conservar-todos`.
 *
 * La restauración es la parte que el diseño exige *probar* al menos una vez
 * antes del arranque: `--restaurar` recrea una copia con un nombre nuevo,
 * compara los conteos y demuestra que el respaldo sirve. Nunca pisa la base
 * viva.
 *
 * Las credenciales se leen de las variables de entorno (.env); la contraseña
 * viaja como MYSQL_PWD, nunca en la línea de comandos. Si MySQL no está en
 * PATH, apunta a los binarios con MYSQLDUMP_PATH y MYSQL_PATH.
 */
process.env.APP_ENV = process.env.APP_ENV ?? "production";
process.env.DB_DATABASE = process.env.DB_DATABASE ?? "job_itm";

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { join, extname, resolve } from "node:path";
const { config } = await import("../src/config");

const RAIZ = resolve(process.cwd(), "backups");
const DIAS_RETENCION = 7;

const R = {
  respaldar: process.argv.includes("--respaldar") || process.argv.length === 2,
  listar: process.argv.includes("--list"),
  restaurar: process.argv.find((a) => a.startsWith("--restaurar=")),
  quedarse: process.argv.includes("--quedarse"),
  conservarTodos: process.argv.includes("--conservar-todos"),
};

function ahoraSello(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function binario(nombre: string): string {
  const variable = nombre === "MYSQLDUMP" ? "MYSQLDUMP_PATH" : "MYSQL_PATH";
  const deEntorno = process.env[variable];
  if (deEntorno && existsSync(deEntorno)) return deEntorno;
  const windowsComun = join("C:", "Program Files", "MySQL", "MySQL Server 8.0", "bin", `${nombre}.exe`);
  if (process.platform === "win32" && existsSync(windowsComun)) return windowsComun;
  return nombre; // confia en el PATH
}

const MYSQLDUMP = binario("MYSQLDUMP");
const MYSQL = binario("MYSQL");

// ---------------------------------------------------------------------------
// Respaldo
// ---------------------------------------------------------------------------

function mysqldump(args: string[], salida: string): Promise<void> {
  return new Promise((hecho, fallo) => {
    const destino = { ENV_WRAP: { MYSQL_PWD: config.db.contrasena } };
    const env = { ...process.env, ...destino.ENV_WRAP };
    const hijo = spawn(
      MYSQLDUMP,
      [
        `--host=${config.db.host}`,
        `--port=${config.db.puerto}`,
        `--user=${config.db.usuario}`,
        "--default-character-set=utf8mb4",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
        "--add-drop-table",
        config.db.base,
      ],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );

    const contenido: Buffer[] = [];
    hijo.stdout.on("data", (trozos) => contenido.push(trozos));
    hijo.stderr.on("data", (trozos) => process.stderr.write(trozos));
    hijo.on("error", fallo);
    hijo.on("exit", (codigo) => {
      if (codigo !== 0) return fallo(new Error(`mysqldump salio con ${codigo}`));
      writeFileSync(salida, Buffer.concat(contenido));
      hecho();
    });
  });
}

async function respaldar(): Promise<void> {
  mkdirSync(RAIZ, { recursive: true });
  const sello = ahoraSello();
  const archivo = join(RAIZ, `${sello}.sql`);

  await mysqldump([], archivo);
  const bytes = statSync(archivo).size;

  // Archivos privados: copia literal completa del directorio storage
  const almacenamiento = resolve(process.cwd(), "storage");
  const destino = join(RAIZ, `${sello}-storage`);
  if (existsSync(almacenamiento)) {
    cpSync(almacenamiento, destino, { recursive: true });
    console.log(`respaldo | storage: ${destino}`);
  }

  console.log(`respaldo | base: ${archivo} (${Math.round(bytes / 1024)} KB)`);

  // Retencion de siete dias, como pide el documento.
  if (!R.conservarTodos) {
    const limite = Date.now() - DIAS_RETENCION * 24 * 60 * 60 * 1000;
    for (const nombre of readdirSync(RAIZ)) {
      const ruta = join(RAIZ, nombre);
      if (statSync(ruta).mtimeMs < limite) {
        rmSync(ruta, { recursive: true, force: true });
        console.log(`respaldo | borrado por retencion: ${nombre}`);
      }
    }
  }

  console.log("respaldo | completo: base + storage");
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

function listar(): void {
  if (!existsSync(RAIZ)) {
    console.log("respaldo | no hay respaldos todavia.");
    return;
  }
  for (const nombre of readdirSync(RAIZ).sort().reverse()) {
    const ruta = join(RAIZ, nombre);
    const stat = statSync(ruta);
    const tipo = stat.isFile() && extname(nombre) === ".sql" ? "base" : "storage";
    const tam = stat.isFile() ? `${Math.round(stat.size / 1024)} KB` : "directorio";
    console.log(`  ${nombre.padEnd(30)} ${tipo.padEnd(8)} ${tam}`);
  }
}

// ---------------------------------------------------------------------------
// Restauracion (prueba exigida por el documento)
// ---------------------------------------------------------------------------

async function restaurar(archivo: string): Promise<void> {
  const nombreArchivo = resolve(process.cwd(), archivo);
  if (!existsSync(nombreArchivo)) {
    throw new Error(`El respaldo no existe: ${nombreArchivo}`);
  }

  const scratch = `${config.db.base}_restauracion_${Date.now()}`;
  console.log(`respaldo | creando base de restauracion: ${scratch}`);

  const crear = spawnSync(
    MYSQL,
    [`--host=${config.db.host}`, `--port=${config.db.puerto}`, `--user=${config.db.usuario}`,
      `-e`, `CREATE DATABASE \`${scratch}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`],
    { env: { ...process.env, MYSQL_PWD: config.db.contrasena } },
  );
  if (crear.status !== 0) {
    throw new Error(`No se pudo crear la base de restauracion: ${String(crear.stderr)}`);
  }

  console.log("respaldo | cargando el respaldo en la copia...");
  const carga = spawnSync(
    MYSQL,
    [`--host=${config.db.host}`, `--port=${config.db.puerto}`, `--user=${config.db.usuario}`,
      "--default-character-set=utf8mb4", scratch],
    {
      env: { ...process.env, MYSQL_PWD: config.db.contrasena },
      input: readFileSync(nombreArchivo),
    },
  );
  if (carga.status !== 0) {
    throw new Error(`La restauracion fallo: ${String(carga.stderr)}`);
  }

  // Comparacion: mismos conteos en las tablas de negocio.
  const { db, cerrarConexion } = await import("../src/support/database/connection");
  const tablas = ["users", "estudiantes", "empresas", "vacantes", "postulaciones", "notificaciones", "reportes", "bitacora"];
  const conteo = async (base: string): Promise<Record<string, number>> => {
    const salida: Record<string, number> = {};
    for (const tabla of tablas) {
      const fila = await db(`${base}.${tabla}`).count({ total: "*" }).first();
      salida[tabla] = Number((fila as { total: string | number }).total);
    }
    return salida;
  };

  const original = await conteo(config.db.base);
  const restaurada = await conteo(scratch);

  const filas = tablas.map(
    (tabla) =>
      `  ${tabla.padEnd(16)} original=${original[tabla]}  restaurada=${restaurada[tabla]}  ${
        original[tabla] === restaurada[tabla] ? "OK" : "DIFIERE"
      }`,
  );
  console.log("respaldo | comparacion de conteos:\n" + filas.join("\n"));

  const todoOk = tablas.every((tabla) => original[tabla] === restaurada[tabla]);

  if (!R.quedarse) {
    const borrar = spawnSync(
      MYSQL,
      [`--host=${config.db.host}`, `--port=${config.db.puerto}`, `--user=${config.db.usuario}`,
        `-e`, `DROP DATABASE \`${scratch}\``],
      { env: { ...process.env, MYSQL_PWD: config.db.contrasena } },
    );
    if (borrar.status !== 0) console.error(`respaldo | no se pudo borrar ${scratch}; borrala a mano.`);
    else console.log(`respaldo | base de restauracion ${scratch} borrada.`);
  } else {
    console.log(`respaldo | la copia restaurada se queda en ${scratch}; revisala y borrala.`);
  }

  await cerrarConexion();

  if (!todoOk) {
    process.exitCode = 1;
    console.error("respaldo | FALLO: los conteos difieren; el respaldo no es confiable.");
  } else {
    console.log("respaldo | restauracion verificada; el respaldo es usable.");
  }
}

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------

if (R.listar) {
  listar();
} else if (R.restaurar) {
  await restaurar(R.restaurar.slice("--restaurar=".length));
} else if (R.respaldar) {
  await respaldar();
} else {
  console.log(`uso: npm run backup [--list] [--restaurar=<archivo>] [--quedarse] [--conservar-todos]`);
}
