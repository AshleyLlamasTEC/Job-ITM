import { Modelo, type Registro } from "../../support/model";

/**
 * Avisos internos de la campana.
 *
 * El correo se dispara por el mismo evento, pero el aviso queda guardado: si el
 * envio falla o el usuario no revisa su correo, igual se entera al entrar.
 */
export class Notificacion extends Modelo {
  static tabla = "notificaciones";
  static usaTimestamps = false;

  /** Crea un aviso. Nunca lanza: notificar no debe tumbar la accion principal. */
  static async enviar(
    userId: number,
    datos: { tipo: string; titulo: string; mensaje: string; url?: string | null },
  ): Promise<void> {
    try {
      await this.q().insert({
        user_id: userId,
        tipo: datos.tipo,
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        url: datos.url ?? null,
      });
    } catch (error) {
      console.error("[notificacion] No se pudo guardar el aviso:", (error as Error).message);
    }
  }

  static sinLeer(userId: number): Promise<number> {
    return this.q()
      .where({ user_id: userId })
      .whereNull("leida_en")
      .count({ total: "*" })
      .first()
      .then((fila) => Number((fila as { total?: string | number } | undefined)?.total ?? 0));
  }

  static deUsuario(userId: number): Promise<Registro[]> {
    return this.q().where({ user_id: userId }).orderBy("creado_en", "desc") as Promise<Registro[]>;
  }

  /**
   * Marca un aviso como leido, pero solo si pertenece al usuario: un
   * identificador ajeno no se distingue de uno inexistente (404).
   */
  static async marcarLeida(userId: number, notificacionId: number): Promise<boolean> {
    const fila = await this.q()
      .where({ id: notificacionId, user_id: userId })
      .first();

    if (!fila) return false;

    // Si ya estaba leida se respeta la fecha original: el usuario quiere saber
    // cuando la abrio, no cuando volvio a pulsar el aviso.
    if (!fila.leida_en) {
      await this.q().where({ id: notificacionId }).update({ leida_en: new Date() });
    }

    return true;
  }
}
