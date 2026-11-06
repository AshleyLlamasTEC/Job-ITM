/**
 * Manejador central de errores.
 *
 * Es el unico lugar que decide como se ve un error en la respuesta. Traduce:
 *
 *   ErrorValidacion -> 422 { message, errors: { campo: [mensajes] } }
 *   ErrorHttp       -> su codigo { message }
 *   Error de MySQL  -> 409 o 500 con un mensaje entendible
 *   Cualquier otro  -> 500 sin filtrar detalles en produccion
 *
 * Express 5 reconoce un middleware con cuatro argumentos como manejador de
 * errores y lo invoca automaticamente cuando algo llama a next(error).
 */
import type { NextFunction, Request, Response } from "express";

import { config } from "../../config";
import { ErrorHttp } from "../../support/http/errors";

interface ErrorMysql extends Error {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

/** Traduce los errores conocidos del controlador de MySQL a respuestas utiles. */
function desdeMysql(error: ErrorMysql): { estado: number; mensaje: string } | null {
  switch (error.code) {
    case "ER_DUP_ENTRY":
      return { estado: 409, mensaje: "El registro ya existe: hay un valor duplicado en un campo unico." };
    case "ER_ROW_IS_REFERENCED_2":
      return {
        estado: 409,
        mensaje: "No se puede eliminar el registro porque otros datos dependen de el.",
      };
    case "ER_NO_REFERENCED_ROW_2":
      return { estado: 409, mensaje: "El registro hace referencia a un dato que no existe." };
    case "ER_DATA_TOO_LONG":
      return { estado: 422, mensaje: "Uno de los valores enviados excede la longitud permitida." };
    case "ECONNREFUSED":
    case "PROTOCOL_CONNECTION_LOST":
      return { estado: 503, mensaje: "La base de datos no esta disponible en este momento." };
    default:
      return null;
  }
}

export function manejarErrores(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Si la respuesta ya empezo a enviarse, no hay nada que hacer.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ErrorHttp) {
    res.status(error.estado).json(
      error.errores ? { message: error.message, errors: error.errores } : { message: error.message },
    );
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ message: "El cuerpo de la peticion no es JSON valido." });
    return;
  }

  const mysql = error instanceof Error ? desdeMysql(error as ErrorMysql) : null;
  if (mysql) {
    res.status(mysql.estado).json({ message: mysql.mensaje });
    return;
  }

  // Error inesperado: se registra completo en el servidor, pero al cliente solo
  // se le da un mensaje generico en produccion.
  console.error("[error]", error);
  res.status(500).json({
    message: config.app.esProduccion
      ? "Ocurrio un error inesperado. Intenta de nuevo mas tarde."
      : `Error interno: ${(error as Error)?.message ?? "desconocido"}`,
  });
}

/** Responde 404 con la misma envoltura que el resto de la API. */
export function noEncontrado(req: Request, res: Response): void {
  res.status(404).json({ message: `La ruta ${req.method} ${req.originalUrl} no existe.` });
}
