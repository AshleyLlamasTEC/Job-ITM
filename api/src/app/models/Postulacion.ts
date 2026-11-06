import { Modelo, type Registro } from "../../support/model";

/**
 * Candidatura de un alumno a una vacante.
 *
 * La maquina de estados del apartado 7.6 se declara aqui como dato, igual que
 * la de vacantes: los controladores no repiten listas de estados y una regla
 * nueva se cambia en un solo lugar.
 */
export class Postulacion extends Modelo {
  static tabla = "postulaciones";

  /** Orden de avance del proceso. `rechazado` queda fuera porque es terminal. */
  static readonly ETAPAS = ["recibida", "en_revision", "contactado", "entrevista", "contratado"] as const;

  /** Estados desde los que ya no se puede mover la candidatura. */
  static readonly FINALES = ["contratado", "rechazado"] as const;

  static readonly ESTADOS = [...this.ETAPAS, "rechazado"] as const;

  /** Texto que se le muestra al alumno en cada estado (tabla 33). */
  static readonly ETIQUETAS: Record<string, string> = {
    recibida: "Recibida",
    en_revision: "En revision",
    contactado: "Contactado",
    entrevista: "Entrevista",
    contratado: "Contratado",
    rechazado: "Rechazado",
  };

  /**
   * Comprueba si el cambio de estado es valido.
   *
   * Regla: solo se avanza. Desde cualquier estado no final se puede rechazar,
   * y `contratado` se alcanza desde cualquiera de las etapas previas porque una
   * empresa puede decidir contratar sin pasar por la entrevista.
   */
  static transicionValida(actual: string, siguiente: string): boolean {
    if (this.esFinal(actual)) return false;
    if (siguiente === "rechazado") return true;
    if (!(this.ETAPAS as readonly string[]).includes(siguiente)) return false;

    const desde = this.ETAPAS.indexOf(actual as (typeof this.ETAPAS)[number]);
    const hasta = this.ETAPAS.indexOf(siguiente as (typeof this.ETAPAS)[number]);
    if (desde < 0 || hasta < 0) return false;

    return hasta > desde;
  }

  static esFinal(estado: string): boolean {
    return (this.FINALES as readonly string[]).includes(estado);
  }

  static etiqueta(estado: string): string {
    return this.ETIQUETAS[estado] ?? estado;
  }

  /** Candidatura con la vacante y la empresa resueltas. */
  static conContexto(postulacionId: number): Promise<Registro | undefined> {
    return this.q()
      .join("vacantes as v", "v.id", "postulaciones.vacante_id")
      .join("empresas as e", "e.id", "v.empresa_id")
      .where("postulaciones.id", postulacionId)
      .select(
        "postulaciones.*",
        "v.titulo as vacante_titulo",
        "v.estado as vacante_estado",
        "v.ciudad as vacante_ciudad",
        "v.modalidad as vacante_modalidad",
        "v.empresa_id as empresa_id",
        "e.razon_social as empresa_nombre",
        "e.user_id as empresa_user_id",
        "e.contacto_correo as empresa_contacto_correo",
      )
      .first() as Promise<Registro | undefined>;
  }

  /**
   * Forma que consume el alumno.
   *
   * `notas_empresa` se excluye a proposito: el apartado 7.4 exige que las notas
   * privadas de la empresa no aparezcan en ninguna respuesta del estudiante.
   */
  static presentarAlAlumno(fila: Registro): Registro {
    return {
      id: Number(fila.id),
      vacante: {
        id: Number(fila.vacante_id),
        titulo: fila.vacante_titulo ?? null,
        empresa: fila.empresa_nombre ?? null,
        ciudad: fila.vacante_ciudad ?? null,
        modalidad: fila.vacante_modalidad ?? null,
        estado: fila.vacante_estado ?? null,
      },
      estado: fila.estado,
      estado_etiqueta: this.etiqueta(String(fila.estado)),
      mensaje: fila.mensaje ?? null,
      fecha_estado: fila.fecha_estado,
      creado_en: fila.creado_en,
    };
  }
}
