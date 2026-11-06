/**
 * Envoltorio de controladores asincronos.
 *
 * Express 5 ya reenvia al manejador de errores las promesas rechazadas, pero se
 * deja el envoltorio explicito para que el comportamiento no dependa de la
 * version del framework ni de que alguien recuerde poner un try/catch.
 */
import type { NextFunction, Request, RequestHandler, Response } from "express";

export type Accion = (req: Request, res: Response) => Promise<void> | void;

export function accion(controlador: Accion): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = controlador(req, res);
      if (resultado instanceof Promise) resultado.catch(next);
    } catch (error) {
      next(error);
    }
  };
}
