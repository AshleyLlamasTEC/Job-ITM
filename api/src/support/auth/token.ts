/**
 * Tokens de acceso.
 *
 * Reproduce el comportamiento de Laravel Sanctum: el token que recibe el
 * cliente tiene la forma `id|textoPlano`, en la base solo se guarda el hash
 * SHA-256 de la parte aleatoria y cada dispositivo tiene su propio registro.
 *
 * Guardar el hash y no el token significa que un volcado de la base no permite
 * suplantar a nadie.
 */
import { createHash, randomBytes } from "node:crypto";

import { config } from "../../config";
import { db } from "../database/connection";

/** Nombre de clase que Laravel usaria como morph. Se conserva para compatibilidad. */
export const MORPH_USUARIO = "App\\Models\\User";

export interface TokenResuelto {
  tokenId: number;
  userId: number;
}

function sha256(texto: string): string {
  return createHash("sha256").update(texto).digest("hex");
}

function fechaExpiracion(): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + config.auth.diasToken);
  return fecha;
}

/** Emite un token nuevo y devuelve el valor en claro (solo se muestra una vez). */
export async function emitirToken(userId: number, dispositivo = "api"): Promise<string> {
  const aleatorio = randomBytes(30).toString("base64url");
  const [id] = await db("personal_access_tokens").insert({
    tokenable_type: MORPH_USUARIO,
    tokenable_id: userId,
    name: dispositivo,
    token: sha256(aleatorio),
    abilities: "*",
    expires_at: fechaExpiracion(),
  });

  return `${id}|${aleatorio}`;
}

/** Resuelve un token en claro. Devuelve null si no existe, esta vencido o fue revocado. */
export async function resolverToken(plano: string): Promise<TokenResuelto | null> {
  const separador = plano.indexOf("|");
  if (separador <= 0) return null;

  const id = Number(plano.slice(0, separador));
  const aleatorio = plano.slice(separador + 1);
  if (!Number.isInteger(id) || aleatorio === "") return null;

  const registro = await db("personal_access_tokens").where({ id, token: sha256(aleatorio) }).first();
  if (!registro) return null;

  if (registro.expires_at && new Date(registro.expires_at) < new Date()) {
    await db("personal_access_tokens").where({ id }).delete();
    return null;
  }

  // Se actualiza como maximo una vez por minuto para no escribir en cada peticion.
  const ultimo = registro.last_used_at ? new Date(registro.last_used_at) : null;
  if (!ultimo || Date.now() - ultimo.getTime() > 60_000) {
    await db("personal_access_tokens").where({ id }).update({ last_used_at: new Date() });
  }

  return { tokenId: id, userId: Number(registro.tokenable_id) };
}

/** Revoca el token actual (cierre de sesion). */
export async function revocarToken(tokenId: number): Promise<void> {
  await db("personal_access_tokens").where({ id: tokenId }).delete();
}

/** Revoca todos los tokens de un usuario, por ejemplo al cambiar la contrasena. */
export async function revocarTodos(userId: number): Promise<void> {
  await db("personal_access_tokens").where({ tokenable_id: userId, tokenable_type: MORPH_USUARIO }).delete();
}
