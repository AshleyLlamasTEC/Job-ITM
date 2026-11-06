/**
 * Buscador publico de vacantes (apartado 5.3 y 5.9).
 *
 * Reglas que se respetan aqui:
 *
 *   - Solo se listan vacantes publicadas y cuya fecha de cierre no paso.
 *   - Los filtros vacios se ignoran: el cliente envia solo lo que eligio.
 *   - Una busqueda sin resultados devuelve la lista vacia y total en cero, no un
 *     error.
 *   - La paginacion usa `pagina` y `por_pagina`, con quince resultados por
 *     defecto y cien como maximo.
 *   - El contador de vistas se incrementa una sola vez por sesion.
 */
import type { Knex } from "knex";

import { db } from "../../support/database/connection";
import { NoEncontrado } from "../../support/http/errors";
import { hoyLocal } from "../../support/fechas";
import type { Registro } from "../../support/model";
import { Vacante } from "../models/Vacante";

export type Orden = "recientes" | "antiguas" | "sueldo" | "relevancia";

export interface Filtros {
  carrera?: number;
  tipo?: string;
  modalidad?: string;
  ciudad?: string;
  salarioMin?: number;
  incluirSinSalario: boolean;
  publicadas?: string;
  q?: string;
  orden: Orden;
  pagina: number;
  porPagina: number;
}

const POR_PAGINA_DEFECTO = 15;
const POR_PAGINA_MAXIMO = 100;

/**
 * MySQL ignora las palabras de menos de tres letras en un indice FULLTEXT
 * (innodb_ft_min_token_size). Para terminos mas cortos se usa LIKE.
 */
const MINIMO_FULLTEXT = 3;

/** Ventana de "publicadas en los ultimos N dias". */
function desdeCuando(ventana: string): string | null {
  const dias = /^(\d+)d$/.exec(ventana);
  const horas = /^(\d+)h$/.exec(ventana);

  if (dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - Number(dias[1]));
    return fecha.toISOString();
  }
  if (horas) {
    const fecha = new Date();
    fecha.setHours(fecha.getHours() - Number(horas[1]));
    return fecha.toISOString();
  }
  return null;
}

/** Construye la consulta con todos los filtros aplicados. */
function construir(filtros: Filtros): Knex.QueryBuilder {
  const hoy = hoyLocal();

  const consulta = db("vacantes as v")
    .join("empresas as e", "e.id", "v.empresa_id")
    .leftJoin("carreras as c", "c.id", "v.carrera_id")
    .where("v.estado", "publicada")
    .where("v.fecha_cierre", ">=", hoy);

  if (filtros.carrera) consulta.where("v.carrera_id", filtros.carrera);
  if (filtros.tipo) consulta.where("v.tipo", filtros.tipo);
  if (filtros.modalidad) consulta.where("v.modalidad", filtros.modalidad);
  if (filtros.ciudad) consulta.where("v.ciudad", "like", `%${filtros.ciudad}%`);

  if (filtros.salarioMin !== undefined) {
    // Una vacante cumple si su tope alcanza el minimo pedido. Si no publica
    // salario, solo aparece cuando el usuario acepta verlas sin sueldo.
    const condicion = (constructor: Knex.QueryBuilder) => {
      constructor.where("v.salario_max", ">=", filtros.salarioMin!);
      if (filtros.incluirSinSalario) {
        constructor.orWhere((otra) => {
          otra.where("v.mostrar_salario", 0).orWhereNull("v.salario_max");
        });
      }
    };
    consulta.where(condicion);
  } else if (!filtros.incluirSinSalario) {
    consulta.where("v.mostrar_salario", 1);
  }

  if (filtros.publicadas) {
    const desde = desdeCuando(filtros.publicadas);
    if (desde) consulta.where("v.fecha_publicacion", ">=", desde);
  }

  if (filtros.q) {
    const termino = filtros.q.trim().toLowerCase();
    if (termino.length >= MINIMO_FULLTEXT) {
      consulta.whereRaw("MATCH(v.titulo, v.descripcion) AGAINST (? IN NATURAL LANGUAGE MODE)", [
        termino,
      ]);
    } else {
      consulta.where((constructor) => {
        constructor
          .where("v.titulo", "like", `%${termino}%`)
          .orWhere("v.descripcion", "like", `%${termino}%`);
      });
    }
  }

  return consulta;
}

/** Aplica el orden elegido. */
function ordenar(consulta: Knex.QueryBuilder, orden: Orden, q?: string): void {
  switch (orden) {
    case "antiguas":
      consulta.orderBy("v.fecha_publicacion", "asc");
      break;
    case "sueldo":
      // MySQL no tiene NULLS LAST: se ordena primero por "es nulo" y despues
      // por el monto, de modo que las vacantes sin salario queden al final.
      consulta.orderByRaw("v.salario_max IS NULL, v.salario_max DESC");
      break;
    case "relevancia":
      if (q && q.trim().length >= MINIMO_FULLTEXT) {
        consulta
          .select(
            db.raw(
              "MATCH(v.titulo, v.descripcion) AGAINST (? IN NATURAL LANGUAGE MODE) as relevancia",
              [q.trim().toLowerCase()],
            ),
          )
          .orderBy("relevancia", "desc");
        break;
      }
    // Si no hay termino, "relevancia" equivale a "recientes".
    case "recientes":
    default:
      consulta.orderBy("v.fecha_publicacion", "desc").orderBy("v.id", "desc");
      break;
  }
}

