/**
 * Servicio de favoritos.
 *
 * Guardar una vacante es idempotente: si el alumno la guarda dos veces, la
 * segunda peticion no falla ni duplica la fila, porque la llave primaria es el
 * par (estudiante, vacante).
 *
 * Solo se pueden guardar vacantes que existan. No se exige que esten
 * publicadas: si el alumno guardo una vacante y la empresa la pauso, sigue en su
 * lista y el estado se ve en la respuesta.
 */
import { db } from "../../support/database/connection";
import { NoEncontrado, SinPermiso } from "../../support/http/errors";
import type { Registro } from "../../support/model";
import { Estudiante } from "../models/Estudiante";
import { Favorito } from "../models/Favorito";
import { Vacante } from "../models/Vacante";

async function alumnoDe(userId: number): Promise<Registro> {
  const perfil = await Estudiante.porUserId(userId);
  if (!perfil) throw new SinPermiso("Tu cuenta no tiene un perfil de estudiante asociado.");
  return perfil;
}

/** Forma de la respuesta: vacante resumida con el salario ya presentado. */
function presentar(fila: Registro): Registro {
  const mostrar = Boolean(Number(fila.mostrar_salario));

  return {
    vacante: {
      id: Number(fila.id),
      titulo: fila.titulo,
      empresa: fila.empresa_nombre,
      tipo: fila.tipo,
      modalidad: fila.modalidad,
      ciudad: fila.ciudad,
      estado: fila.estado,
      fecha_cierre: fila.fecha_cierre,
      salario: mostrar
        ? {
            min: fila.salario_min === null ? null : Number(fila.salario_min),
            max: fila.salario_max === null ? null : Number(fila.salario_max),
            mostrar: true,
          }
        : { min: null, max: null, mostrar: false },
    },
    guardado_en: fila.guardado_en,
  };
}

export const Favoritos = {
  async listar(userId: number): Promise<Registro[]> {
    const alumno = await alumnoDe(userId);
    const filas = await Favorito.deEstudiante(Number(alumno.id));
    return filas.map(presentar);
  },

  async guardar(userId: number, vacanteId: number): Promise<Registro> {
    const alumno = await alumnoDe(userId);

    const vacante = await Vacante.buscar(vacanteId);
    if (!vacante) throw new NoEncontrado("La vacante no existe.");

    // `onConflict().ignore()` es el INSERT IGNORE de MySQL: si ya estaba
    // guardada, no hace nada y tampoco lanza el error del indice unico.
    await db("favoritos")
      .insert({
        estudiante_id: alumno.id,
        vacante_id: vacanteId,
        creado_en: new Date(),
      })
      .onConflict(["estudiante_id", "vacante_id"])
      .ignore();

    const fila = (await Favorito.deEstudiante(Number(alumno.id))).find(
      (f) => Number(f.id) === vacanteId,
    );

    return fila
      ? presentar(fila)
      : { vacante: { id: vacanteId, titulo: vacante.titulo }, guardado_en: new Date() };
  },

  async quitar(userId: number, vacanteId: number): Promise<void> {
    const alumno = await alumnoDe(userId);
    const borradas = await Favorito.quitar(Number(alumno.id), vacanteId);

    if (borradas === 0) {
      throw new NoEncontrado("Esa vacante no esta en tus favoritos.");
    }
  },
};
