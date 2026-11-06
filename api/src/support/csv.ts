/**
 * Exportacion a CSV.
 *
 * El documento de diseno pide exportar listados a CSV (RF-10 y el permiso
 * `reportes.exportar`). Se genera a mano en lugar de usar una libreria porque
 * el formato es simple y conviene controlar dos detalles que Excel necesita:
 *
 *   - La marca de orden de bytes (BOM) al inicio, para que reconozca UTF-8 y no
 *     rompa los acentos de nombres y empresas.
 *   - Separador de coma con entrecomillado cuando el valor trae coma, comilla o
 *     salto de linea.
 *
 * Se abre con acentos correctos en Excel, LibreOffice y Google Sheets.
 */

/** Escapa un valor segun la regla de RFC 4180. */
function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";

  const texto = String(valor);
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/**
 * Convierte filas en el contenido de un archivo CSV.
 *
 * `columnas` fija el orden y el encabezado: asi la exportacion no depende del
 * orden en que MySQL devuelva las columnas.
 */
export function aCsv<T extends Record<string, unknown>>(
  filas: T[],
  columnas: Array<{ campo: string; titulo: string }>,
): string {
  const lineas = [columnas.map((c) => celda(c.titulo)).join(",")];

  for (const fila of filas) {
    lineas.push(columnas.map((c) => celda((fila as Record<string, unknown>)[c.campo])).join(","));
  }

  // CRLF: es lo que espera Excel. El BOM va al inicio del archivo, no de cada linea.
  return "\uFEFF" + lineas.join("\r\n") + "\r\n";
}

/** Nombre de archivo seguro, con la fecha para que no se sobrescriba al bajar. */
export function nombreArchivo(base: string): string {
  const hoy = new Date().toISOString().slice(0, 10);
  const limpio = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${limpio || "exportacion"}-${hoy}.csv`;
}
