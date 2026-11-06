/**
 * Controlador de autenticacion.
 *
 * Traduce HTTP a llamadas del servicio Autenticacion. No contiene reglas de
 * negocio: solo valida la forma de los datos y elige el codigo de respuesta.
 *
 * Rutas del apartado 5.2 del documento de diseno.
 */
import type { Request, Response } from "express";

import { cuerpo } from "../../support/http/request";
import { creado, mensaje, ok, sinContenido } from "../../support/http/response";
import { validar } from "../../support/validation/validator";
import { revocarToken } from "../../support/auth/token";
import { Autenticacion } from "../services/Autenticacion";

/** Reglas compartidas por los dos formularios de registro. */
const REGLAS_CUENTA = {
  nombre: "required|string|max:120",
  correo: "required|email|max:150|unique:users,correo",
  contrasena: "required|string|min:8|max:72",
};

export const AuthController = {
  /** POST /auth/registro-estudiante */
  async registroEstudiante(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      ...REGLAS_CUENTA,
      matricula: "required|string|max:12|unique:estudiantes,matricula",
      carrera_id: "required|integer|exists:carreras,id",
      semestre: "nullable|integer|between:1,12",
      telefono: "nullable|string|max:15",
    });

    const sesion = await Autenticacion.registrarEstudiante({
      nombre: String(datos.nombre),
      correo: String(datos.correo),
      contrasena: String(datos.contrasena),
      matricula: String(datos.matricula),
      carrera_id: Number(datos.carrera_id),
      semestre: datos.semestre === undefined ? undefined : Number(datos.semestre),
      telefono: datos.telefono === undefined ? undefined : String(datos.telefono),
    });

    creado(res, {
      usuario: sesion.usuario,
      token: sesion.token,
      mensaje: "Revisa tu correo para confirmar la cuenta.",
    });
  },

  /** POST /auth/registro-empresa */
  async registroEmpresa(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      ...REGLAS_CUENTA,
      razon_social: "required|string|max:160",
      rfc: "required|string|max:13|unique:empresas,rfc",
      giro: "required|string|max:80",
      telefono: "required|string|max:15",
      contacto_nombre: "required|string|max:120",
      contacto_correo: "required|email|max:150",
      sitio_web: "nullable|url|max:120",
    });

    const sesion = await Autenticacion.registrarEmpresa({
      nombre: String(datos.nombre),
      correo: String(datos.correo),
      contrasena: String(datos.contrasena),
      razon_social: String(datos.razon_social),
      rfc: String(datos.rfc),
      giro: String(datos.giro),
      telefono: String(datos.telefono),
      contacto_nombre: String(datos.contacto_nombre),
      contacto_correo: String(datos.contacto_correo),
      sitio_web: datos.sitio_web === undefined ? undefined : String(datos.sitio_web),
    });

    creado(res, {
      usuario: sesion.usuario,
      token: sesion.token,
      mensaje: "Tu empresa quedo en revision. Vinculacion te avisara por correo.",
    });
  },

  /** POST /auth/login */
  async login(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      correo: "required|email",
      contrasena: "required|string",
      dispositivo: "nullable|string|max:80",
    });

    const sesion = await Autenticacion.iniciarSesion(
      String(datos.correo),
      String(datos.contrasena),
      datos.dispositivo === undefined ? "web" : String(datos.dispositivo),
    );

    ok(res, { usuario: sesion.usuario, token: sesion.token });
  },

  /** POST /auth/verificar-correo y GET /auth/verificar-correo (enlace del correo). */
  async verificarCorreo(req: Request, res: Response): Promise<void> {
    const fuente = req.method === "GET" ? (req.query as Record<string, unknown>) : cuerpo(req);
    const datos = await validar(fuente, {
      usuario: "required|integer",
      expira: "required|integer",
      firma: "required|string",
    });

    await Autenticacion.verificarCorreo(
      Number(datos.usuario),
      Number(datos.expira),
      String(datos.firma),
    );

    mensaje(res, "Tu correo quedo verificado. Ya puedes iniciar sesion.");
  },

  /** POST /auth/recuperar */
  async recuperar(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), { correo: "required|email" });
    await Autenticacion.solicitarRestablecimiento(String(datos.correo));

    // La respuesta es la misma exista o no la cuenta: no se revela quien esta registrado.
    mensaje(res, "Si el correo esta registrado, recibiras un enlace para restablecer la contrasena.");
  },

  /** POST /auth/restablecer */
  async restablecer(req: Request, res: Response): Promise<void> {
    const datos = await validar(cuerpo(req), {
      usuario: "required|integer",
      expira: "required|integer",
      firma: "required|string",
      contrasena: "required|string|min:8|max:72",
    });

    await Autenticacion.restablecerContrasena(
      Number(datos.usuario),
      Number(datos.expira),
      String(datos.firma),
      String(datos.contrasena),
    );

    mensaje(res, "Tu contrasena se actualizo. Vuelve a iniciar sesion.");
  },

  /** POST /auth/logout */
  async logout(req: Request, res: Response): Promise<void> {
    if (req.tokenId) await revocarToken(req.tokenId);
    sinContenido(res);
  },

  /** GET /auth/yo */
  async yo(req: Request, res: Response): Promise<void> {
    ok(res, await Autenticacion.perfil(req.usuario!.id));
  },
};
