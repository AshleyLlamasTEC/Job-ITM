/**
 * Almacenamiento de archivos.
 *
 * Los curriculums y los logos viven en `storage/app/private`, fuera de cualquier
 * carpeta que el servidor web sirva directamente (apartado 8.3). El acceso se
 * concede con una URL firmada que vence a los cinco minutos.
 *
 * El tipo se valida por el contenido (los primeros bytes del archivo) y no por
 * la extension ni por el encabezado Content-Type, porque ambos los controla
 * quien sube el archivo.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, normalize, sep } from "node:path";

import { PeticionInvalida } from "../http/errors";

export const RAIZ_PRIVADA = join(process.cwd(), "storage", "app", "private");

/**
 * Carpetas privadas. `postulaciones` guarda la copia del curriculum que viaja
 * con cada candidatura: el alumno puede cambiar su CV despues y la empresa debe
 * seguir viendo el archivo que realmente recibio (apartado 7.3).
 */
export type Carpeta = "cv" | "logos" | "postulaciones";

/** Firma de archivo PDF: %PDF- */
const FIRMA_PDF = Buffer.from("%PDF-", "ascii");
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FIRMA_JPEG = Buffer.from([0xff, 0xd8, 0xff]);

function empiezaCon(contenido: Buffer, firma: Buffer): boolean {
  if (contenido.length < firma.length) return false;
  return contenido.subarray(0, firma.length).equals(firma);
}

export function esPdf(contenido: Buffer): boolean {
  return empiezaCon(contenido, FIRMA_PDF);
}

export function esImagen(contenido: Buffer): boolean {
  return empiezaCon(contenido, FIRMA_PNG) || empiezaCon(contenido, FIRMA_JPEG);
}

/**
 * Guarda un archivo con un nombre aleatorio y devuelve su ruta relativa.
 *
 * El nombre original se descarta a proposito: una ruta como
 * `cv/20300001-Ashley-Llamas.pdf` expondria datos personales a quien vea el
 * enlace.
 */
export async function guardarArchivo(
  carpeta: Carpeta,
  contenido: Buffer,
  extension: string,
): Promise<string> {
  const nombre = `${randomUUID()}.${extension}`;
  const absoluta = join(RAIZ_PRIVADA, carpeta, nombre);

  await mkdir(dirname(absoluta), { recursive: true });
  await writeFile(absoluta, contenido);

  // Se guarda siempre con separador "/" para que la ruta sea portable.
  return `${carpeta}/${nombre}`;
}

/** Convierte una ruta relativa en absoluta, sin permitir salir de la raiz. */
function absoluta(rutaRelativa: string): string {
  const limpia = normalize(rutaRelativa).replace(/^([.]{2}[\\/])+/, "");
  const destino = join(RAIZ_PRIVADA, limpia);

  if (!destino.startsWith(RAIZ_PRIVADA + sep) && destino !== RAIZ_PRIVADA) {
    throw new PeticionInvalida("La ruta del archivo no es valida.");
  }

  return destino;
}

export async function leerArchivo(rutaRelativa: string): Promise<Buffer> {
  try {
    return await readFile(absoluta(rutaRelativa));
  } catch {
    throw new PeticionInvalida("El archivo ya no esta disponible.");
  }
}

export async function borrarArchivo(rutaRelativa: string): Promise<void> {
  try {
    await unlink(absoluta(rutaRelativa));
  } catch {
    // Si el archivo ya no existe, el objetivo esta cumplido.
  }
}
