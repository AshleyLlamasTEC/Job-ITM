/**
 * Controlador de candidatos en el panel de la empresa (apartado 5.5).
 *
 *   GET /empresa/vacantes/{id}/candidatos        postulaciones.gestionar
 *   GET /empresa/candidatos/{postulacion}        postulaciones.gestionar
 *   PUT /empresa/candidatos/{postulacion}/estado postulaciones.gestionar
 *   GET /empresa/candidatos/{postulacion}/cv     postulaciones.gestionar
 *   GET /empresa/exportar/candidatos             postulaciones.gestionar
 *
 * La exportacion pide el permiso `reportes.exportar` en la tabla 26 del
 * documento, pero la matriz del apartado 4.7 solo se lo concede a Vinculacion.
 * Para que la empresa pueda descargar a sus propios candidatos se exige
 * `postulaciones.gestionar`, que es el permiso que si tiene; el detalle queda
 * anotado en el README.
 */
import type { Request, Response } from "express";

import { consulta, cuerpo, enteroDeConsulta, parametroNumerico, textoDeConsulta } from "../../support/http/request";
import { ok } from "../../support/http/response";
import { PeticionInvalida } from "../../support/http/errors";
import { aCsv, nombreArchivo } from "../../support/csv";
import { validar } from "../../support/validation/validator";
import { Postulacion } from "../models/Postulacion";
import { Postulaciones } from "../services/Postulaciones";

export const CandidatosController = {
  async deVacante(req: Request, res: Response): Promise<void> {
    const estado = textoDeConsulta(consulta(req).estado);

    if (estado && !(Postulacion.ESTADOS as readonly string[]).includes(estado)) {
      throw new PeticionInvalida(
        `El estado debe ser uno de: ${Postulacion.ESTADOS.join(", ")}.`,
      );
    }

    ok(
      res,
      await Postulaciones.candidatosDeVacante(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        estado,
      ),
    );
  },

  async detalle(req: Request, res: Response): Promise<void> {
    ok(res, await Postulaciones.detalleCandidato(req.usuario!.id, parametroNumerico(req, "postulacion")));
  },

  async cambiarEstado(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      estado: `required|in:${Postulacion.ESTADOS.join(",")}`,
      notas_empresa: "nullable|string|max:600",
    });

    ok(
      res,
      await Postulaciones.cambiarEstado(
        req.usuario!.id,
        parametroNumerico(req, "postulacion"),
        {
          estado: String(datos.estado),
          notas_empresa: datos.notas_empresa === undefined ? undefined : String(datos.notas_empresa),
        },
      ),
    );
  },

  async curriculum(req: Request, res: Response): Promise<void> {
    ok(res, await Postulaciones.enlaceCv(req.usuario!.id, parametroNumerico(req, "postulacion")));
  },

  async exportar(req: Request, res: Response): Promise<void> {
    const vacanteId = enteroDeConsulta(consulta(req).vacante_id, 0);
    if (vacanteId <= 0) {
      throw new PeticionInvalida("Indica la vacante a exportar con ?vacante_id=");
    }

    const filas = await Postulaciones.exportables(req.usuario!.id, vacanteId);

    const contenido = aCsv(filas, [
      { campo: "folio", titulo: "Folio" },
      { campo: "alumno", titulo: "Alumno" },
      { campo: "matricula", titulo: "Matricula" },
      { campo: "carrera", titulo: "Carrera" },
      { campo: "correo", titulo: "Correo" },
      { campo: "telefono", titulo: "Telefono" },
      { campo: "estado", titulo: "Estado" },
      { campo: "postulado_en", titulo: "Postulado el" },
      { campo: "ultimo_cambio", titulo: "Ultimo cambio" },
    ]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreArchivo(`candidatos-vacante-${vacanteId}`)}"`,
    );
    res.status(200).send(contenido);
  },
};
