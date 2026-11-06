/**
 * Autorizacion.
 *
 * Equivalente al Gate de Laravel con spatie/laravel-permission. Los permisos no
 * se escriben en el codigo: se resuelven consultando role_has_permissions. Asi,
 * ajustar la matriz del apartado 4.7 es un cambio de datos y no de codigo.
 *
 * La unica excepcion es admin_tecnico, que recibe todos los permisos mediante
 * una regla global equivalente a Gate::before. Se hace asi para que el
 * mantenimiento del sistema no dependa de que alguien marque bien las casillas.
 */
import { db } from "../database/connection";

export const GUARD = "api";
export const ROL_ADMIN_TECNICO = "admin_tecnico";

export interface UsuarioAutenticado {
  id: number;
  nombre: string;
  correo: string;
  estado: string;
  correo_verificado_en: Date | null;
  rol: string | null;
  permisos: string[];
}

/** Devuelve el nombre del rol del usuario, o null si no tiene ninguno asignado. */
export async function rolDe(userId: number): Promise<string | null> {
  const fila = await db("model_has_roles as mr")
    .join("roles as r", "r.id", "mr.role_id")
    .where("mr.model_id", userId)
    .where("mr.model_type", "App\\Models\\User")
    .where("r.guard_name", GUARD)
    .select("r.name")
    .first();

  return fila?.name ?? null;
}

/** Lista de permisos efectivos del usuario, ordenada. */
export async function permisosDe(userId: number): Promise<string[]> {
  const rol = await rolDe(userId);
  if (rol === ROL_ADMIN_TECNICO) return ["*"];

  const filas = (await db("model_has_roles as mr")
    .join("role_has_permissions as rp", "rp.role_id", "mr.role_id")
    .join("permissions as p", "p.id", "rp.permission_id")
    .where("mr.model_id", userId)
    .where("mr.model_type", "App\\Models\\User")
    .where("p.guard_name", GUARD)
    .distinct("p.name as name")
    .orderBy("p.name")) as Array<{ name: string }>;

  return filas.map((f) => f.name);
}

/** Comprueba un permiso concreto. */
export async function puede(userId: number, permiso: string): Promise<boolean> {
  const rol = await rolDe(userId);
  if (rol === ROL_ADMIN_TECNICO) return true;

  const fila = await db("model_has_roles as mr")
    .join("role_has_permissions as rp", "rp.role_id", "mr.role_id")
    .join("permissions as p", "p.id", "rp.permission_id")
    .where("mr.model_id", userId)
    .where("mr.model_type", "App\\Models\\User")
    .where("p.name", permiso)
    .where("p.guard_name", GUARD)
    .first();

  if (fila) return true;

  // Permiso puntual otorgado fuera del rol (model_has_permissions).
  const directo = await db("model_has_permissions as mp")
    .join("permissions as p", "p.id", "mp.permission_id")
    .where("mp.model_id", userId)
    .where("mp.model_type", "App\\Models\\User")
    .where("p.name", permiso)
    .where("p.guard_name", GUARD)
    .first();

  return Boolean(directo);
}

/** Asigna un rol a un usuario, reemplazando el que tuviera. */
export async function asignarRol(userId: number, rol: string): Promise<void> {
  const registro = await db("roles").where({ name: rol, guard_name: GUARD }).first();
  if (!registro) throw new Error(`El rol "${rol}" no existe en el catalogo.`);

  await db("model_has_roles")
    .where({ model_id: userId, model_type: "App\\Models\\User" })
    .delete();

  await db("model_has_roles").insert({
    role_id: registro.id,
    model_id: userId,
    model_type: "App\\Models\\User",
  });
}
