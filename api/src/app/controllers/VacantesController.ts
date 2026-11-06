/**
 * Controlador publico de vacantes (apartado 5.3).
 *
 *   GET /vacantes               buscador con filtros, orden y paginacion
 *   GET /vacantes/{id}          detalle; incrementa el contador de vistas
 *   GET /vacantes/{id}/similares hasta seis de la misma carrera o empresa
 */
import type { Request, Response } from "express";

import { ok, metaPaginacion } from "../../support/http/response";
import {
  booleanoDeConsulta,
  enteroDeConsulta,
  parametroNumerico,
  textoDeConsulta,
} from "../../support/http/request";
import { PeticionInvalida } from "../../support/http/errors";
import { Buscador, type Orden } from "../services/Buscador";

const ORDENES: Orden[] = ["recientes", "antiguas", "sueldo", "relevancia"];

export const VacantesController = {
  async listar(req: Request, res: Response): Promise<void> {
    const q = (req.query ?? {}) as Record<string, unknown>;

    const orden = (textoDeConsulta(q.orden) ?? "recientes") as Orden;
    if (!ORDENES.includes(orden)) {
      throw new PeticionInvalida(`El orden debe ser uno de: ${ORDENES.join(", ")}.`);
    }

    const pagina = Math.max(1, enteroDeConsulta(q.pagina, 1));
    const porPagina = Math.min(100, Math.max(1, enteroDeConsulta(q.por_pagina, 15)));

    const carrera = enteroDeConsulta(q.carrera, 0);
    const salarioMin = enteroDeConsulta(q.salario_min, -1);

    const { filas, total } = await Buscador.listar({
      carrera: carrera > 0 ? carrera : undefined,
      tipo: textoDeConsulta(q.tipo),
      modalidad: textoDeConsulta(q.modalidad),
      ciudad: textoDeConsulta(q.ciudad),
      salarioMin: salarioMin >= 0 ? salarioMin : undefined,
      incluirSinSalario: booleanoDeConsulta(q.incluir_sin_salario),
      publicadas: textoDeConsulta(q.publicadas),
      q: textoDeConsulta(q.q),
      orden,
      pagina,
      porPagina,
    });

    ok(res, filas, metaPaginacion(pagina, porPagina, total));
  },

  async detalle(req: Request, res: Response): Promise<void> {
    // La sesion identifica al visitante para contar una vista y no diez cuando
    // recarga la pagina.
    const sesion = req.usuario ? `u${req.usuario.id}` : `ip${req.ip ?? "anonimo"}`;
    ok(res, await Buscador.detalle(parametroNumerico(req, "id"), sesion));
  },

  async similares(req: Request, res: Response): Promise<void> {
    ok(res, await Buscador.similares(parametroNumerico(req, "id")));
  },
};
