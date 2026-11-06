import { Modelo } from "../../support/model";

/**
 * Reporte ciudadano sobre una vacante dudosa (apartado 4.4.9).
 *
 * Cualquier usuario autenticado puede crear uno; atenderlo es tarea de
 * Vinculacion y se construye en E-5. En E-4 solo se registra el reporte.
 */
export class Reporte extends Modelo {
  static tabla = "reportes";
  static usaTimestamps = false;

  static readonly MOTIVOS = [
    "informacion_falsa",
    "duplicada",
    "discriminatoria",
    "datos_de_contacto",
    "otro",
  ] as const;

  static readonly ETIQUETAS: Record<string, string> = {
    informacion_falsa: "Informacion falsa",
    duplicada: "Vacante duplicada",
    discriminatoria: "Contenido discriminatorio",
    datos_de_contacto: "Datos de contacto sospechosos",
    otro: "Otro motivo",
  };
}
