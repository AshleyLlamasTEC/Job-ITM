/**
 * Controlador de favoritos (apartado 5.4).
 *
 *   GET    /favoritos           favoritos.gestionar
 *   POST   /favoritos           favoritos.gestionar
 *   DELETE /favoritos/{vacante} favoritos.gestionar
 */
import type { Request, Response } from "express";

import { cuerpo, parametroNumerico } from "../../support/http/request";
import { creado, ok, sinContenido } from "../../support/http/response";
import { validar } from "../../support/validation/validator";
import { Favoritos } from "../services/Favoritos";

export const FavoritosController = {
  async listar(req: Request, res: Response): Promise<void> {
    ok(res, await Favoritos.listar(req.usuario!.id));
  },

  async guardar(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      vacante_id: "required|integer|exists:vacantes,id",
    });

    creado(res, await Favoritos.guardar(req.usuario!.id, Number(datos.vacante_id)));
  },

  async quitar(req: Request, res: Response): Promise<void> {
    await Favoritos.quitar(req.usuario!.id, parametroNumerico(req, "vacante"));
    sinContenido(res);
  },
};
