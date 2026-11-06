/**
 * Rutas publicas del catalogo de vacantes (apartado 5.3).
 *
 * No requieren sesion: un visitante puede buscar y despues iniciar sesion sin
 * perder la busqueda. El middleware opcional solo sirve para saber si hay sesion
 * y contar una vista por usuario en lugar de una por IP.
 */
import { Router } from "express";

import { VacantesController } from "../app/controllers/VacantesController";
import { autenticarSiHayToken } from "../app/middleware/autenticar";
import { accion } from "../support/http/asyncHandler";

export const rutasVacantes = Router();

rutasVacantes.get("/", accion(VacantesController.listar));
rutasVacantes.get("/:id", autenticarSiHayToken, accion(VacantesController.detalle));
rutasVacantes.get("/:id/similares", accion(VacantesController.similares));
