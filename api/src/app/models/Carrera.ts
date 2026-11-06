import { Modelo, type Registro } from "../../support/model";

/** Catalogo institucional de carreras. */
export class Carrera extends Modelo {
  static tabla = "carreras";
  static usaTimestamps = false;
  static campoCreado = "creado_en";
  static conversiones = { activa: "booleano" as const };

  /** Carreras visibles para los filtros del buscador. */
  static activas(): Promise<Registro[]> {
    return this.q().where({ activa: 1 }).orderBy("nombre").select("*") as Promise<Registro[]>;
  }
}
