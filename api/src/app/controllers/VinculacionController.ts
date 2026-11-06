/**
 * Controlador del panel de Vinculacion (apartado 5.6).
 *
 *   GET  /admin/tablero                 indicadores.ver
 *   GET  /admin/indicadores             indicadores.ver
 *   GET  /admin/empresas                empresas.validar
 *   POST /admin/empresas/{id}/aprobar   empresas.validar
 *   POST /admin/empresas/{id}/rechazar  empresas.validar (motivo obligatorio)
 *   GET  /admin/reportes                reportes.atender
 *   PUT  /admin/reportes/{id}           reportes.atender
 *   POST /admin/vacantes/{id}/baja      vacantes.dar_baja (motivo obligatorio)
 *   GET  /admin/exportar/{recurso}      reportes.exportar (vacantes|postulaciones|empresas)
 *   GET  /admin/usuarios                usuarios.gestionar
 *   PUT  /admin/usuarios/{id}/rol       usuarios.gestionar
 *   GET  /admin/bitacora                bitacora.ver
 *
 * El motivo es obligatorio para rechazar y para dar de baja: una decision sin
 * motivo no puede explicarse en la bitacora ni en el correo a la empresa.
 */
import type { Request, Response } from "express";

import { consulta, cuerpo, enteroDeConsulta, parametro, parametroNumerico, textoDeConsulta } from "../../support/http/request";
import { ok, metaPaginacion } from "../../support/http/response";
import { PeticionInvalida } from "../../support/http/errors";
import { validar } from "../../support/validation/validator";
import { Vinculacion } from "../services/Vinculacion";

export const VinculacionController = {
  /** GET /admin/tablero */
  async tablero(req: Request, res: Response): Promise<void> {
    ok(res, await Vinculacion.tablero());
  },

  /** GET /admin/indicadores?periodo=6m&carrera_id=&empresa_id= */
  async indicadores(req: Request, res: Response): Promise<void> {
    const q = consulta(req);
    const periodo = textoDeConsulta(q.periodo);
    const carreraId = enteroDeConsulta(q.carrera_id, 0) || undefined;
    const empresaId = enteroDeConsulta(q.empresa_id, 0) || undefined;

    ok(
      res,
      await Vinculacion.indicadores({
        periodo,
        carrera_id: carreraId,
        empresa_id: empresaId,
      }),
    );
  },

  /** GET /admin/empresas — pendientes de validacion. */
  async empresasEnRevision(req: Request, res: Response): Promise<void> {
    ok(res, await Vinculacion.empresasEnRevision());
  },

  /** POST /admin/empresas/{id}/aprobar */
  async aprobarEmpresa(req: Request, res: Response): Promise<void> {
    ok(
      res,
      await Vinculacion.aprobarEmpresa(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        req.ip,
      ),
    );
  },

  /** POST /admin/empresas/{id}/rechazar  (motivo obligatorio) */
  async rechazarEmpresa(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      motivo: "required|string|max:255",
    });

    ok(
      res,
      await Vinculacion.rechazarEmpresa(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        String(datos.motivo),
        req.ip,
      ),
    );
  },

  /** GET /admin/reportes — abiertos, ordenados por antigüedad. */
  async reportesAbiertos(req: Request, res: Response): Promise<void> {
    ok(res, await Vinculacion.reportesAbiertos());
  },

  /** PUT /admin/reportes/{id} */
  async resolverReporte(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      estado: "required|string|max:20",
      detalle: "nullable|string|max:600",
    });

    ok(
      res,
      await Vinculacion.resolverReporte(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        {
          estado: String(datos.estado),
          detalle: datos.detalle === undefined ? undefined : String(datos.detalle),
        },
        req.ip,
      ),
    );
  },

  /** POST /admin/vacantes/{id}/baja  (motivo obligatorio) */
  async darBajaVacante(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      motivo: "required|string|max:255",
    });

    ok(
      res,
      await Vinculacion.darBajaVacante(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        String(datos.motivo),
        req.ip,
      ),
    );
  },

  /** GET /admin/exportar/{recurso}?estado=&estatus_validacion= */
  async exportar(req: Request, res: Response): Promise<void> {
    const recurso = parametro(req, "recurso");
    const q = consulta(req);

    const { contenido, filename } = await Vinculacion.exportar(recurso, {
      estado: textoDeConsulta(q.estado),
      estatus_validacion: textoDeConsulta(q.estatus_validacion),
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(contenido);
  },

  /** GET /admin/usuarios?pagina=&por_pagina=&rol=&estado= */
  async usuarios(req: Request, res: Response): Promise<void> {
    const q = consulta(req);
    const pagina = Math.max(1, enteroDeConsulta(q.pagina, 1));
    const porPagina = Math.min(100, Math.max(1, enteroDeConsulta(q.por_pagina, 15)));

    const { filas, total } = await Vinculacion.usuarios({
      pagina,
      por_pagina: porPagina,
      rol: textoDeConsulta(q.rol),
      estado: textoDeConsulta(q.estado),
    });

    ok(res, filas, metaPaginacion(pagina, porPagina, total));
  },

  /** PUT /admin/usuarios/{id}/rol */
  async cambiarRol(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      rol: "required|string|max:40",
    });

    ok(
      res,
      await Vinculacion.cambiarRol(
        req.usuario!.id,
        parametroNumerico(req, "id"),
        String(datos.rol),
        req.ip,
      ),
    );
  },

  /** GET /admin/postulaciones/{id}/cv — enlace firmado (CA-10). */
  async cvDePostulacion(req: Request, res: Response): Promise<void> {
    ok(res, await Vinculacion.cvDePostulacion(parametroNumerico(req, "id")));
  },

  /** GET /admin/bitacora?pagina=&por_pagina=&entidad=&accion= */
  async bitacora(req: Request, res: Response): Promise<void> {
    const q = consulta(req);
    const pagina = Math.max(1, enteroDeConsulta(q.pagina, 1));
    const porPagina = Math.min(100, Math.max(1, enteroDeConsulta(q.por_pagina, 15)));

    const { filas, total } = await Vinculacion.consultarBitacora({
      pagina,
      por_pagina: porPagina,
      entidad: textoDeConsulta(q.entidad),
      accion: textoDeConsulta(q.accion),
    });

    ok(res, filas, metaPaginacion(pagina, porPagina, total));
  },
};
