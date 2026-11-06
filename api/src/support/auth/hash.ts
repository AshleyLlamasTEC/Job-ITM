/**
 * Hash de contrasenas.
 *
 * Se usa bcrypt con costo 12, igual que el valor por omision de Laravel. El
 * hash es compatible entre bcryptjs y password_hash de PHP, de modo que una
 * base migrada a Laravel sigue permitiendo el inicio de sesion.
 */
import bcrypt from "bcryptjs";

const COSTO = 12;

export const Hash = {
  async hacer(texto: string): Promise<string> {
    return bcrypt.hash(texto, COSTO);
  },

  async verificar(texto: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(texto, hash);
    } catch {
      return false;
    }
  },
};
