/**
 * Controlador de avisos internos (apartado 5.4).
 *
 *   GET /notificaciones              autenticado
 *   PUT /notificaciones/{id}/leida   autenticado
 *
 * El contador de no leidas viaja en `meta.sin_leer` para que la campana de la
 * interfaz no tenga que contar en el cliente.
 */
import type { Request, Response } from "express";

import { parametroNumerico } from "../../support/http/request";
import { ok } from "../../support/http/response";
import { NoEncontrado } from "../../support/http/errors";
import { Notificacion } from "../models/Notificacion";

export const NotificacionesController = {
  async listar(req: Request, res: Response): Promise<void> {
    const userId = req.usuario!.id;
    const filas = await Notificacion.deUsuario(userId);

    ok(
      res,
      filas.map((fila) => ({
        id: Number(fila.id),
        tipo: fila.tipo,
        titulo: fila.titulo,
        mensaje: fila.mensaje,
        url: fila.url ?? null,
        leida: fila.leida_en !== null,
        leida_en: fila.leida_en ?? null,
        creado_en: fila.creado_en,
      })),
      { total: filas.length, sin_leer: await Notificacion.sinLeer(userId) },
    );
  },

  async marcarLeida(req: Request, res: Response): Promise<void> {
    const marcada = await Notificacion.marcarLeida(
      req.usuario!.id,
      parametroNumerico(req, "id"),
    );

    if (!marcada) throw new NoEncontrado("El aviso no existe o no pertenece a tu cuenta.");

    ok(res, { leida: true, sin_leer: await Notificacion.sinLeer(req.usuario!.id) });
  },
};
