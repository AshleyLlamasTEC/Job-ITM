/**
 * Controlador de archivos privados.
 *
 * Los curriculums y los logos no se sirven desde una carpeta publica: se
 * entregan con una URL firmada que vence a los cinco minutos (apartado 8.3).
 * El enlace lo genera el servidor despues de comprobar quien puede ver el
 * archivo, y esta ruta solo valida la firma.
 */
import type { Request, Response } from "express";

import { verificarRecurso } from "../../support/auth/firmas";
import { NoEncontrado, SinPermiso } from "../../support/http/errors";
import { leerArchivo } from "../../support/storage/archivos";
import { Estudiante } from "../models/Estudiante";
import { Empresa } from "../models/Empresa";
import { Postulacion } from "../models/Postulacion";

/** Lee los parametros de la firma y corta si no son validos. */
function exigirFirma(req: Request, recurso: string): void {
  const expira = Number(req.query.expira);
  const firma = String(req.query.firma ?? "");

  if (!verificarRecurso(recurso, expira, firma)) {
    throw new SinPermiso("El enlace de descarga no es valido o ya vencio.");
  }
}

export const ArchivosController = {
  /** GET /archivos/cv/{estudiante}?expira=&firma= */
  async curriculum(req: Request, res: Response): Promise<void> {
    const estudianteId = Number(req.params.estudiante);
    exigirFirma(req, `cv:${estudianteId}`);

    const perfil = await Estudiante.buscar(estudianteId);
    if (!perfil?.cv_ruta) throw new NoEncontrado("El curriculum ya no esta disponible.");

    const contenido = await leerArchivo(String(perfil.cv_ruta));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="curriculum-${estudianteId}.pdf"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).end(contenido);
  },

  /** GET /archivos/logo/{empresa}?expira=&firma= */
  async logo(req: Request, res: Response): Promise<void> {
    const empresaId = Number(req.params.empresa);
    exigirFirma(req, `logo:${empresaId}`);

    const empresa = await Empresa.buscar(empresaId);
    if (!empresa?.logo_ruta) throw new NoEncontrado("El logo ya no esta disponible.");

    const contenido = await leerArchivo(String(empresa.logo_ruta));
    const tipo = String(empresa.logo_ruta).endsWith(".png") ? "image/png" : "image/jpeg";

    res.setHeader("Content-Type", tipo);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).end(contenido);
  },

  /**
   * GET /archivos/postulacion/{postulacion}?expira=&firma=
   *
   * Curriculum copiado al momento de postularse. Se sirve la copia y no el
   * archivo del perfil: la empresa debe ver exactamente lo que recibio.
   */
  async curriculumPostulacion(req: Request, res: Response): Promise<void> {
    const postulacionId = Number(req.params.postulacion);
    exigirFirma(req, `postulacion:${postulacionId}`);

    const fila = await Postulacion.buscar(postulacionId);
    if (!fila?.cv_ruta) throw new NoEncontrado("El curriculum ya no esta disponible.");

    const contenido = await leerArchivo(String(fila.cv_ruta));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="curriculum-${postulacionId}.pdf"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).end(contenido);
  },
};
