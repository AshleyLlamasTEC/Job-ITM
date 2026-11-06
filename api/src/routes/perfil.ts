/**
 * Rutas del perfil del estudiante (apartado 5.4).
 */
import { Router } from "express";

import { config } from "../config";
import { PerfilController } from "../app/controllers/PerfilController";
import { autorizar } from "../app/middleware/autorizar";
import { autenticar } from "../app/middleware/autenticar";
import { subirArchivo } from "../app/middleware/subirArchivo";
import { accion } from "../support/http/asyncHandler";

export const rutasPerfil = Router();

rutasPerfil.use(autenticar);

rutasPerfil.get("/", autorizar("perfil.editar"), accion(PerfilController.ver));
rutasPerfil.put("/", autorizar("perfil.editar"), accion(PerfilController.actualizar));

rutasPerfil.post(
  "/cv",
  autorizar("perfil.editar"),
  subirArchivo("cv", config.archivos.cvMaxMb),
  accion(PerfilController.subirCv),
);
rutasPerfil.get("/cv", autorizar("perfil.editar"), accion(PerfilController.descargarCv));
