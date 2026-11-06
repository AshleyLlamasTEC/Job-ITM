/**
 * Bitacora de acciones administrativas.
 *
 * El apartado 8.5 exige registrar aprobaciones, rechazos, bajas y cambios de rol
 * con usuario, fecha y datos anteriores y nuevos. Ninguna accion sensible debe
 * escribirse directo a la tabla: todas pasan por aqui para que el formato sea
 * siempre el mismo.
 */
import { db } from "./database/connection";
import type { Registro } from "./model";

export interface EntradaBitacora {
  userId: number | null;
  accion: string;
  entidad: string;
  entidadId?: number | null;
  anteriores?: Registro | null;
  nuevos?: Registro | null;
  ip?: string | null;
}

export async function registrar(entrada: EntradaBitacora): Promise<void> {
  await db("bitacora").insert({
    user_id: entrada.userId,
    accion: entrada.accion,
    entidad: entrada.entidad,
    entidad_id: entrada.entidadId ?? null,
    datos_anteriores: entrada.anteriores ? JSON.stringify(entrada.anteriores) : null,
    datos_nuevos: entrada.nuevos ? JSON.stringify(entrada.nuevos) : null,
    ip: entrada.ip ?? null,
  });
}

/**
 * Registra solo los campos que cambiaron. Guardar la fila completa en cada
 * edicion haria la bitacora ilegible y dificultaria encontrar que se modifico.
 */
export function diferencias(antes: Registro, despues: Registro): {
  anteriores: Registro;
  nuevos: Registro;
} {
  const anteriores: Registro = {};
  const nuevos: Registro = {};

  for (const campo of Object.keys(despues)) {
    const previo = antes[campo];
    const actual = despues[campo];
    if (String(previo) !== String(actual)) {
      anteriores[campo] = previo ?? null;
      nuevos[campo] = actual ?? null;
    }
  }

  return { anteriores, nuevos };
}
