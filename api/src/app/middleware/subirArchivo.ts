/**
 * Middleware de carga de archivos.
 *
 * Multer se configura con almacenamiento en memoria: el archivo nunca toca el
 * disco antes de validarse. Si el contenido no es lo que se esperaba, se rechaza
 * sin dejar basura en storage.
 *
 * El limite de tamano se aplica aqui y se vuelve a comprobar en el servicio,
 * porque el encabezado Content-Length lo controla el cliente.
 */
import multer from "multer";
import type { NextFunction, Request, Response } from "express";

import { PeticionInvalida } from "../../support/http/errors";

export function subirArchivo(campo: string, maxMb: number) {
  const recibir = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  }).single(campo);

  return (req: Request, res: Response, next: NextFunction): void => {
    recibir(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(new PeticionInvalida(`El archivo no debe superar ${maxMb} MB.`));
          return;
        }
        if (error.code === "LIMIT_UNEXPECTED_FILE") {
          next(new PeticionInvalida(`El archivo debe enviarse en el campo "${campo}".`));
          return;
        }
        next(new PeticionInvalida(`No se pudo recibir el archivo: ${error.message}`));
        return;
      }

      next(error);
    });
  };
}
