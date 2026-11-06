/**
 * Rutas del panel del estudiante (apartado 5.4).
 *
 * Se agrupan en un solo archivo porque comparten permisos y porque asi el
 * apartado 5.4 del documento se lee de corrido:
 *
 *   POST   /postulaciones              postulaciones.crear
 *   GET    /mis-postulaciones          postulaciones.propias
 *   GET    /mis-postulaciones/{id}     postulaciones.propias
 *   DELETE /mis-postulaciones/{id}     postulaciones.propias
 *   GET    /favoritos                  favoritos.gestionar
 *   POST   /favoritos                  favoritos.gestionar
 *   DELETE /favoritos/{vacante}        favoritos.gestionar
 *   GET    /notificaciones             autenticado
 *   PUT    /notificaciones/{id}/leida  autenticado
 *   POST   /reportes                   reportes.crear
 */
import { Router } from "express";

import { FavoritosController } from "../app/controllers/FavoritosController";
import { NotificacionesController } from "../app/controllers/NotificacionesController";
import { PostulacionesController } from "../app/controllers/PostulacionesController";
import { ReportesController } from "../app/controllers/ReportesController";
import { autenticar } from "../app/middleware/autenticar";
import { autorizar } from "../app/middleware/autorizar";
import { accion } from "../support/http/asyncHandler";

/** POST /postulaciones */
export const rutasPostulaciones = Router();
rutasPostulaciones.use(autenticar);
rutasPostulaciones.post(
  "/",
  autorizar("postulaciones.crear"),
  accion(PostulacionesController.crear),
);

/** GET|DELETE /mis-postulaciones */
export const rutasMisPostulaciones = Router();
rutasMisPostulaciones.use(autenticar);
rutasMisPostulaciones.get(
  "/",
  autorizar("postulaciones.propias"),
  accion(PostulacionesController.mias),
);
rutasMisPostulaciones.get(
  "/:id",
  autorizar("postulaciones.propias"),
  accion(PostulacionesController.detalle),
);
rutasMisPostulaciones.delete(
  "/:id",
  autorizar("postulaciones.propias"),
  accion(PostulacionesController.cancelar),
);

/** GET|POST|DELETE /favoritos */
export const rutasFavoritos = Router();
rutasFavoritos.use(autenticar);
rutasFavoritos.get("/", autorizar("favoritos.gestionar"), accion(FavoritosController.listar));
rutasFavoritos.post("/", autorizar("favoritos.gestionar"), accion(FavoritosController.guardar));
rutasFavoritos.delete(
  "/:vacante",
  autorizar("favoritos.gestionar"),
  accion(FavoritosController.quitar),
);

/** GET /notificaciones y PUT /notificaciones/{id}/leida */
export const rutasNotificaciones = Router();
rutasNotificaciones.use(autenticar);
rutasNotificaciones.get("/", accion(NotificacionesController.listar));
rutasNotificaciones.put("/:id/leida", accion(NotificacionesController.marcarLeida));

/** POST /reportes */
export const rutasReportes = Router();
rutasReportes.use(autenticar);
rutasReportes.post("/", autorizar("reportes.crear"), accion(ReportesController.crear));
