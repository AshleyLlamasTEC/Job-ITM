/**
 * Middleware de autenticacion.
 *
 * Equivalente al middleware `auth:sanctum` de Laravel. Lee el token del
 * encabezado Authorization, lo resuelve contra la tabla de tokens y deja el
 * usuario disponible en `req.usuario`.
 *
 * Si el token falta, no existe, vencio o la cuenta esta suspendida, responde
 * 401 y no llega al controlador.
 */
import type { NextFunction, Request, Response } from "express";

import { NoAutenticado, SinPermiso } from "../../support/http/errors";
import { resolverToken } from "../../support/auth/token";
import { permisosDe, rolDe } from "../../support/authorization/gate";
import { User } from "../models/User";

/** Extrae el token de `Authorization: Bearer <token>`. */
function tokenDelEncabezado(req: Request): string | null {
  const encabezado = req.headers.authorization;
  if (!encabezado) return null;

  const [esquema, valor] = encabezado.split(" ");
  if (!esquema || esquema.toLowerCase() !== "bearer" || !valor) return null;
  return valor.trim();
}

export async function autenticar(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const plano = tokenDelEncabezado(req);
    if (!plano) throw new NoAutenticado("Falta el token de acceso.");

    const resuelto = await resolverToken(plano);
    if (!resuelto) throw new NoAutenticado("El token no es valido o ya vencio.");

    const fila = await User.buscar(resuelto.userId);
    if (!fila) throw new NoAutenticado("La cuenta ya no existe.");

    if (fila.estado !== "activo") {
      throw new SinPermiso("La cuenta esta suspendida. Contacta al Departamento de Vinculacion.");
    }

    req.usuario = {
      id: Number(fila.id),
      nombre: String(fila.nombre),
      correo: String(fila.correo),
      estado: String(fila.estado),
      correo_verificado_en: fila.correo_verificado_en ?? null,
      rol: await rolDe(resuelto.userId),
      permisos: await permisosDe(resuelto.userId),
    };
    req.tokenId = resuelto.tokenId;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Variante opcional: si hay token valido identifica al usuario y, si no, deja
 * continuar como visitante. Se usa en rutas publicas que cambian su respuesta
 * cuando hay sesion (por ejemplo el contador de vistas).
 */
export async function autenticarSiHayToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!tokenDelEncabezado(req)) {
    next();
    return;
  }

  try {
    await autenticar(req, _res, next);
  } catch {
    next();
  }
}
