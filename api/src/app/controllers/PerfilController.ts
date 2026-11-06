/**
 * Controlador del perfil del estudiante (apartado 5.4).
 *
 *   GET  /perfil       perfil propio
 *   PUT  /perfil       perfil.editar
 *   POST /perfil/cv    perfil.editar
 *   GET  /perfil/cv    perfil.editar
 */
import type { Request, Response } from "express";

import { cuerpo } from "../../support/http/request";
import { creado, ok } from "../../support/http/response";
import { validar } from "../../support/validation/validator";
import { PeticionInvalida } from "../../support/http/errors";
import { Perfiles } from "../services/Perfiles";

export const PerfilController = {
  async ver(req: Request, res: Response): Promise<void> {
    ok(res, await Perfiles.estudiante(req.usuario!.id));
  },

  async actualizar(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      nombre: "nullable|string|max:120",
      carrera_id: "nullable|integer|exists:carreras,id",
      semestre: "nullable|integer|between:1,12",
      anio_egreso: "nullable|integer|between:1980,2100",
      telefono: "nullable|string|max:15",
      habilidades: "nullable|string|max:400",
    });

    ok(res, await Perfiles.actualizarEstudiante(req.usuario!.id, datos));
  },

  async subirCv(req: Request, res: Response): Promise<void> {
    const archivo = req.file;
    if (!archivo) {
      throw new PeticionInvalida("Adjunta el curriculum en el campo \"cv\" (multipart/form-data).");
    }

    creado(res, await Perfiles.guardarCv(req.usuario!.id, archivo.buffer));
  },

  async descargarCv(req: Request, res: Response): Promise<void> {
    ok(res, await Perfiles.enlaceCv(req.usuario!.id));
  },
};
