/**
 * Controlador de moderacion.
 *
 * En E-2 solo existen las dos acciones que cierran el ciclo de publicacion
 * (aprobar y rechazar) y la bandeja que las alimenta: sin ellas no se puede
 * cumplir el criterio de avance de la etapa, que exige publicar una vacante de
 * prueba y encontrarla en el buscador.
 *
 * El resto del panel de Vinculacion se construye en E-5.
 */
import type { Request, Response } from "express";

import { cuerpo, parametroNumerico, textoDeConsulta } from "../../support/http/request";
import { ok } from "../../support/http/response";
import { validar } from "../../support/validation/validator";
import { Vacantes } from "../services/Vacantes";

export const AdminController = {
  /** GET /admin/vacantes?estado=en_revision */
  async bandejaVacantes(req: Request, res: Response): Promise<void> {
    const estado = textoDeConsulta((req.query ?? {}).estado) ?? "en_revision";
    ok(res, await Vacantes.bandeja(estado));
  },

  /** POST /admin/vacantes/{id}/aprobar */
  async aprobarVacante(req: Request, res: Response): Promise<void> {
    ok(
      res,
      await Vacantes.aprobar(req.usuario!.id, parametroNumerico(req, "id"), req.ip),
    );
  },

  /** POST /admin/vacantes/{id}/rechazar  (el motivo es obligatorio) */
  async rechazarVacante(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      motivo: "required|string|max:255",
    });

    ok(
      res,
      await Vacantes.rechazar(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        String(datos.motivo),
        req.ip,
      ),
    );
  },
};
