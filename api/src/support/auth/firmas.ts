/**
 * Enlaces firmados.
 *
 * El correo de verificacion y el de restablecimiento de contrasena llevan un
 * enlace que solo el servidor puede producir. La firma es un HMAC-SHA256 con la
 * APP_KEY sobre `usuario|expiracion`, de modo que no hace falta guardar el token
 * en la base: si la firma cuadra y no ha vencido, el enlace es legitimo.
 *
 * Es el mismo enfoque de las URLs firmadas de Laravel, y evita una tabla extra
 * para tokens de un solo uso.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

import { config } from "../../config";

function clave(): string {
  const valor = config.app.clave;
  if (!valor) {
    throw new Error("APP_KEY no esta configurada. Ejecuta: npm run artisan -- key:generate");
  }
  return valor;
}

function calcular(usuarioId: number, expira: number): string {
  return createHmac("sha256", clave()).update(`${usuarioId}|${expira}`).digest("hex");
}

export interface Firma {
  expira: number;
  firma: string;
}

/** Genera una firma que vence en `minutos`. */
export function firmar(usuarioId: number, minutos: number): Firma {
  const expira = Math.floor(Date.now() / 1000) + minutos * 60;
  return { expira, firma: calcular(usuarioId, expira) };
}

/** Comprueba la firma y su vigencia en tiempo constante. */
export function verificarFirma(usuarioId: number, expira: number, firma: string): boolean {
  if (!Number.isInteger(usuarioId) || !Number.isInteger(expira)) return false;
  if (expira < Math.floor(Date.now() / 1000)) return false;

  const esperada = Buffer.from(calcular(usuarioId, expira), "utf8");
  const recibida = Buffer.from(firma ?? "", "utf8");
  if (esperada.length !== recibida.length) return false;

  return timingSafeEqual(esperada, recibida);
}

// ---------------------------------------------------------------------------
// URLs firmadas
// ---------------------------------------------------------------------------

/**
 * Firma un recurso arbitrario (por ejemplo `cv:12`) para descargarlo sin sesion.
 *
 * Es el equivalente a `URL::temporarySignedRoute` de Laravel: el enlace vence a
 * los pocos minutos y solo el servidor puede generarlo. Se usa para los
 * curriculums y los logos, que nunca se sirven desde una carpeta publica.
 */
export function firmarRecurso(recurso: string, minutos: number): Firma {
  const expira = Math.floor(Date.now() / 1000) + minutos * 60;
  return { expira, firma: calcularTexto(recurso, expira) };
}

export function verificarRecurso(recurso: string, expira: number, firma: string): boolean {
  if (!Number.isInteger(expira)) return false;
  if (expira < Math.floor(Date.now() / 1000)) return false;

  const esperada = Buffer.from(calcularTexto(recurso, expira), "utf8");
  const recibida = Buffer.from(firma ?? "", "utf8");
  if (esperada.length !== recibida.length) return false;

  return timingSafeEqual(esperada, recibida);
}

function calcularTexto(recurso: string, expira: number): string {
  return createHmac("sha256", clave()).update(`${recurso}|${expira}`).digest("hex");
}
