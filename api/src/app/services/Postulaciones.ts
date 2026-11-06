/**
 * Servicio de postulaciones.
 *
 * Cubre las dos mitades del flujo del apartado 7.3 y 7.4:
 *
 *   Alumno   postularse, ver su historial, cancelar mientras no fue revisada.
 *   Empresa  ver candidatos, abrir su perfil, moverlos de etapa y exportar.
 *
 * Reglas que no se delegan a la interfaz:
 *
 *   - Solo se postula a una vacante publicada y vigente; si no, 404, igual que
 *     en el buscador, para no revelar vacantes internas.
 *   - No se postula dos veces a la misma vacante.
 *   - Se exige correo verificado y curriculum cargado (apartado 7.1).
 *   - El curriculum se copia al postularse: el perfil puede cambiar despues y
 *     la empresa debe seguir viendo el archivo que recibio.
 *   - Una candidatura ya revisada no se cancela ni se mueve a un estado final.
 *   - Las notas de la empresa nunca salen en una respuesta del alumno.
 */
import { db } from "../../support/database/connection";
import { Conflicto, ErrorValidacion, NoEncontrado, SinPermiso } from "../../support/http/errors";
import { registrar as bitacora } from "../../support/bitacora";
import { fechaEnApp, hoyLocal } from "../../support/fechas";
import type { Registro } from "../../support/model";
import { leerArchivo, guardarArchivo } from "../../support/storage/archivos";
import { firmarRecurso } from "../../support/auth/firmas";
import { config } from "../../config";
import { Empresa } from "../models/Empresa";
import { Estudiante } from "../models/Estudiante";
import { Postulacion } from "../models/Postulacion";
import { Vacante } from "../models/Vacante";
import { Avisos } from "./Avisos";

/** Minutos de vigencia del enlace de descarga del curriculum. */
const MINUTOS_ENLACE = 5;

/** Estados en los que el alumno todavia puede retirar su candidatura. */
const CANCELABLES = ["recibida"];

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Perfil de alumno de la cuenta o 403 si la cuenta no es de estudiante. */
async function alumnoDe(userId: number): Promise<Registro> {
  const perfil = await Estudiante.porUserId(userId);
  if (!perfil) throw new SinPermiso("Tu cuenta no tiene un perfil de estudiante asociado.");
  return perfil;
}

/** Perfil de empresa de la cuenta o 403. */
async function empresaDe(userId: number): Promise<Registro> {
  const perfil = await Empresa.porUserId(userId);
  if (!perfil) throw new SinPermiso("Tu cuenta no tiene un perfil de empresa asociado.");
  return perfil;
}

/**
 * Candidatura que pertenece a una vacante de la empresa autenticada.
 * Si el identificador es ajeno responde 404, no 403 (apartado 5.5).
 */
async function candidatoDe(empresaId: number, postulacionId: number): Promise<Registro> {
  const fila = await Postulacion.conContexto(postulacionId);
  if (!fila || Number(fila.empresa_id) !== empresaId) {
    throw new NoEncontrado("La candidatura no existe o no pertenece a una vacante de tu empresa.");
  }
  return fila;
}

/** Datos minimos de contacto de una cuenta, para los avisos. */
async function contacto(userId: number): Promise<{ userId: number; correo: string; nombre: string }> {
  const fila = await db("users").where({ id: userId }).first();
  return {
    userId,
    correo: String(fila?.correo ?? ""),
    nombre: String(fila?.nombre ?? ""),
  };
}

/**
 * Lee una columna JSON sin depender del driver.
 *
 * MySQL devuelve las columnas JSON ya convertidas en objeto, pero si alguna vez
 * viajan como texto (o la fila viene de un respaldo) hay que poder leerlas
 * igual. Un JSON invalido no debe romper la pantalla: se ignora.
 */
function leerJson(valor: unknown): Registro | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "object") return valor as Registro;

  try {
    return JSON.parse(String(valor)) as Registro;
  } catch {
    return null;
  }
}

/**
 * Linea de tiempo de la candidatura.
 *
 * El diccionario de datos solo guarda `fecha_estado` (la del ultimo cambio), de
 * modo que el recorrido completo se reconstruye con la bitacora: cada
 * transicion se anota ahi al ocurrir. Si por alguna razon no hay registros, se
 * devuelve al menos el estado actual para no dejar la pantalla vacia.
 */
