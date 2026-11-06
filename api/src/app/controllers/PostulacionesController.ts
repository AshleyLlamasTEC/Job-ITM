/**
 * Controlador de postulaciones del alumno (apartado 5.4).
 *
 *   POST   /postulaciones          postulaciones.crear
 *   GET    /mis-postulaciones      postulaciones.propias
 *   GET    /mis-postulaciones/{id} postulaciones.propias
 *   DELETE /mis-postulaciones/{id} postulaciones.propias
 */
import type { Request, Response } from "express";

import { cuerpo, consulta, enteroDeConsulta, parametroNumerico } from "../../support/http/request";
import { creado, metaPaginacion, ok, sinContenido } from "../../support/http/response";
import { validar } from "../../support/validation/validator";
import { Postulaciones } from "../services/Postulaciones";

export const PostulacionesController = {
  /** POST /postulaciones */
  async crear(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      vacante_id: "required|integer|exists:vacantes,id",
      mensaje: "nullable|string|max:600",
    });

    const postulacion = await Postulaciones.postularse(req.usuario!.id, {
      vacante_id: Number(datos.vacante_id),
      mensaje: datos.mensaje === undefined ? undefined : String(datos.mensaje),
    });

    creado(res, postulacion);
  },

  /** GET /mis-postulaciones */
  async mias(req: Request, res: Response): Promise<void> {
    const q = consulta(req);
    const pagina = Math.max(1, enteroDeConsulta(q.pagina, 1));
    const porPagina = Math.min(100, Math.max(1, enteroDeConsulta(q.por_pagina, 15)));

    const { filas, total } = await Postulaciones.mias(req.usuario!.id, pagina, porPagina);
    ok(res, filas, metaPaginacion(pagina, porPagina, total));
  },

  /** GET /mis-postulaciones/{id} */
  async detalle(req: Request, res: Response): Promise<void> {
    ok(res, await Postulaciones.detalleMio(req.usuario!.id, parametroNumerico(req, "id")));
  },

  /** DELETE /mis-postulaciones/{id} */
  async cancelar(req: Request, res: Response): Promise<void> {
    await Postulaciones.cancelar(req.usuario!.id, parametroNumerico(req, "id"));
    sinContenido(res);
  },
};
