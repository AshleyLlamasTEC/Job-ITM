/**
 * Controlador de reportes ciudadanos (apartado 5.4).
 *
 *   POST /reportes  reportes.crear
 *
 * Atenderlos corresponde a Vinculacion y llega en E-5.
 */
import type { Request, Response } from "express";

import { cuerpo } from "../../support/http/request";
import { creado } from "../../support/http/response";
import { validar } from "../../support/validation/validator";
import { Reporte } from "../models/Reporte";
import { Reportes } from "../services/Reportes";

export const ReportesController = {
  async crear(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      vacante_id: "required|integer|exists:vacantes,id",
      motivo: `required|in:${Reporte.MOTIVOS.join(",")}`,
      detalle: "nullable|string|max:600",
    });

    creado(
      res,
      await Reportes.crear(req.usuario!.id, {
        vacante_id: Number(datos.vacante_id),
        motivo: String(datos.motivo),
        detalle: datos.detalle === undefined ? null : String(datos.detalle),
      }),
    );
  },
};
