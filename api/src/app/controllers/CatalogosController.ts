/**
 * Catalogos publicos (apartado 5.3 del documento de diseno).
 *
 * Los tipos de vacante y las modalidades son enums de la base, pero la interfaz
 * necesita su etiqueta en espanol. Se declaran aqui una sola vez para que el
 * formulario y el buscador muestren exactamente el mismo texto.
 */
import type { Request, Response } from "express";

import { Carrera } from "../models/Carrera";
import { ok } from "../../support/http/response";

export const TIPOS_VACANTE = [
  { valor: "practicas", etiqueta: "Practicas profesionales" },
  { valor: "servicio_social", etiqueta: "Servicio social" },
  { valor: "servicios_profesionales", etiqueta: "Servicios profesionales" },
  { valor: "temporal", etiqueta: "Empleo temporal" },
  { valor: "planta", etiqueta: "Empleo de planta" },
] as const;

export const MODALIDADES = [
  { valor: "presencial", etiqueta: "Presencial" },
  { valor: "hibrida", etiqueta: "Hibrida" },
  { valor: "remota", etiqueta: "Remota" },
] as const;

export const CatalogosController = {
  /** GET /catalogos/carreras */
  async carreras(_req: Request, res: Response): Promise<void> {
    const filas = await Carrera.activas();
    ok(res, Carrera.presentarLista(filas));
  },

  /** GET /catalogos/tipos-vacante */
  async tiposVacante(_req: Request, res: Response): Promise<void> {
    ok(res, TIPOS_VACANTE);
  },

  /** GET /catalogos/modalidades */
  async modalidades(_req: Request, res: Response): Promise<void> {
    ok(res, MODALIDADES);
  },
};
