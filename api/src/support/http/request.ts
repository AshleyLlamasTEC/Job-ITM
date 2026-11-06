/**
 * Lector de la peticion.
 *
 * Centraliza el acceso al cuerpo y a la consulta para que los controladores no
 * dependan de detalles de Express y para que los tipos queden explicitos.
 */
import type { Request } from "express";

import { PeticionInvalida } from "./errors";

export type Datos = Record<string, unknown>;

export function cuerpo(req: Request): Datos {
  const datos = req.body;
  if (datos === null || typeof datos !== "object" || Array.isArray(datos)) {
    throw new PeticionInvalida("El cuerpo de la peticion debe ser un objeto JSON.");
  }
  return datos as Datos;
}

export function consulta(req: Request): Datos {
  return (req.query ?? {}) as Datos;
}

export function parametro(req: Request, nombre: string): string {
  const valor = req.params[nombre];
  if (typeof valor !== "string" || valor === "") {
    throw new PeticionInvalida(`Falta el parametro ${nombre} en la ruta.`);
  }
  return valor;
}

export function parametroNumerico(req: Request, nombre: string): number {
  const valor = Number(parametro(req, nombre));
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new PeticionInvalida(`El parametro ${nombre} debe ser un numero entero positivo.`);
  }
  return valor;
}

/** Convierte un valor de consulta a entero, con valor por omision. */
export function enteroDeConsulta(valor: unknown, porDefecto: number): number {
  if (valor === undefined || valor === null || valor === "") return porDefecto;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.trunc(n) : porDefecto;
}

export function textoDeConsulta(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpio = valor.trim();
  return limpio === "" ? undefined : limpio;
}

export function booleanoDeConsulta(valor: unknown): boolean {
  return valor === "1" || valor === "true" || valor === true;
}
