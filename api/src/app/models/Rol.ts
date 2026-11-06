import { Modelo, type Registro } from "../../support/model";

/** Catalogo de roles (spatie/laravel-permission). */
export class Rol extends Modelo {
  static tabla = "roles";
  static usaTimestamps = false;
  static campoCreado = "created_at";
  static campoActualizado = "updated_at";

  static porNombre(nombre: string): Promise<Registro | undefined> {
    return this.q().where({ name: nombre, guard_name: "api" }).first() as Promise<Registro | undefined>;
  }
}
