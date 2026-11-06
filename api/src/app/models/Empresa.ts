import { Modelo, type Registro } from "../../support/model";

/** Organizacion que publica vacantes. */
export class Empresa extends Modelo {
  static tabla = "empresas";

  static porUserId(userId: number): Promise<Registro | undefined> {
    return this.q().where({ user_id: userId }).first() as Promise<Registro | undefined>;
  }

  static aprobada(userId: number): Promise<boolean> {
    return this.q()
      .where({ user_id: userId, estatus_validacion: "aprobada" })
      .first()
      .then((fila) => Boolean(fila));
  }
}
