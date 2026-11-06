/**
 * Servicio de reportes ciudadanos.
 *
 * Cualquier usuario autenticado puede reportar una vacante dudosa (apartado
 * 4.4.9). Aqui solo se registra: atenderlos es tarea de Vinculacion y se
 * construye en E-5.
 *
 * Se impide que la misma persona acumule reportes abiertos sobre la misma
 * vacante; si el anterior ya se resolvio o descarto, puede volver a reportar.
 */
import { db } from "../../support/database/connection";
import { Conflicto, NoEncontrado } from "../../support/http/errors";
import type { Registro } from "../../support/model";
import { hoyLocal } from "../../support/fechas";
import { Reporte } from "../models/Reporte";
import { Vacante } from "../models/Vacante";

/** Estados de un reporte que todavia cuentan como abiertos. */
const ABIERTOS = ["nuevo", "en_revision"];

export const Reportes = {
  async crear(
    userId: number,
    datos: { vacante_id: number; motivo: string; detalle?: string | null },
  ): Promise<Registro> {
    const vacante = await Vacante.buscar(datos.vacante_id);
    if (!vacante || vacante.estado !== "publicada" || String(vacante.fecha_cierre) < hoyLocal()) {
      throw new NoEncontrado("La vacante no existe o ya no esta disponible.");
    }

    const abierto = await db("reportes")
      .where({ vacante_id: datos.vacante_id, user_id: userId })
      .whereIn("estado", ABIERTOS)
      .first();

    if (abierto) {
      throw new Conflicto(
        "Ya reportaste esta vacante y el reporte sigue en revision. Vinculacion te avisara cuando lo atienda.",
      );
    }

    const [id] = await db("reportes").insert({
      vacante_id: datos.vacante_id,
      user_id: userId,
      motivo: datos.motivo,
      detalle: datos.detalle ?? null,
      estado: "nuevo",
      creado_en: new Date(),
    });

    return {
      id: Number(id),
      vacante_id: datos.vacante_id,
      motivo: datos.motivo,
      motivo_etiqueta: Reporte.ETIQUETAS[datos.motivo] ?? datos.motivo,
      detalle: datos.detalle ?? null,
      estado: "nuevo",
      mensaje:
        "Gracias por avisar. El Departamento de Vinculacion revisara la vacante y te avisara del resultado.",
    };
  },
};
