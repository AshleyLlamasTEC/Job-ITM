/**
 * Rutas del panel de la empresa (apartado 5.5).
 *
 * Cada ruta lleva su permiso de la matriz del apartado 4.7. La comprobacion de
 * que el recurso pertenece a la empresa se hace en el servicio, que responde 404
 * cuando el identificador es ajeno.
 */
import { Router } from "express";

import { CandidatosController } from "../app/controllers/CandidatosController";
import { EmpresaController } from "../app/controllers/EmpresaController";
import { autorizar } from "../app/middleware/autorizar";
import { autenticar } from "../app/middleware/autenticar";
import { subirArchivo } from "../app/middleware/subirArchivo";
import { accion } from "../support/http/asyncHandler";

export const rutasEmpresa = Router();

rutasEmpresa.use(autenticar);

// Tablero y perfil
rutasEmpresa.get("/tablero", autorizar("indicadores.ver"), accion(EmpresaController.tablero));
rutasEmpresa.get("/perfil", autorizar("perfil.editar"), accion(EmpresaController.verPerfil));
rutasEmpresa.put("/perfil", autorizar("perfil.editar"), accion(EmpresaController.actualizarPerfil));
rutasEmpresa.post(
  "/perfil/logo",
  autorizar("perfil.editar"),
  subirArchivo("logo", 2),
  accion(EmpresaController.subirLogo),
);

// Vacantes propias
rutasEmpresa.get("/vacantes", autorizar("vacantes.ver"), accion(EmpresaController.listarVacantes));
rutasEmpresa.post("/vacantes", autorizar("vacantes.crear"), accion(EmpresaController.crearVacante));
rutasEmpresa.get(
  "/vacantes/:id",
  autorizar("vacantes.ver"),
  accion(EmpresaController.verVacante),
);
rutasEmpresa.put(
  "/vacantes/:id",
  autorizar("vacantes.editar"),
  accion(EmpresaController.actualizarVacante),
);
rutasEmpresa.delete(
  "/vacantes/:id",
  autorizar("vacantes.editar"),
  accion(EmpresaController.eliminarVacante),
);

// Transiciones de estado
rutasEmpresa.post(
  "/vacantes/:id/enviar",
  autorizar("vacantes.enviar"),
  accion(EmpresaController.enviarVacante),
);
rutasEmpresa.post(
  "/vacantes/:id/pausar",
  autorizar("vacantes.pausar"),
  accion(EmpresaController.pausarVacante),
);
rutasEmpresa.post(
  "/vacantes/:id/reactivar",
  autorizar("vacantes.pausar"),
  accion(EmpresaController.reactivarVacante),
);
rutasEmpresa.post(
  "/vacantes/:id/cerrar",
  autorizar("vacantes.cerrar"),
  accion(EmpresaController.cerrarVacante),
);

// Candidatos de una vacante (E-4)
rutasEmpresa.get(
  "/vacantes/:id/candidatos",
  autorizar("postulaciones.gestionar"),
  accion(CandidatosController.deVacante),
);
rutasEmpresa.get(
  "/candidatos/:postulacion",
  autorizar("postulaciones.gestionar"),
  accion(CandidatosController.detalle),
);
rutasEmpresa.put(
  "/candidatos/:postulacion/estado",
  autorizar("postulaciones.gestionar"),
  accion(CandidatosController.cambiarEstado),
);
rutasEmpresa.get(
  "/candidatos/:postulacion/cv",
  autorizar("postulaciones.gestionar"),
  accion(CandidatosController.curriculum),
);

// Exportacion (E-4)
rutasEmpresa.get(
  "/exportar/candidatos",
  autorizar("postulaciones.gestionar"),
  accion(CandidatosController.exportar),
);
