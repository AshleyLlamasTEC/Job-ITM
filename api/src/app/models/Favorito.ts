import { Modelo, type Registro } from "../../support/model";

/**
 * Vacantes guardadas por un alumno.
 *
 * La tabla no tiene `id`: la llave es el par (estudiante, vacante), y ese mismo
 * par es lo que impide guardar dos veces la misma vacante. Por eso el modelo
 * desactiva las marcas de tiempo automaticas y escribe `creado_en` a mano.
 */
export class Favorito extends Modelo {
  static tabla = "favoritos";
  static usaTimestamps = false;

  static deEstudiante(estudianteId: number): Promise<Registro[]> {
    return this.q()
      .join("vacantes as v", "v.id", "favoritos.vacante_id")
      .join("empresas as e", "e.id", "v.empresa_id")
      .where("favoritos.estudiante_id", estudianteId)
      .orderBy("favoritos.creado_en", "desc")
      .select(
        "favoritos.creado_en as guardado_en",
        "v.id",
        "v.titulo",
        "v.tipo",
        "v.modalidad",
        "v.ciudad",
        "v.estado",
        "v.fecha_cierre",
        "v.salario_min",
        "v.salario_max",
        "v.mostrar_salario",
        "e.razon_social as empresa_nombre",
        "e.id as empresa_id",
      ) as unknown as Promise<Registro[]>;
  }

  static async quitar(estudianteId: number, vacanteId: number): Promise<number> {
    return this.q().where({ estudiante_id: estudianteId, vacante_id: vacanteId }).delete();
  }
}
