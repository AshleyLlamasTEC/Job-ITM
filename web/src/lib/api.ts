/**
 * Cliente HTTP de la API de Job ITM.
 *
 * La API envuelve todo en `{ data, meta }` y los errores de validacion en
 * `{ message, errors: { campo: [mensajes] } }`. Este modulo traduce esa forma a
 * promesas tipadas y a un error con el detalle por campo, de modo que los
 * formularios puedan pintar el mensaje debajo de cada input.
 */

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly estado: number,
    mensaje: string,
    public readonly errores: Record<string, string[]> = {},
  ) {
    super(mensaje);
    this.name = "ApiError";
  }

  /** Primer mensaje de un campo, util para pintarlo bajo el input. */
  campo(nombre: string): string | undefined {
    return this.errores[nombre]?.[0];
  }
}

export interface Respuesta<T> {
  data: T;
  meta?: Record<string, unknown>;
}

const CLAVE_TOKEN = "jobitm_token";

export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* modo privado sin almacenamiento: la sesion vive solo en memoria */
  }
}

interface Opciones extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Si es true no se envia el token aunque exista. */
  publico?: boolean;
}

async function peticion<T>(ruta: string, opciones: Opciones = {}): Promise<Respuesta<T>> {
  const { body, publico, headers, ...resto } = opciones;
  const cabeceras = new Headers(headers);

  if (!(body instanceof FormData) && body !== undefined) {
    cabeceras.set("Content-Type", "application/json");
  }

  const token = leerToken();
  if (token && !publico) cabeceras.set("Authorization", `Bearer ${token}`);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...resto,
      // Los datos cambian con cada accion: nunca se reutiliza la cache.
      cache: "no-store",
      headers: cabeceras,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "No pudimos conectar con el servidor. Revisa que la API este en linea.",
    );
  }

  if (respuesta.status === 204) return { data: undefined as T };

  const texto = await respuesta.text();
  let json: unknown = null;
  if (texto) {
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
  }

  if (!respuesta.ok) {
    const cuerpo = (json ?? {}) as {
      message?: string;
      errors?: Record<string, string[]>;
    };
    throw new ApiError(
      respuesta.status,
      cuerpo.message ?? `La solicitud fallo (${respuesta.status}).`,
      cuerpo.errors ?? {},
    );
  }

  return (json ?? { data: undefined }) as Respuesta<T>;
}

/** Descarga un archivo protegido (CSV, por ejemplo) y lo guarda con `nombre`. */
export async function descargarArchivo(ruta: string, nombre: string): Promise<void> {
  const cabeceras = new Headers();
  const token = leerToken();
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    headers: cabeceras,
    cache: "no-store",
  });

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      `No pudimos descargar el archivo (${respuesta.status}).`,
    );
  }

  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  get<T>(ruta: string, opciones?: Opciones) {
    return peticion<T>(ruta, { ...opciones, method: "GET" });
  },
  post<T>(ruta: string, body?: unknown, opciones?: Opciones) {
    return peticion<T>(ruta, { ...opciones, method: "POST", body });
  },
  put<T>(ruta: string, body?: unknown, opciones?: Opciones) {
    return peticion<T>(ruta, { ...opciones, method: "PUT", body });
  },
  delete<T>(ruta: string, opciones?: Opciones) {
    return peticion<T>(ruta, { ...opciones, method: "DELETE" });
  },
};
