/**
 * Servicio de perfiles.
 *
 * El perfil del alumno y el de la empresa se editan por caminos distintos porque
 * tienen reglas distintas: el alumno puede cambiar de carrera y subir su
 * curriculum; la empresa no puede cambiarse el estatus de validacion ni el RFC
 * por su cuenta, porque de eso depende que sus vacantes sean confiables.
 */
import { config } from "../../config";
import { db } from "../../support/database/connection";
import { NoEncontrado, PeticionInvalida, SinPermiso } from "../../support/http/errors";
import type { Registro } from "../../support/model";
import { borrarArchivo, esImagen, esPdf, guardarArchivo } from "../../support/storage/archivos";
import { firmarRecurso } from "../../support/auth/firmas";
import { Carrera } from "../models/Carrera";
import { Empresa } from "../models/Empresa";
import { Estudiante } from "../models/Estudiante";
import { User } from "../models/User";

/** Minutos de vigencia de los enlaces de descarga (apartado 8.3). */
const MINUTOS_ENLACE = 5;

export const Perfiles = {
  // ------------------------------------------------------------- estudiante

  /** Perfil academico completo, con el nombre de la carrera. */
  async estudiante(userId: number): Promise<Registro> {
    const fila = await Estudiante.conCarrera(userId);
    if (!fila) throw new NoEncontrado("No existe un perfil de estudiante para esta cuenta.");
    return Estudiante.presentar(fila) as Registro;
  },

  async actualizarEstudiante(userId: number, datos: Registro): Promise<Registro> {
    const perfil = await Estudiante.porUserId(userId);
    if (!perfil) throw new NoEncontrado("No existe un perfil de estudiante para esta cuenta.");

    if (datos.carrera_id !== undefined) {
      const carrera = await Carrera.buscar(Number(datos.carrera_id));
      if (!carrera) throw new NoEncontrado("La carrera seleccionada no existe.");
    }

    // Semestre y anio de egreso son excluyentes: quien ya egreso no cursa
    // semestre, y quien cursa no tiene anio de egreso.
    const cambios: Registro = { ...datos };
    if (datos.anio_egreso) cambios.semestre = null;
    if (datos.semestre) cambios.anio_egreso = null;

    await db.transaction(async (trx) => {
      if (datos.nombre !== undefined) {
        await User.actualizar(userId, { nombre: datos.nombre }, trx);
        delete cambios.nombre;
      }
      if (Object.keys(cambios).length > 0) {
        await Estudiante.actualizar(perfil.id, cambios, trx);
      }
    });

    return this.estudiante(userId);
  },

  /** Guarda el curriculum validando que sea un PDF real. */
  async guardarCv(userId: number, contenido: Buffer): Promise<Registro> {
    const perfil = await Estudiante.porUserId(userId);
    if (!perfil) throw new NoEncontrado("No existe un perfil de estudiante para esta cuenta.");

    if (!esPdf(contenido)) {
      throw new PeticionInvalida("El curriculum debe ser un archivo PDF.");
    }

    const limite = config.archivos.cvMaxMb * 1024 * 1024;
    if (contenido.length > limite) {
      throw new PeticionInvalida(`El curriculum no debe superar ${config.archivos.cvMaxMb} MB.`);
    }

    const ruta = await guardarArchivo("cv", contenido, "pdf");

    // El archivo anterior se borra despues de guardar el nuevo: si algo falla a
    // medio camino, el alumno conserva su curriculum vigente.
    if (perfil.cv_ruta) await borrarArchivo(String(perfil.cv_ruta));

    await Estudiante.actualizar(perfil.id, {
      cv_ruta: ruta,
      cv_actualizado_en: new Date(),
    });

    return {
      cv_ruta: ruta,
      cv_actualizado_en: new Date().toISOString(),
      tamano_bytes: contenido.length,
    };
  },

  /** Enlace firmado para descargar el curriculum propio. */
  async enlaceCv(userId: number): Promise<{ url: string; expira: number }> {
    const perfil = await Estudiante.porUserId(userId);
    if (!perfil) throw new NoEncontrado("No existe un perfil de estudiante para esta cuenta.");
    if (!perfil.cv_ruta) throw new NoEncontrado("Todavia no has cargado tu curriculum.");

    return crearEnlaceCv(Number(perfil.id));
  },

  // ---------------------------------------------------------------- empresa

  async empresa(userId: number): Promise<Registro> {
    const fila = await Empresa.porUserId(userId);
    if (!fila) throw new NoEncontrado("No existe un perfil de empresa para esta cuenta.");
    return Empresa.presentar(fila) as Registro;
  },

  /**
   * Actualiza los datos de la organizacion.
   *
   * `estatus_validacion`, `rfc` y `validado_por` no se tocan: el RFC identifica
   * a la organizacion y el estatus lo decide Vinculacion. Si la empresa corrige
   * datos despues de un rechazo, vuelve a quedar pendiente para que alguien la
   * revise otra vez.
   */
  async actualizarEmpresa(userId: number, datos: Registro): Promise<Registro> {
    const perfil = await Empresa.porUserId(userId);
    if (!perfil) throw new NoEncontrado("No existe un perfil de empresa para esta cuenta.");

    const cambios: Registro = { ...datos };
    delete cambios.estatus_validacion;
    delete cambios.rfc;
    delete cambios.validado_por;
    delete cambios.validado_en;

    if (perfil.estatus_validacion === "rechazada") {
      cambios.estatus_validacion = "pendiente";
      cambios.motivo_rechazo = null;
    }

    await db.transaction(async (trx) => {
      if (datos.nombre !== undefined) {
        await User.actualizar(userId, { nombre: datos.nombre }, trx);
        delete cambios.nombre;
      }
      if (Object.keys(cambios).length > 0) {
        await Empresa.actualizar(perfil.id, cambios, trx);
      }
    });

    return this.empresa(userId);
  },

  async guardarLogo(userId: number, contenido: Buffer): Promise<Registro> {
    const perfil = await Empresa.porUserId(userId);
    if (!perfil) throw new NoEncontrado("No existe un perfil de empresa para esta cuenta.");

    if (!esImagen(contenido)) {
      throw new PeticionInvalida("El logo debe ser una imagen PNG o JPG.");
    }

    const limite = 2 * 1024 * 1024;
    if (contenido.length > limite) {
      throw new PeticionInvalida("El logo no debe superar 2 MB.");
    }

    const extension = contenido[0] === 0x89 ? "png" : "jpg";
    const ruta = await guardarArchivo("logos", contenido, extension);

    if (perfil.logo_ruta) await borrarArchivo(String(perfil.logo_ruta));
    await Empresa.actualizar(perfil.id, { logo_ruta: ruta });

    return { logo_ruta: ruta, tamano_bytes: contenido.length };
  },

  /** Comprueba que la cuenta tenga perfil de empresa y lo devuelve. */
  async empresaOError(userId: number): Promise<Registro> {
    const fila = await Empresa.porUserId(userId);
    if (!fila) {
      throw new SinPermiso("Tu cuenta no tiene un perfil de empresa asociado.");
    }
    return fila;
  },
};

/** Enlace firmado de descarga de un curriculum. */
export function crearEnlaceCv(estudianteId: number): { url: string; expira: number } {
  const { expira, firma } = firmarRecurso(`cv:${estudianteId}`, MINUTOS_ENLACE);
  return {
    url: `${config.app.url}/api/v1/archivos/cv/${estudianteId}?expira=${expira}&firma=${firma}`,
    expira,
  };
}
