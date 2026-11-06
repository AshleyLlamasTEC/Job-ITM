/**
 * Middleware de autorizacion por permiso.
 *
 * Equivalente a `->middleware('can:vacantes.moderar')` de Laravel. El permiso se
 * consulta en la base (matriz del apartado 4.7), nunca se compara contra una
 * lista escrita en el codigo.
 *
 *   router.get("/admin/vacantes", autenticar, autorizar("vacantes.moderar"), accion);
 */
import type { NextFunction, Request, Response } from "express";

import { NoAutenticado, SinPermiso } from "../../support/http/errors";
import { puede } from "../../support/authorization/gate";

export function autorizar(permiso: string) {
  return async function verificarPermiso(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const usuario = req.usuario;
      if (!usuario) throw new NoAutenticado("Debes iniciar sesion para realizar esta accion.");

      if (!(await puede(usuario.id, permiso))) {
        throw new SinPermiso(`Tu rol no tiene el permiso "${permiso}".`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Exige uno de varios roles, sin pasar por la tabla de permisos. */
export function autorizarRol(...roles: string[]) {
  return function verificarRol(req: Request, _res: Response, next: NextFunction): void {
    const usuario = req.usuario;
    if (!usuario) {
      next(new NoAutenticado("Debes iniciar sesion para realizar esta accion."));
      return;
    }

    if (!usuario.rol || !roles.includes(usuario.rol)) {
      next(new SinPermiso("Tu rol no tiene acceso a esta seccion."));
      return;
    }

    next();
  };
}
