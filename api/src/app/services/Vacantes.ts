/**
 * Servicio de vacantes.
 *
 * Aqui vive la maquina de estados del apartado 7.7 y las dos reglas que el
 * servidor no puede delegar a la interfaz:
 *
 *   1. Una empresa solo publica si su estatus de validacion es "aprobada".
 *   2. Solo se llega a un estado por la transicion permitida; cualquier otro
 *      cambio responde 409.
 *
 * La propiedad del recurso se comprueba antes que el estado y responde 404, no
 * 403, para no revelar que la vacante existe (apartado 5.5).
 */
import { db } from "../../support/database/connection";
import { Conflicto, NoEncontrado, PeticionInvalida, SinPermiso } from "../../support/http/errors";
import { registrar as bitacora } from "../../support/bitacora";
import { hoyLocal } from "../../support/fechas";
import type { Registro } from "../../support/model";
import { Empresa } from "../models/Empresa";
import { Notificacion } from "../models/Notificacion";
import { Vacante } from "../models/Vacante";

/** Estados en los que la empresa puede editar el contenido. */
const EDITABLES = ["borrador", "rechazada"];
/** Estados desde los que se puede enviar a revision. */
const ENVIABLES = ["borrador", "rechazada"];

/** Campos que la empresa controla. El resto (estado, moderacion) lo decide el sistema. */
const CAMPOS_EDITABLES = [
  "titulo",
  "descripcion",
  "requisitos",
  "actividades",
  "tipo",
  "modalidad",
  "ciudad",
  "estado_geo",
  "salario_min",
  "salario_max",
  "mostrar_salario",
  "fecha_cierre",
  "carrera_id",
] as const;

function soloEditables(datos: Registro): Registro {
  const salida: Registro = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (datos[campo] !== undefined) salida[campo] = datos[campo];
  }
  return salida;
}

/** Comprueba el rango salarial. Un minimo mayor que el maximo es un dato invalido. */
function validarSalario(datos: Registro): void {
  const min = datos.salario_min === undefined || datos.salario_min === null ? null : Number(datos.salario_min);
  const max = datos.salario_max === undefined || datos.salario_max === null ? null : Number(datos.salario_max);

  if (min !== null && max !== null && min > max) {
    throw new PeticionInvalida("El salario minimo no puede ser mayor que el maximo.");
  }
}

/** Exige que la vacante este en uno de los estados permitidos para la accion. */
function exigirEstado(vacante: Registro, permitidos: string[], accion: string): void {
  const estado = String(vacante.estado);
  if (!permitidos.includes(estado)) {
    throw new Conflicto(
      `No se puede ${accion} una vacante en estado "${estado}". Estados permitidos: ${permitidos.join(", ")}.`,
    );
  }
}

/** Devuelve el perfil de empresa de la cuenta o corta con 403. */
async function empresaDe(userId: number): Promise<Registro> {
  const empresa = await Empresa.porUserId(userId);
  if (!empresa) throw new SinPermiso("Tu cuenta no tiene un perfil de empresa asociado.");
  return empresa;
}

/** Devuelve la vacante si pertenece a la empresa; si no, 404. */
async function propia(empresaId: number, vacanteId: number): Promise<Registro> {
  const vacante = await Vacante.buscar(vacanteId);
  if (!vacante || Number(vacante.empresa_id) !== empresaId) {
    throw new NoEncontrado("La vacante no existe o no pertenece a tu empresa.");
  }
  return vacante;
}

/** Forma que consume el panel de la empresa: todos los campos utiles, sin los de moderacion. */
function presentarPropia(fila: Registro): Registro {
  return {
    ...(Vacante.presentar(fila) as Registro),
    estado: fila.estado,
    motivo_rechazo: fila.motivo_rechazo ?? null,
    fecha_publicacion: fila.fecha_publicacion ?? null,
    fecha_cierre: fila.fecha_cierre,
    postulaciones: fila.postulaciones === undefined ? undefined : Number(fila.postulaciones),
    creado_en: fila.creado_en,
    actualizado_en: fila.actualizado_en,
  };
}

