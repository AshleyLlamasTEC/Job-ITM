/**
 * Rutas de archivos privados (apartado 8.3).
 *
 * No llevan autenticacion: el permiso viaja en la firma del enlace, que vence a
 * los cinco minutos. Asi el navegador puede abrir el PDF directamente sin enviar
 * la cabecera Authorization.
 */
import { Router } from "express";

import { ArchivosController } from "../app/controllers/ArchivosController";
import { accion } from "../support/http/asyncHandler";

export const rutasArchivos = Router();

rutasArchivos.get("/cv/:estudiante", accion(ArchivosController.curriculum));
rutasArchivos.get("/logo/:empresa", accion(ArchivosController.logo));
rutasArchivos.get("/postulacion/:postulacion", accion(ArchivosController.curriculumPostulacion));
