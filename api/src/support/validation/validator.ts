/**
 * Validador de datos.
 *
 * Traduce la sintaxis de reglas de Laravel a TypeScript:
 *
 *   await validar(datos, {
 *     correo: "required|email|max:150|unique:users,correo",
 *     contrasena: "required|string|min:8|confirmed",
 *   });
 *
 * Devuelve solo los campos declarados, ya normalizados, para que un campo
 * inesperado del cliente nunca llegue a la base de datos.
 */
import { db } from "../database/connection";
import { ErrorValidacion } from "../http/errors";

export type Datos = Record<string, unknown>;
export type Reglas = Record<string, string>;
export type Errores = Record<string, string[]>;

const ETIQUETAS: Record<string, string> = {
  nombre: "nombre",
  correo: "correo electronico",
  contrasena: "contrasena",
  matricula: "matricula",
  carrera_id: "carrera",
  semestre: "semestre",
  telefono: "telefono",
  razon_social: "razon social",
  rfc: "RFC",
  giro: "giro",
  contacto_nombre: "nombre de contacto",
  contacto_correo: "correo de contacto",
  titulo: "titulo",
  descripcion: "descripcion",
  requisitos: "requisitos",
  tipo: "tipo de vacante",
  modalidad: "modalidad",
  ciudad: "ciudad",
  fecha_cierre: "fecha de cierre",
};

function etiqueta(campo: string): string {
  return ETIQUETAS[campo] ?? campo.replace(/_/g, " ");
}

function vacio(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (typeof valor === "string") return valor.trim() === "";
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}

export class Validador {
  private errores: Errores = {};

  constructor(
    private readonly datos: Datos,
    private readonly reglas: Reglas,
    private readonly mensajes: Record<string, string> = {},
  ) {}

  /** Ejecuta todas las reglas y devuelve los datos limpios o lanza ErrorValidacion. */
  async validar(): Promise<Datos> {
    const limpio: Datos = {};

    for (const [campo, definicion] of Object.entries(this.reglas)) {
      const valor = this.datos[campo];
      const tokens = definicion.split("|").map((t) => t.trim()).filter(Boolean);
      const resultado = await this.aplicar(campo, valor, tokens);
      if (resultado !== undefined) limpio[campo] = resultado;
    }

    if (Object.keys(this.errores).length > 0) {
      throw new ErrorValidacion(this.errores);
    }

    return limpio;
  }

  private fallar(campo: string, regla: string, mensaje: string): void {
    const clave = `${campo}.${regla}`;
    const texto = this.mensajes[clave] ?? mensaje;
    this.errores[campo] ??= [];
    if (!this.errores[campo].includes(texto)) this.errores[campo].push(texto);
  }

