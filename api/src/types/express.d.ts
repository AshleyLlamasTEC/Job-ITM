/**
 * Extension de los tipos de Express.
 *
 * El middleware de autenticacion agrega el usuario resuelto y el identificador
 * del token a la peticion. Declararlo aqui evita tener que usar `as any` en cada
 * controlador y hace que el compilador avise si se olvida el middleware.
 */
import type { UsuarioAutenticado } from "../support/authorization/gate";

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
      tokenId?: number;
    }
  }
}

export {};
