import { Modelo, type Registro } from "../../support/model";

/**
 * Cuenta de acceso. Es la tabla base: estudiantes, empresas y personal de
 * Vinculacion existen primero aqui y luego se especializan.
 */
export class User extends Modelo {
  static tabla = "users";
  static ocultos = ["contrasena"];

  /** Busca por correo sin distinguir mayusculas. */
  static porCorreo(correo: string): Promise<Registro | undefined> {
    return this.q().whereRaw("LOWER(correo) = ?", [correo.trim().toLowerCase()]).first() as Promise<
      Registro | undefined
    >;
  }

  /** Igual que porCorreo, pero conserva el hash: solo lo usa el inicio de sesion. */
  static porCorreoConCredenciales(correo: string): Promise<Registro | undefined> {
    return this.q()
      .whereRaw("LOWER(correo) = ?", [correo.trim().toLowerCase()])
      .first() as Promise<Registro | undefined>;
  }

  static async marcarAcceso(id: number): Promise<void> {
    await this.q().where({ id }).update({ ultimo_acceso_en: new Date() });
  }
}