  private async aplicar(campo: string, valor: unknown, tokens: string[]): Promise<unknown> {
    const nombre = etiqueta(campo);
    let obligatorio = false;
    let resultado: unknown = valor;

    for (const token of tokens) {
      if (token === "required") obligatorio = true;
    }

    // Un campo vacio nunca se valida contra las demas reglas: o falta (required)
    // o simplemente no se envia, y en ese caso no se incluye en los datos limpios.
    if (vacio(valor)) {
      if (obligatorio) {
        this.fallar(campo, "required", `El campo ${nombre} es obligatorio.`);
      }
      return undefined;
    }

    for (const token of tokens) {
      const [regla, argumento = ""] = token.split(":");
      const args = argumento === "" ? [] : argumento.split(",");
      const texto = typeof valor === "string" ? valor.trim() : valor;

      switch (regla) {
        case "required":
        case "nullable":
        case "sometimes":
          break;

        case "string":
          if (typeof texto !== "string") {
            this.fallar(campo, "string", `El campo ${nombre} debe ser texto.`);
          }
          break;

        case "integer":
          if (!Number.isInteger(Number(texto))) {
            this.fallar(campo, "integer", `El campo ${nombre} debe ser un numero entero.`);
          } else {
            resultado = Number(texto);
          }
          break;

        case "numeric":
          if (Number.isNaN(Number(texto))) {
            this.fallar(campo, "numeric", `El campo ${nombre} debe ser un numero.`);
          } else {
            resultado = Number(texto);
          }
          break;

        case "boolean":
          if (![true, false, 0, 1, "0", "1"].includes(texto as never)) {
            this.fallar(campo, "boolean", `El campo ${nombre} debe ser verdadero o falso.`);
          } else {
            resultado = texto === true || texto === 1 || texto === "1";
          }
          break;

        case "array":
          if (!Array.isArray(texto)) {
            this.fallar(campo, "array", `El campo ${nombre} debe ser una lista.`);
          }
          break;

        case "email":
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(texto))) {
            this.fallar(campo, "email", `El campo ${nombre} debe ser un correo electronico valido.`);
          }
          break;

        case "url":
          try {
            new URL(String(texto));
          } catch {
            this.fallar(campo, "url", `El campo ${nombre} debe ser una direccion web valida.`);
          }
          break;

        case "alpha_num":
          if (!/^[a-zA-Z0-9]+$/.test(String(texto))) {
            this.fallar(campo, "alpha_num", `El campo ${nombre} solo admite letras y numeros.`);
          }
          break;

        case "digits":
          if (!new RegExp(`^\\d{${args[0]}}$`).test(String(texto))) {
            this.fallar(campo, "digits", `El campo ${nombre} debe tener ${args[0]} digitos.`);
          }
          break;

        case "min":
          if (typeof texto === "string" && texto.length < Number(args[0])) {
            this.fallar(campo, "min", `El campo ${nombre} debe tener al menos ${args[0]} caracteres.`);
          } else if (typeof texto === "number" && texto < Number(args[0])) {
            this.fallar(campo, "min", `El campo ${nombre} debe ser al menos ${args[0]}.`);
          }
          break;

        case "max":
          if (typeof texto === "string" && texto.length > Number(args[0])) {
            this.fallar(campo, "max", `El campo ${nombre} no debe superar ${args[0]} caracteres.`);
          } else if (typeof texto === "number" && texto > Number(args[0])) {
            this.fallar(campo, "max", `El campo ${nombre} no debe ser mayor que ${args[0]}.`);
          }
          break;

        case "between":
          if (typeof texto === "number" && (texto < Number(args[0]) || texto > Number(args[1]))) {
            this.fallar(campo, "between", `El campo ${nombre} debe estar entre ${args[0]} y ${args[1]}.`);
          }
          break;

        case "in":
          if (!args.includes(String(texto))) {
            this.fallar(campo, "in", `El campo ${nombre} debe ser uno de: ${args.join(", ")}.`);
          }
          break;

        case "not_in":
          if (args.includes(String(texto))) {
            this.fallar(campo, "not_in", `El campo ${nombre} contiene un valor no permitido.`);
          }
          break;

        case "date":
          if (Number.isNaN(Date.parse(String(texto)))) {
            this.fallar(campo, "date", `El campo ${nombre} debe ser una fecha valida.`);
          }
          break;

        case "after":
          if (Date.parse(String(texto)) <= Date.parse(args[0] === "hoy" ? new Date().toISOString() : args[0])) {
            this.fallar(campo, "after", `El campo ${nombre} debe ser posterior a ${args[0]}.`);
          }
          break;

        case "before":
          if (Date.parse(String(texto)) >= Date.parse(args[0] === "hoy" ? new Date().toISOString() : args[0])) {
            this.fallar(campo, "before", `El campo ${nombre} debe ser anterior a ${args[0]}.`);
          }
          break;

        case "confirmed":
          if (String(texto) !== String(this.datos[`${campo}_confirmation`] ?? "")) {
            this.fallar(campo, "confirmed", `La confirmacion de ${nombre} no coincide.`);
          }
          break;

        case "same":
          if (String(texto) !== String(this.datos[args[0]] ?? "")) {
            this.fallar(campo, "same", `El campo ${nombre} debe coincidir con ${etiqueta(args[0])}.`);
          }
          break;

        case "regex":
          if (!new RegExp(argumento).test(String(texto))) {
            this.fallar(campo, "regex", `El campo ${nombre} tiene un formato invalido.`);
          }
          break;

        case "unique": {
          // unique:tabla,columna[,idAExcluir[,columnaId]]
          const [tabla, columna = campo, excluirId, columnaId = "id"] = args;
          const consulta = db(tabla).where(columna, String(texto));
          if (excluirId !== undefined && excluirId !== "") {
            consulta.whereNot(columnaId, Number(excluirId));
          }
          const existe = await consulta.first();
          if (existe) {
            this.fallar(campo, "unique", `El valor de ${nombre} ya esta registrado.`);
          }
          break;
        }

        case "exists": {
          const [tabla, columna = "id"] = args;
          const existe = await db(tabla).where(columna, String(texto)).first();
          if (!existe) {
            this.fallar(campo, "exists", `El valor de ${nombre} no existe en el catalogo.`);
          }
          break;
        }

        default:
          throw new Error(`Regla de validacion desconocida: "${regla}".`);
      }
    }

    return resultado;
  }
}

/** Atajo: valida y devuelve los datos limpios. */
export async function validar(
  datos: Datos,
  reglas: Reglas,
  mensajes: Record<string, string> = {},
): Promise<Datos> {
  return new Validador(datos, reglas, mensajes).validar();
}
