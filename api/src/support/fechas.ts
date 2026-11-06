/**
 * Fechas de la aplicacion.
 *
 * MySQL guarda DATETIME en UTC y la API los devuelve en ISO 8601 con Z, como
 * pide el apartado 5.1. Pero "hoy" para una persona en Mexicali no es el mismo
 * dia que en UTC a partir de las 17:00: si se comparara contra la fecha UTC, una
 * vacante que vence hoy desapareceria del buscador seis horas antes de tiempo.
 *
 * Por eso las comparaciones de vigencia usan la fecha en la zona horaria de la
 * aplicacion, no la del servidor.
 */
import { config } from "../config";

const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: config.app.zonaHoraria,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy en la zona horaria de la aplicacion, como "AAAA-MM-DD". */
export function hoyLocal(): string {
  // en-CA produce exactamente el formato AAAA-MM-DD.
  return formateador.format(new Date());
}

/** Suma (o resta) dias a una fecha "AAAA-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/**
 * Convierte un instante a la fecha que ve una persona en Mexicali.
 *
 * La base guarda en UTC, pero un reporte exportado debe decir el dia en que
 * ocurrio el hecho para quien lo lee, no el dia en UTC: una postulacion de las
 * 20:00 del 3 de noviembre es el 4 de noviembre en UTC.
 */
export function fechaEnApp(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "";

  const fecha = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 10);

  return formateador.format(fecha);
}
