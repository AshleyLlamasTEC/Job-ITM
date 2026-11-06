import { Modelo, type Registro } from "../../support/model";

/** Catalogo de permisos por accion (spatie/laravel-permission). */
export class Permiso extends Modelo {
  static tabla = "permissions";
  static usaTimestamps = false;
  static campoCreado = "created_at";
  static campoActualizado = "updated_at";

  static listado(): Promise<Registro[]> {
    return this.q().where({ guard_name: "api" }).orderBy("name").select("*") as Promise<Registro[]>;
  }
}