export const Vacantes = {
  // ---------------------------------------------------------------- empresa

  async listar(userId: number, estado?: string): Promise<Registro[]> {
    const empresa = await empresaDe(userId);

    const consulta = Vacante.q()
      .leftJoin("postulaciones as p", "p.vacante_id", "vacantes.id")
      .where("vacantes.empresa_id", empresa.id)
      .groupBy("vacantes.id")
      .select("vacantes.*")
      .count({ postulaciones: "p.id" })
      .orderBy("vacantes.creado_en", "desc");

    if (estado) consulta.where("vacantes.estado", estado);

    const filas = (await consulta) as unknown as Registro[];
    return filas.map(presentarPropia);
  },

  async detallePropio(userId: number, vacanteId: number): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    const fila = await Vacante.q()
      .leftJoin("postulaciones as p", "p.vacante_id", "vacantes.id")
      .where("vacantes.id", vacanteId)
      .groupBy("vacantes.id")
      .select("vacantes.*")
      .count({ postulaciones: "p.id" })
      .first();

    return presentarPropia(fila as Registro);
  },

  async crear(userId: number, datos: Registro): Promise<Registro> {
    const empresa = await empresaDe(userId);

    if (empresa.estatus_validacion !== "aprobada") {
      throw new SinPermiso(
        "Tu empresa aun no esta validada por Vinculacion, por lo que no puede publicar vacantes.",
      );
    }

    validarSalario(datos);

    const [id] = await Vacante.q().insert({
      ...soloEditables(datos),
      empresa_id: empresa.id,
      // Toda vacante nace como borrador (apartado 7.2).
      estado: "borrador",
      vistas: 0,
    });

    return this.detallePropio(userId, Number(id));
  },

  async actualizar(userId: number, vacanteId: number, datos: Registro): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    exigirEstado(vacante, EDITABLES, "editar");

    const cambios = soloEditables(datos);
    validarSalario({ ...vacante, ...cambios });

    if (Object.keys(cambios).length > 0) {
      await Vacante.actualizar(vacanteId, cambios);
    }

    return this.detallePropio(userId, vacanteId);
  },

  /** Envia a revision. Valida el formato completo, no solo que existan los campos. */
  async enviar(userId: number, vacanteId: number): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    exigirEstado(vacante, ENVIABLES, "enviar a revision");

    const faltantes: string[] = [];
    for (const campo of ["titulo", "descripcion", "requisitos", "tipo", "modalidad", "ciudad", "fecha_cierre"]) {
      if (vacante[campo] === null || vacante[campo] === undefined || String(vacante[campo]).trim() === "") {
        faltantes.push(campo);
      }
    }
    if (faltantes.length > 0) {
      throw new PeticionInvalida(
        `Antes de enviar a revision completa: ${faltantes.join(", ")}.`,
      );
    }

    if (String(vacante.fecha_cierre) < hoyLocal()) {
      throw new Conflicto("La fecha de cierre ya paso. Actualizala antes de enviar la vacante.");
    }

    await Vacante.actualizar(vacanteId, { estado: "en_revision", motivo_rechazo: null });

    return this.detallePropio(userId, vacanteId);
  },

  async pausar(userId: number, vacanteId: number): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    exigirEstado(vacante, ["publicada"], "pausar");
    await Vacante.actualizar(vacanteId, { estado: "pausada" });

    return this.detallePropio(userId, vacanteId);
  },

  async reactivar(userId: number, vacanteId: number): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    exigirEstado(vacante, ["pausada"], "reactivar");

    if (String(vacante.fecha_cierre) < hoyLocal()) {
      throw new Conflicto("La vacante ya vencio. Crea una nueva o actualiza la fecha de cierre.");
    }

    await Vacante.actualizar(vacanteId, { estado: "publicada" });
    return this.detallePropio(userId, vacanteId);
  },

  async cerrar(userId: number, vacanteId: number): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    exigirEstado(vacante, ["publicada", "pausada"], "cerrar");
    await Vacante.actualizar(vacanteId, { estado: "cerrada" });

    return this.detallePropio(userId, vacanteId);
  },

  /** Solo se elimina una vacante en borrador: las demas conservan historial. */
  async eliminar(userId: number, vacanteId: number): Promise<void> {
    const empresa = await empresaDe(userId);
    const vacante = await propia(Number(empresa.id), vacanteId);

    exigirEstado(vacante, ["borrador"], "eliminar");
    await Vacante.borrar(vacanteId);
  },

  // ------------------------------------------------------------ moderacion

  async aprobar(moderadorId: number, vacanteId: number, ip?: string): Promise<Registro> {
    const vacante = await Vacante.buscar(vacanteId);
    if (!vacante) throw new NoEncontrado("La vacante no existe.");

    exigirEstado(vacante, ["en_revision"], "aprobar");

    await Vacante.actualizar(vacanteId, {
      estado: "publicada",
      fecha_publicacion: vacante.fecha_publicacion ?? new Date(),
      moderado_por: moderadorId,
      moderado_en: new Date(),
      motivo_rechazo: null,
    });

    const empresa = await Empresa.buscar(Number(vacante.empresa_id));
    if (empresa) {
      await Notificacion.enviar(Number(empresa.user_id), {
        tipo: "vacante_aprobada",
        titulo: "Tu vacante ya esta publicada",
        mensaje: `"${vacante.titulo}" ya aparece en el buscador de Job ITM.`,
        url: `/empresa/vacantes/${vacanteId}`,
      });
    }

    await bitacora({
      userId: moderadorId,
      accion: "aprobar_vacante",
      entidad: "vacantes",
      entidadId: vacanteId,
      anteriores: { estado: vacante.estado },
      nuevos: { estado: "publicada" },
      ip,
    });

    return Vacante.presentar(await Vacante.buscar(vacanteId)) as Registro;
  },

  async rechazar(
    moderadorId: number,
    vacanteId: number,
    motivo: string,
    ip?: string,
  ): Promise<Registro> {
    const vacante = await Vacante.buscar(vacanteId);
    if (!vacante) throw new NoEncontrado("La vacante no existe.");

    exigirEstado(vacante, ["en_revision"], "rechazar");

    await Vacante.actualizar(vacanteId, {
      estado: "rechazada",
      motivo_rechazo: motivo,
      moderado_por: moderadorId,
      moderado_en: new Date(),
    });

    const empresa = await Empresa.buscar(Number(vacante.empresa_id));
    if (empresa) {
      await Notificacion.enviar(Number(empresa.user_id), {
        tipo: "vacante_rechazada",
        titulo: "Tu vacante necesita correcciones",
        mensaje: `"${vacante.titulo}": ${motivo}`,
        url: `/empresa/vacantes/${vacanteId}`,
      });
    }

    await bitacora({
      userId: moderadorId,
      accion: "rechazar_vacante",
      entidad: "vacantes",
      entidadId: vacanteId,
      anteriores: { estado: vacante.estado },
      nuevos: { estado: "rechazada", motivo_rechazo: motivo },
      ip,
    });

    return Vacante.presentar(await Vacante.buscar(vacanteId)) as Registro;
  },

  /** Bandeja de Vinculacion: vacantes en revision, primero las mas antiguas. */
  async bandeja(estado = "en_revision"): Promise<Registro[]> {
    const filas = (await Vacante.q()
      .join("empresas as e", "e.id", "vacantes.empresa_id")
      .where("vacantes.estado", estado)
      .orderBy("vacantes.actualizado_en", "asc")
      .select(
        "vacantes.id",
        "vacantes.titulo",
        "vacantes.tipo",
        "vacantes.modalidad",
        "vacantes.ciudad",
        "vacantes.estado",
        "vacantes.fecha_cierre",
        "vacantes.actualizado_en",
        "e.razon_social as empresa",
        "e.id as empresa_id",
      )) as Registro[];

    return filas.map((f) => ({
      ...f,
      id: Number(f.id),
      empresa_id: Number(f.empresa_id),
    }));
  },
};

/** Cuenta cuantas vacantes tiene la empresa, agrupadas por estado. */
export async function resumenEmpresa(empresaId: number): Promise<Record<string, number>> {
  const filas = (await db("vacantes")
    .where({ empresa_id: empresaId })
    .groupBy("estado")
    .select("estado")
    .count({ total: "*" })) as unknown as Array<{ estado: string; total: string | number }>;

  const resumen: Record<string, number> = {};
  for (const fila of filas) resumen[fila.estado] = Number(fila.total);
  return resumen;
}
