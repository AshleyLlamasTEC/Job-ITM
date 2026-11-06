import { db } from "../../support/database/connection";
import { Modelo, type Registro } from "../../support/model";

/**
 * Oportunidad publicada por una empresa.
 *
 * La tabla central del negocio. Aqui viven las consultas que comparten el
 * buscador publico y el panel de la empresa, para que la regla de visibilidad
 * (publicada y no vencida) se escriba una sola vez.
 */
export class Vacante extends Modelo {
  static tabla = "vacantes";
  static conversiones = {
    mostrar_salario: "booleano" as const,
    vistas: "entero" as const,
    salario_min: "decimal" as const,
    salario_max: "decimal" as const,
  };

  /** Estados en los que la vacante es visible en el buscador. */
  static readonly VISIBLE = "publicada";

  /**
   * Consulta base del buscador: solo vacantes publicadas y vigentes.
   * La fecha se compara contra el dia local, no contra UTC (ver support/fechas).
   */
  static publicadas(hoy: string) {
    return this.q()
      .where("vacantes.estado", this.VISIBLE)
      .where("vacantes.fecha_cierre", ">=", hoy);
  }

  /** Vacante con el nombre de la empresa y de la carrera resueltos. */
  static conEmpresa(id: number) {
    return this.q()
      .join("empresas as e", "e.id", "vacantes.empresa_id")
      .leftJoin("carreras as c", "c.id", "vacantes.carrera_id")
      .where("vacantes.id", id)
      .select(
        "vacantes.*",
        "e.razon_social as empresa_nombre",
        "e.logo_ruta as empresa_logo",
        "e.giro as empresa_giro",
        "e.sitio_web as empresa_sitio",
        "c.nombre as carrera_nombre",
        "c.clave as carrera_clave",
      )
      .first() as Promise<Registro | undefined>;
  }

  /** Vacantes de una empresa, con el conteo de postulaciones de cada una. */
  static deEmpresa(empresaId: number) {
    return this.q()
      .leftJoin("postulaciones as p", "p.vacante_id", "vacantes.id")
      .where("vacantes.empresa_id", empresaId)
      .groupBy("vacantes.id")
      .select("vacantes.*")
      .count({ postulaciones: "p.id" })
      .orderBy("vacantes.creado_en", "desc") as unknown as Promise<Registro[]>;
  }

  /** Cuenta postulaciones de una vacante. */
  static async totalPostulaciones(vacanteId: number): Promise<number> {
    const fila = await db("postulaciones").where({ vacante_id: vacanteId }).count({ total: "*" }).first();
    return Number((fila as { total?: string | number } | undefined)?.total ?? 0);
  }

  /**
   * Forma publica de una vacante, la de la tabla 28 del documento: la empresa
   * aparece como objeto anidado y el salario como `{ min, max, mostrar }`.
   */
  static presentarPublica(fila: Registro, detalle = false): Registro {
    const salida: Registro = {
      id: Number(fila.id),
      titulo: fila.titulo,
      empresa: {
        id: Number(fila.empresa_id),
        nombre: fila.empresa_nombre ?? null,
        logo: fila.empresa_logo ?? null,
      },
      carrera: fila.carrera_nombre ? { nombre: fila.carrera_nombre, clave: fila.carrera_clave } : null,
      tipo: fila.tipo,
      modalidad: fila.modalidad,
      ciudad: fila.ciudad,
      estado_geo: fila.estado_geo ?? null,
      salario: fila.mostrar_salario
        ? {
            min: fila.salario_min === null ? null : Number(fila.salario_min),
            max: fila.salario_max === null ? null : Number(fila.salario_max),
            mostrar: true,
          }
        : { min: null, max: null, mostrar: false },
      fecha_cierre: fila.fecha_cierre,
      publicada_en: fila.fecha_publicacion ?? null,
      vistas: Number(fila.vistas ?? 0),
    };

    if (detalle) {
      salida.descripcion = fila.descripcion;
      salida.requisitos = fila.requisitos;
      salida.actividades = fila.actividades ?? null;
      salida.empresa.giro = fila.empresa_giro ?? null;
      salida.empresa.sitio_web = fila.empresa_sitio ?? null;
    }

    return salida;
  }
}
