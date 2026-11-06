/**
 * Controlador del panel de la empresa (apartado 5.5).
 *
 * Todas las acciones verifican, ademas del permiso, que el recurso pertenezca a
 * la empresa autenticada. Un identificador ajeno responde 404 y no 403, para no
 * revelar que existe.
 */
import type { Request, Response } from "express";

import { creado, ok, sinContenido } from "../../support/http/response";
import { cuerpo, parametroNumerico, textoDeConsulta } from "../../support/http/request";
import { validar } from "../../support/validation/validator";
import { PeticionInvalida } from "../../support/http/errors";
import { Perfiles } from "../services/Perfiles";
import { resumenEmpresa, Vacantes } from "../services/Vacantes";

/** Reglas del formulario estandarizado de vacante. */
const REGLAS_VACANTE = {
  titulo: "nullable|string|max:140",
  descripcion: "nullable|string|max:5000",
  requisitos: "nullable|string|max:5000",
  actividades: "nullable|string|max:5000",
  tipo: "nullable|in:practicas,servicio_social,servicios_profesionales,temporal,planta",
  modalidad: "nullable|in:presencial,hibrida,remota",
  ciudad: "nullable|string|max:80",
  estado_geo: "nullable|string|max:80",
  salario_min: "nullable|numeric|min:0",
  salario_max: "nullable|numeric|min:0",
  mostrar_salario: "nullable|boolean",
  fecha_cierre: "nullable|date",
  carrera_id: "nullable|integer|exists:carreras,id",
};

export const EmpresaController = {
  // ---------------------------------------------------------------- tablero

  async tablero(req: Request, res: Response): Promise<void> {
    const empresa = await Perfiles.empresaOError(req.usuario!.id);
    const porEstado = await resumenEmpresa(Number(empresa.id));

    ok(res, {
      empresa: {
        id: Number(empresa.id),
        razon_social: empresa.razon_social,
        estatus_validacion: empresa.estatus_validacion,
      },
      vacantes: {
        total: Object.values(porEstado).reduce((suma, n) => suma + n, 0),
        por_estado: porEstado,
        publicadas: porEstado.publicada ?? 0,
      },
    });
  },

  // ----------------------------------------------------------------- perfil

  async verPerfil(req: Request, res: Response): Promise<void> {
    ok(res, await Perfiles.empresa(req.usuario!.id));
  },

  async actualizarPerfil(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      nombre: "nullable|string|max:120",
      razon_social: "nullable|string|max:160",
      giro: "nullable|string|max:80",
      sitio_web: "nullable|url|max:120",
      telefono: "nullable|string|max:15",
      contacto_nombre: "nullable|string|max:120",
      contacto_correo: "nullable|email|max:150",
    });

    ok(res, await Perfiles.actualizarEmpresa(req.usuario!.id, datos));
  },

  async subirLogo(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new PeticionInvalida("Adjunta el logo en el campo \"logo\" (multipart/form-data).");
    }
    creado(res, await Perfiles.guardarLogo(req.usuario!.id, req.file.buffer));
  },

  // --------------------------------------------------------------- vacantes

  async listarVacantes(req: Request, res: Response): Promise<void> {
    const estado = textoDeConsulta(consulta(req).estado);
    ok(res, await Vacantes.listar(req.usuario!.id, estado));
  },

  async verVacante(req: Request, res: Response): Promise<void> {
    ok(res, await Vacantes.detallePropio(req.usuario!.id, parametroNumerico(req, "id")));
  },

  async crearVacante(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      ...REGLAS_VACANTE,
      titulo: "required|string|max:140",
      descripcion: "required|string|max:5000",
      requisitos: "required|string|max:5000",
      tipo: "required|in:practicas,servicio_social,servicios_profesionales,temporal,planta",
      modalidad: "required|in:presencial,hibrida,remota",
      ciudad: "required|string|max:80",
      fecha_cierre: "required|date|after:hoy",
    });

    creado(res, await Vacantes.crear(req.usuario!.id, datos));
  },

  async actualizarVacante(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      ...REGLAS_VACANTE,
      fecha_cierre: "nullable|date",
    });

    ok(res, await Vacantes.actualizar(req.usuario!.id, parametroNumerico(req, "id"), datos));
  },

  async enviarVacante(req: Request, res: Response): Promise<void> {
    ok(res, await Vacantes.enviar(req.usuario!.id, parametroNumerico(req, "id")));
  },

  async pausarVacante(req: Request, res: Response): Promise<void> {
    ok(res, await Vacantes.pausar(req.usuario!.id, parametroNumerico(req, "id")));
  },

  async reactivarVacante(req: Request, res: Response): Promise<void> {
    ok(res, await Vacantes.reactivar(req.usuario!.id, parametroNumerico(req, "id")));
  },

  async cerrarVacante(req: Request, res: Response): Promise<void> {
    ok(res, await Vacantes.cerrar(req.usuario!.id, parametroNumerico(req, "id")));
  },

  async eliminarVacante(req: Request, res: Response): Promise<void> {
    await Vacantes.eliminar(req.usuario!.id, parametroNumerico(req, "id"));
    sinContenido(res);
  },
};

/** Acceso corto a la consulta, para no repetir el cast en cada metodo. */
function consulta(req: Request): Record<string, unknown> {
  return (req.query ?? {}) as Record<string, unknown>;
}
