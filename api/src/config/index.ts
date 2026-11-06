/**
 * Configuracion de la aplicacion.
 *
 * Lee las variables de entorno una sola vez y las expone tipadas. Ningun otro
 * archivo debe leer process.env directamente: si un valor falta o tiene un tipo
 * incorrecto, el error debe aparecer aqui y no a mitad de una peticion.
 */
import { config as cargarEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const rutaEnv = resolve(process.cwd(), ".env");
if (existsSync(rutaEnv)) {
  cargarEnv({ path: rutaEnv });
}

function texto(clave: string, porDefecto = ""): string {
  const valor = process.env[clave];
  return valor === undefined || valor === "" ? porDefecto : valor;
}

function numero(clave: string, porDefecto: number): number {
  const valor = process.env[clave];
  if (valor === undefined || valor === "") return porDefecto;
  const n = Number(valor);
  if (Number.isNaN(n)) {
    throw new Error(`La variable de entorno ${clave} debe ser numerica y vale "${valor}".`);
  }
  return n;
}

function lista(clave: string, porDefecto: string[] = []): string[] {
  const valor = texto(clave);
  if (!valor) return porDefecto;
  return valor
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const config = {
  app: {
    nombre: texto("APP_NAME", "Job ITM"),
    entorno: texto("APP_ENV", "local"),
    clave: texto("APP_KEY"),
    url: texto("APP_URL", "http://localhost:3000"),
    zonaHoraria: texto("APP_TIMEZONE", "America/Tijuana"),
    puerto: numero("APP_PORT", 3000),
    esProduccion: texto("APP_ENV", "local") === "production",
  },

  db: {
    host: texto("DB_HOST", "127.0.0.1"),
    puerto: numero("DB_PORT", 3306),
    base: texto("DB_DATABASE", "job_itm"),
    usuario: texto("DB_USERNAME", "root"),
    contrasena: texto("DB_PASSWORD"),
    poolMin: 2,
    poolMax: 10,
  },

  auth: {
    diasToken: numero("AUTH_TOKEN_TTL_DAYS", 30),
    maxIntentos: numero("AUTH_MAX_INTENTOS", 5),
    minutosBloqueo: numero("AUTH_BLOQUEO_MINUTOS", 15),
    horasVerificacion: numero("AUTH_VERIFICACION_HORAS", 24),
    minutosReset: numero("AUTH_RESET_MINUTOS", 60),
  },

  cors: {
    origenes: lista("CORS_ORIGINS", ["http://localhost:5173"]),
  },

  mail: {
    driver: texto("MAIL_DRIVER", "log"),
    remitenteCorreo: texto("MAIL_FROM_ADDRESS", "no-reply@itmexicali.edu.mx"),
    remitenteNombre: texto("MAIL_FROM_NAME", "Job ITM"),
    host: texto("MAIL_HOST"),
    puerto: numero("MAIL_PORT", 587),
    usuario: texto("MAIL_USERNAME"),
    contrasena: texto("MAIL_PASSWORD"),
  },

  archivos: {
    cvMaxMb: numero("FILES_CV_MAX_MB", 5),
  },
} as const;

export type Config = typeof config;
