/**
 * Envoltura de las respuestas.
 *
 * El contrato del capitulo 5 del documento de diseno exige que toda respuesta
 * comparta la misma forma: `data` con el objeto o la lista y, cuando hay
 * paginacion, un bloque `meta`. Los controladores nunca llaman a res.json()
 * directamente: pasan por aqui.
 */
import type { Response } from "express";

export interface MetaPaginacion extends Record<string, unknown> {
  pagina: number;
  por_pagina: number;
  total: number;
  paginas: number;
}

export function ok<T>(res: Response, data: T, meta?: Record<string, unknown>): void {
  res.status(200).json(meta ? { data, meta } : { data });
}

export function creado<T>(res: Response, data: T): void {
  res.status(201).json({ data });
}

export function sinContenido(res: Response): void {
  res.status(204).end();
}

export function mensaje(res: Response, texto: string, estado = 200): void {
  res.status(estado).json({ message: texto });
}

/** Construye el bloque meta a partir del total y los parametros de paginacion. */
export function metaPaginacion(pagina: number, porPagina: number, total: number): MetaPaginacion {
  return {
    pagina,
    por_pagina: porPagina,
    total,
    paginas: porPagina > 0 ? Math.ceil(total / porPagina) : 0,
  };
}
