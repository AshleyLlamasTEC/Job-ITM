import { Modelo, type Registro } from "../../support/model";

/** Perfil academico del alumno o egresado. */
export class Estudiante extends Modelo {
  static tabla = "estudiantes";
  static conversiones = {
    semestre: "entero" as const,
    anio_egreso: "entero" as const,
  };

  static porUserId(userId: number): Promise<Registro | undefined> {
    return this.q().where({ user_id: userId }).first() as Promise<Registro | undefined>;
  }

  /** Perfil completo con el nombre de la carrera resuelto. */
  static conCarrera(userId: number): Promise<Registro | undefined> {
    return this.q()
      .leftJoin("carreras as c", "c.id", "estudiantes.carrera_id")
      .where("estudiantes.user_id", userId)
      .select("estudiantes.*", "c.nombre as carrera", "c.clave as carrera_clave")
      .first() as Promise<Registro | undefined>;
  }
}
