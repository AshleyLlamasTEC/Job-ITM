/**
 * Rutas de moderacion (apartado 5.6).
 *
 * Un archivo por responsable:
 *
 *   Vacantes  AdminController  -> bandeja, aprobar, rechazar (E-2)
 *   Vinculador VinculacionController -> tablero, indicadores,
 *                   empresas, reportes, baja, exportacion, usuarios, bitacora
 */
import { Router } from "express";

import { AdminController } from "../app/controllers/AdminController";
import { VinculacionController } from "../app/controllers/VinculacionController";
import { autorizar } from "../app/middleware/autorizar";
import { autenticar } from "../app/middleware/autenticar";
import { accion } from "../support/http/asyncHandler";

export const rutasAdmin = Router();

rutasAdmin.use(autenticar);

/** Tablero general del portal (E-5). */
rutasAdmin.get(
  "/tablero",
  autorizar("indicadores.ver"),
  accion(VinculacionController.tablero),
);

/** Indicadores agregados por carrera, empresa y periodo (E-5). */
rutasAdmin.get(
  "/indicadores",
  autorizar("indicadores.ver"),
  accion(VinculacionController.indicadores),
);

/** Bandeja de vacantes + ciclo de publicacion (E-2). */
rutasAdmin.get(
  "/vacantes",
  autorizar("vacantes.moderar"),
  accion(AdminController.bandejaVacantes),
);
rutasAdmin.post(
  "/vacantes/:id/aprobar",
  autorizar("vacantes.moderar"),
  accion(AdminController.aprobarVacante),
);
rutasAdmin.post(
  "/vacantes/:id/rechazar",
  autorizar("vacantes.moderar"),
  accion(AdminController.rechazarVacante),
);
rutasAdmin.post(
  "/vacantes/:id/baja",
  autorizar("vacantes.dar_baja"),
  accion(VinculacionController.darBajaVacante),
);

/** Validacion de empresas (E-5). */
rutasAdmin.get(
  "/empresas",
  autorizar("empresas.validar"),
  accion(VinculacionController.empresasEnRevision),
);
rutasAdmin.post(
  "/empresas/:id/aprobar",
  autorizar("empresas.validar"),
  accion(VinculacionController.aprobarEmpresa),
);
rutasAdmin.post(
  "/empresas/:id/rechazar",
  autorizar("empresas.validar"),
  accion(VinculacionController.rechazarEmpresa),
);

/** Reportes ciudadanos (E-5). */
rutasAdmin.get(
  "/reportes",
  autorizar("reportes.atender"),
  accion(VinculacionController.reportesAbiertos),
);
rutasAdmin.put(
  "/reportes/:id",
  autorizar("reportes.atender"),
  accion(VinculacionController.resolverReporte),
);

/** Exportacion de listados a CSV (E-5). */
rutasAdmin.get(
  "/exportar/:recurso",
  autorizar("reportes.exportar"),
  accion(VinculacionController.exportar),
);

/** Cuentas y roles (solo admin_tecnico por la regla global) (E-5). */
rutasAdmin.get(
  "/usuarios",
  autorizar("usuarios.gestionar"),
  accion(VinculacionController.usuarios),
);
rutasAdmin.put(
  "/usuarios/:id/rol",
  autorizar("usuarios.gestionar"),
  accion(VinculacionController.cambiarRol),
);

/** Currículum de una candidatura, para Vinculación (CA-10). */

// CA-10: solo lo descargan el alumno, la empresa destinataria y Vinculacion.
// Vinculacion tenia el permiso matrix postulaciones.gestionar pero ninguna ruta;
// se agrega sin tocar la matriz.
rutasAdmin.get(
  "/postulaciones/:id/cv",
  autorizar("postulaciones.gestionar"),
  accion(VinculacionController.cvDePostulacion),
);

/** Bitacora administrativa (solo admin_tecnico por la regla global) (E-5). */
rutasAdmin.get(
  "/bitacora",
  autorizar("bitacora.ver"),
  accion(VinculacionController.bitacora),
);
