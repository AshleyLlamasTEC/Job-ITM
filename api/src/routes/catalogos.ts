/**
 * Rutas de catalogos publicos (apartado 5.3).
 *
 *   GET /catalogos/carreras        carreras activas para los filtros
 *   GET /catalogos/tipos-vacante   los cinco tipos con su etiqueta
 *   GET /catalogos/modalidades     modalidades disponibles
 */
import { Router } from "express";

import { CatalogosController } from "../app/controllers/CatalogosController";
import { accion } from "../support/http/asyncHandler";

export const rutasCatalogos = Router();

rutasCatalogos.get("/carreras", accion(CatalogosController.carreras));
rutasCatalogos.get("/tipos-vacante", accion(CatalogosController.tiposVacante));
rutasCatalogos.get("/modalidades", accion(CatalogosController.modalidades));
