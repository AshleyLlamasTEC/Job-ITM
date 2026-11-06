import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Iniciales para los avatares: "Ana Maria Lopez" -> "AL". */
export function iniciales(nombre: string | null | undefined): string {
  if (!nombre) return "IT";
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "IT";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