// ---------------------------------------------------------------------------
// Contador de vistas: una sola vez por sesion
// ---------------------------------------------------------------------------

/**
 * El documento pide que la vista se cuente una sola vez por sesion de usuario.
 * Se guarda en memoria con vencimiento: no justifica una tabla nueva y, si el
 * servidor se reinicia, el peor caso es contar una vista de mas.
 */
const vistasDeLaSesion = new Map<string, number>();
const VIGENCIA_VISTA_MS = 30 * 60 * 1000;

function primeraVista(clave: string): boolean {
  const ahora = Date.now();

  // Limpieza perezosa para que el mapa no crezca sin control.
  if (vistasDeLaSesion.size > 5000) {
    for (const [k, momento] of vistasDeLaSesion) {
      if (ahora - momento > VIGENCIA_VISTA_MS) vistasDeLaSesion.delete(k);
    }
  }

  const visto = vistasDeLaSesion.get(clave);
  if (visto && ahora - visto < VIGENCIA_VISTA_MS) return false;

  vistasDeLaSesion.set(clave, ahora);
  return true;
}

export const Buscador = {
  /** Lista paginada con la envoltura de la tabla 28. */
  async listar(filtros: Filtros): Promise<{ filas: Registro[]; total: number }> {
    const consulta = construir(filtros);

    const total = await Vacante.contar(consulta);

    const pagina = Math.max(1, filtros.pagina);
    const porPagina = Math.min(
      POR_PAGINA_MAXIMO,
      Math.max(1, filtros.porPagina || POR_PAGINA_DEFECTO),
    );

    const listado = consulta
      .clone()
      .select(
        "v.id",
        "v.empresa_id",
        "v.titulo",
        "v.tipo",
        "v.modalidad",
        "v.ciudad",
        "v.estado_geo",
        "v.salario_min",
        "v.salario_max",
        "v.mostrar_salario",
        "v.fecha_cierre",
        "v.fecha_publicacion",
        "v.vistas",
        "e.razon_social as empresa_nombre",
        "e.logo_ruta as empresa_logo",
        "c.nombre as carrera_nombre",
        "c.clave as carrera_clave",
      );

    ordenar(listado, filtros.orden, filtros.q);

    const filas = (await listado.limit(porPagina).offset((pagina - 1) * porPagina)) as Registro[];

    return { filas: filas.map((f) => Vacante.presentarPublica(f)), total };
  },

  /** Detalle de una vacante publicada. Incrementa el contador de vistas. */
  async detalle(vacanteId: number, sesion: string): Promise<Registro> {
    const fila = await Vacante.conEmpresa(vacanteId);

    // Una vacante en borrador, pausada o vencida responde 404: para el publico
    // no existe, y asi no se filtra informacion interna.
    if (!fila || fila.estado !== "publicada" || String(fila.fecha_cierre) < hoyLocal()) {
      throw new NoEncontrado("La vacante no existe o ya no esta disponible.");
    }

    if (primeraVista(`${sesion}:${vacanteId}`)) {
      await Vacante.q().where({ id: vacanteId }).increment("vistas", 1);
      fila.vistas = Number(fila.vistas ?? 0) + 1;
    }

    return Vacante.presentarPublica(fila, true);
  },

  /** Hasta seis vacantes de la misma carrera o de la misma empresa. */
  async similares(vacanteId: number): Promise<Registro[]> {
    const base = await Vacante.buscar(vacanteId);
    if (!base) throw new NoEncontrado("La vacante no existe.");

    const filas = (await Vacante.q()
      .join("empresas as e", "e.id", "vacantes.empresa_id")
      .leftJoin("carreras as c", "c.id", "vacantes.carrera_id")
      .where("vacantes.estado", "publicada")
      .where("vacantes.fecha_cierre", ">=", hoyLocal())
      .whereNot("vacantes.id", vacanteId)
      .where((constructor) => {
        constructor.where("vacantes.empresa_id", base.empresa_id);
        if (base.carrera_id) constructor.orWhere("vacantes.carrera_id", base.carrera_id);
      })
      .orderBy("vacantes.fecha_publicacion", "desc")
      .limit(6)
      .select(
        "vacantes.*",
        "e.razon_social as empresa_nombre",
        "e.logo_ruta as empresa_logo",
        "c.nombre as carrera_nombre",
        "c.clave as carrera_clave",
      )) as Registro[];

    return filas.map((f) => Vacante.presentarPublica(f));
  },
};