async function historial(postulacionId: number, actual: Registro): Promise<Registro[]> {
  const filas = (await db("bitacora")
    .where({ entidad: "postulaciones", entidad_id: postulacionId })
    .orderBy("creado_en", "asc")
    .select("accion", "datos_nuevos", "creado_en")) as Registro[];

  const eventos: Registro[] = [];
  for (const fila of filas) {
    const nuevos = leerJson(fila.datos_nuevos);

    const estado = nuevos?.estado;
    if (typeof estado !== "string") continue;

    eventos.push({
      estado,
      estado_etiqueta: Postulacion.etiqueta(estado),
      fecha: fila.creado_en,
      accion: fila.accion,
    });
  }

  if (eventos.length === 0) {
    eventos.push({
      estado: actual.estado,
      estado_etiqueta: Postulacion.etiqueta(String(actual.estado)),
      fecha: actual.fecha_estado,
      accion: "postulacion_recibida",
    });
  }

  return eventos;
}

/** Enlace firmado para el curriculum copiado a la candidatura. */
export function enlaceCvPostulacion(postulacionId: number): { url: string; expira: number } {
  const { expira, firma } = firmarRecurso(`postulacion:${postulacionId}`, MINUTOS_ENLACE);
  return {
    url: `${config.app.url}/api/v1/archivos/postulacion/${postulacionId}?expira=${expira}&firma=${firma}`,
    expira,
  };
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

export const Postulaciones = {
  // -------------------------------------------------------------- alumno

  /** POST /postulaciones */
  async postularse(
    userId: number,
    datos: { vacante_id: number; mensaje?: string },
  ): Promise<Registro> {
    const alumno = await alumnoDe(userId);

    // 7.1: se puede iniciar sesion sin verificar el correo, pero no postularse.
    const cuenta = await db("users").where({ id: userId }).first();
    if (!cuenta?.correo_verificado_en) {
      throw new SinPermiso("Confirma tu correo electronico antes de postularte.");
    }

    if (!alumno.cv_ruta) {
      throw new Conflicto("Antes de postularte carga tu curriculum en PDF desde tu perfil.");
    }

    const vacante = await Vacante.buscar(datos.vacante_id);
    if (
      !vacante ||
      vacante.estado !== "publicada" ||
      String(vacante.fecha_cierre) < hoyLocal()
    ) {
      throw new NoEncontrado("La vacante no existe o ya no esta disponible.");
    }

    const yaExiste = await Postulacion.q()
      .where({ vacante_id: datos.vacante_id, estudiante_id: alumno.id })
      .first();
    if (yaExiste) {
      // CA-06 del criterio de aceptacion: el segundo intento responde 422 con el
      // detalle por campo, como pide el documento, y la base no registra el duplicado.
      throw new ErrorValidacion(
        {
          vacante_id: [
            `Ya tienes una candidatura para "${vacante.titulo}". Revisa su estado en Mis postulaciones.`,
          ],
        },
        "No se pudo enviar la postulacion.",
      );
    }

    // Copia del curriculum vigente. Se guarda un archivo nuevo, no una
    // referencia: si el alumno lo reemplaza, esta candidatura conserva el suyo.
    const contenido = await leerArchivo(String(alumno.cv_ruta));
    const cvCopia = await guardarArchivo("postulaciones", contenido, "pdf");

    const ahora = new Date();
    let postulacionId = 0;
    try {
      postulacionId = await Postulacion.crear({
        vacante_id: datos.vacante_id,
        estudiante_id: alumno.id,
        cv_ruta: cvCopia,
        mensaje: datos.mensaje ?? null,
        estado: "recibida",
        fecha_estado: ahora,
      });
    } catch (error) {
      // El indice unico es la ultima red: dos peticiones simultaneas pueden
      // pasar la comprobacion anterior al mismo tiempo.
      const codigo = (error as { code?: string }).code;
      if (codigo === "ER_DUP_ENTRY") {
        throw new ErrorValidacion(
          { vacante_id: ["Ya tienes una candidatura para esta vacante."] },
          "No se pudo enviar la postulacion.",
        );
      }
      throw error;
    }

    const empresa = await Empresa.buscar(Number(vacante.empresa_id));

    await bitacora({
      userId,
      accion: "postulacion_recibida",
      entidad: "postulaciones",
      entidadId: postulacionId,
      nuevos: { estado: "recibida", vacante_id: datos.vacante_id },
    });

    if (empresa) {
      const destinoEmpresa = await contacto(Number(empresa.user_id));
      // El aviso de la empresa va al contacto de recursos humanos si existe:
      // es quien revisa candidatos, no necesariamente quien creo la cuenta.
      destinoEmpresa.correo = String(empresa.contacto_correo ?? destinoEmpresa.correo);

      await Avisos.postulacionRecibida(
        { ...destinoEmpresa, nombre: String(empresa.razon_social) },
        { userId, correo: String(cuenta.correo), nombre: String(cuenta.nombre) },
        {
          vacanteId: datos.vacante_id,
          vacanteTitulo: String(vacante.titulo),
          empresa: String(empresa.razon_social),
        },
      );
    }

    return this.detalleMio(userId, postulacionId);
  },

  /** GET /mis-postulaciones */
  async mias(
    userId: number,
    pagina: number,
    porPagina: number,
  ): Promise<{ filas: Registro[]; total: number }> {
    const alumno = await alumnoDe(userId);

    const consulta = Postulacion.q()
      .join("vacantes as v", "v.id", "postulaciones.vacante_id")
      .join("empresas as e", "e.id", "v.empresa_id")
      .where("postulaciones.estudiante_id", alumno.id);

    const total = await Postulacion.contar(consulta);

    const filas = (await consulta
      .clone()
      .orderBy("postulaciones.creado_en", "desc")
      .limit(porPagina)
      .offset((pagina - 1) * porPagina)
      .select(
        "postulaciones.id",
        "postulaciones.vacante_id",
        "postulaciones.estado",
        "postulaciones.mensaje",
        "postulaciones.fecha_estado",
        "postulaciones.creado_en",
        "v.titulo as vacante_titulo",
        "v.ciudad as vacante_ciudad",
        "v.modalidad as vacante_modalidad",
        "v.estado as vacante_estado",
        "e.razon_social as empresa_nombre",
      )) as Registro[];

    return { filas: filas.map((f) => Postulacion.presentarAlAlumno(f)), total };
  },

  /** GET /mis-postulaciones/{id} */
  async detalleMio(userId: number, postulacionId: number): Promise<Registro> {
    const alumno = await alumnoDe(userId);
    const fila = await Postulacion.conContexto(postulacionId);

    if (!fila || Number(fila.estudiante_id) !== Number(alumno.id)) {
      throw new NoEncontrado("La candidatura no existe o no pertenece a tu cuenta.");
    }

    return {
      ...Postulacion.presentarAlAlumno(fila),
      linea_de_tiempo: await historial(postulacionId, fila),
    };
  },

  /** DELETE /mis-postulaciones/{id} */
  async cancelar(userId: number, postulacionId: number): Promise<void> {
    const alumno = await alumnoDe(userId);
    const fila = await Postulacion.conContexto(postulacionId);

    if (!fila || Number(fila.estudiante_id) !== Number(alumno.id)) {
      throw new NoEncontrado("La candidatura no existe o no pertenece a tu cuenta.");
    }

    if (!CANCELABLES.includes(String(fila.estado))) {
      throw new Conflicto(
        `Solo puedes cancelar una candidatura que aun no fue revisada. Estado actual: ${Postulacion.etiqueta(String(fila.estado))}.`,
      );
    }

    await Postulacion.borrar(postulacionId);

    await bitacora({
      userId,
      accion: "postulacion_cancelada",
      entidad: "postulaciones",
      entidadId: postulacionId,
      anteriores: { estado: fila.estado, vacante_id: fila.vacante_id },
    });

    const empresa = await Empresa.buscar(Number(fila.empresa_id));
    if (empresa) {
      const destino = await contacto(Number(empresa.user_id));
      destino.correo = String(empresa.contacto_correo ?? destino.correo);
      const cuenta = await contacto(userId);

      await Avisos.postulacionCancelada(
        { ...destino, nombre: String(empresa.razon_social) },
        cuenta,
        {
          vacanteId: Number(fila.vacante_id),
          vacanteTitulo: String(fila.vacante_titulo),
          empresa: String(empresa.razon_social),
        },
      );
    }
  },

  // ------------------------------------------------------------- empresa

  /** GET /empresa/vacantes/{id}/candidatos */
  async candidatosDeVacante(
    userId: number,
    vacanteId: number,
    estado?: string,
  ): Promise<Registro[]> {
    const empresa = await empresaDe(userId);

    const vacante = await Vacante.buscar(vacanteId);
    if (!vacante || Number(vacante.empresa_id) !== Number(empresa.id)) {
      throw new NoEncontrado("La vacante no existe o no pertenece a tu empresa.");
    }

    const consulta = db("postulaciones as p")
      .join("estudiantes as est", "est.id", "p.estudiante_id")
      .join("users as u", "u.id", "est.user_id")
      .leftJoin("carreras as c", "c.id", "est.carrera_id")
      .where("p.vacante_id", vacanteId)
      .orderBy("p.creado_en", "desc")
      .select(
        "p.id",
        "p.estado",
        "p.fecha_estado",
        "p.creado_en",
        "p.notas_empresa",
        "est.matricula",
        "est.semestre",
        "est.anio_egreso",
        "u.nombre as alumno",
        "u.correo",
        "c.nombre as carrera",
      );

    if (estado) consulta.where("p.estado", estado);

    const filas = (await consulta) as Registro[];

    return filas.map((f) => ({
      id: Number(f.id),
      alumno: f.alumno,
      matricula: f.matricula,
      carrera: f.carrera ?? null,
      semestre: f.semestre === null ? null : Number(f.semestre),
      anio_egreso: f.anio_egreso === null ? null : Number(f.anio_egreso),
      estado: f.estado,
      estado_etiqueta: Postulacion.etiqueta(String(f.estado)),
      notas_empresa: f.notas_empresa ?? null,
      fecha_estado: f.fecha_estado,
      postulado_en: f.creado_en,
    }));
  },

  /** GET /empresa/candidatos/{postulacion} */
  async detalleCandidato(userId: number, postulacionId: number): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const fila = await candidatoDe(Number(empresa.id), postulacionId);

    const alumno = (await db("estudiantes as est")
      .join("users as u", "u.id", "est.user_id")
      .leftJoin("carreras as c", "c.id", "est.carrera_id")
      .where("est.id", fila.estudiante_id)
      .select(
        "est.id",
        "est.matricula",
        "est.semestre",
        "est.anio_egreso",
        "est.telefono",
        "est.habilidades",
        "u.nombre",
        "u.correo",
        "c.nombre as carrera",
        "c.clave as carrera_clave",
      )
      .first()) as Registro | undefined;

    return {
      id: Number(fila.id),
      estado: fila.estado,
      estado_etiqueta: Postulacion.etiqueta(String(fila.estado)),
      estado_final: Postulacion.esFinal(String(fila.estado)),
      mensaje: fila.mensaje ?? null,
      notas_empresa: fila.notas_empresa ?? null,
      fecha_estado: fila.fecha_estado,
      postulado_en: fila.creado_en,
      vacante: {
        id: Number(fila.vacante_id),
        titulo: fila.vacante_titulo,
        estado: fila.vacante_estado,
      },
      alumno: alumno
        ? {
            nombre: alumno.nombre,
            correo: alumno.correo,
            matricula: alumno.matricula,
            telefono: alumno.telefono ?? null,
            carrera: alumno.carrera ?? null,
            carrera_clave: alumno.carrera_clave ?? null,
            semestre: alumno.semestre === null ? null : Number(alumno.semestre),
            anio_egreso: alumno.anio_egreso === null ? null : Number(alumno.anio_egreso),
            habilidades: alumno.habilidades ?? null,
          }
        : null,
      curriculum: enlaceCvPostulacion(postulacionId),
      linea_de_tiempo: await historial(postulacionId, fila),
    };
  },

  /** GET /empresa/candidatos/{postulacion}/cv */
  async enlaceCv(userId: number, postulacionId: number): Promise<{ url: string; expira: number }> {
    const empresa = await empresaDe(userId);
    await candidatoDe(Number(empresa.id), postulacionId);
    return enlaceCvPostulacion(postulacionId);
  },

  /** PUT /empresa/candidatos/{postulacion}/estado */
  async cambiarEstado(
    userId: number,
    postulacionId: number,
    datos: { estado: string; notas_empresa?: string | null },
  ): Promise<Registro> {
    const empresa = await empresaDe(userId);
    const fila = await candidatoDe(Number(empresa.id), postulacionId);

    const actual = String(fila.estado);
    const siguiente = datos.estado;

    if (actual === siguiente) {
      throw new Conflicto(`La candidatura ya esta en estado ${Postulacion.etiqueta(actual)}.`);
    }

    if (!Postulacion.transicionValida(actual, siguiente)) {
      throw new Conflicto(
        Postulacion.esFinal(actual)
          ? `La candidatura ya termino en ${Postulacion.etiqueta(actual)} y no admite mas cambios.`
          : `No se puede pasar de ${Postulacion.etiqueta(actual)} a ${Postulacion.etiqueta(siguiente)}: el proceso solo avanza.`,
      );
    }

    const cambios: Registro = { estado: siguiente, fecha_estado: new Date() };
    if (datos.notas_empresa !== undefined) cambios.notas_empresa = datos.notas_empresa;

    await Postulacion.actualizar(postulacionId, cambios);

    await bitacora({
      userId,
      accion: "cambio_estado_postulacion",
      entidad: "postulaciones",
      entidadId: postulacionId,
      anteriores: { estado: actual },
      nuevos: { estado: siguiente },
    });

    const dueno = (await db("estudiantes").where({ id: fila.estudiante_id }).first()) as
      | Registro
      | undefined;
    const destino = dueno ? await contacto(Number(dueno.user_id)) : null;

    if (destino) {
      await Avisos.cambioEstadoPostulacion(
        destino,
        {
          vacanteId: Number(fila.vacante_id),
          vacanteTitulo: String(fila.vacante_titulo),
          empresa: String(fila.empresa_nombre),
        },
        siguiente,
      );
    }

    const detalle = await this.detalleCandidato(userId, postulacionId);

    // 7.4: al contratar, el sistema propone cerrar la vacante pero no lo hace solo.
    if (siguiente === "contratado") {
      detalle.sugerencia = {
        cerrar_vacante: true,
        mensaje:
          "Ya contrataste a un candidato. Puedes cerrar la vacante para que deje de recibir postulaciones.",
        url: `/empresa/vacantes/${fila.vacante_id}/cerrar`,
      };
    }

    return detalle;
  },

  /** GET /empresa/exportar/candidatos?vacante_id= */
  async exportables(userId: number, vacanteId: number): Promise<Registro[]> {
    const empresa = await empresaDe(userId);

    const vacante = await Vacante.buscar(vacanteId);
    if (!vacante || Number(vacante.empresa_id) !== Number(empresa.id)) {
      throw new NoEncontrado("La vacante no existe o no pertenece a tu empresa.");
    }

    const filas = (await db("postulaciones as p")
      .join("estudiantes as est", "est.id", "p.estudiante_id")
      .join("users as u", "u.id", "est.user_id")
      .leftJoin("carreras as c", "c.id", "est.carrera_id")
      .where("p.vacante_id", vacanteId)
      .orderBy("p.creado_en", "asc")
      .select(
        "p.id",
        "p.estado",
        "p.creado_en",
        "p.fecha_estado",
        "u.nombre as alumno",
        "u.correo",
        "est.matricula",
        "est.telefono",
        "c.nombre as carrera",
      )) as Registro[];

    return filas.map((f) => ({
      folio: Number(f.id),
      alumno: f.alumno,
      matricula: f.matricula,
      carrera: f.carrera ?? "",
      correo: f.correo,
      telefono: f.telefono ?? "",
      estado: Postulacion.etiqueta(String(f.estado)),
      // Fecha del calendario en Mexicali, no en UTC: quien abre el CSV espera
      // el dia en que ocurrio el hecho.
      postulado_en: fechaEnApp(f.creado_en),
      ultimo_cambio: fechaEnApp(f.fecha_estado),
    }));
  },
};
