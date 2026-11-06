/**
 * Servicio de autenticacion.
 *
 * Concentra las reglas de negocio del capitulo 7.1 del diseño: registro del
 * estudiante con matricula, registro de la empresa en revision, verificacion de
 * correo por enlace firmado, inicio de sesion con limite de intentos y
 * restablecimiento de contrasena.
 *
 * Los controladores solo traducen HTTP a llamadas de este servicio.
 */
import { config } from "../../config";
import { db } from "../../support/database/connection";
import { Conflicto, NoAutenticado, NoEncontrado, SinPermiso } from "../../support/http/errors";
import { Hash } from "../../support/auth/hash";
import { firmar, verificarFirma } from "../../support/auth/firmas";
import { emitirToken, revocarTodos } from "../../support/auth/token";
import { asignarRol, permisosDe, rolDe, type UsuarioAutenticado } from "../../support/authorization/gate";
import type { Registro } from "../../support/model";
import { Carrera } from "../models/Carrera";
import { Empresa } from "../models/Empresa";
import { Estudiante } from "../models/Estudiante";
import { User } from "../models/User";
import { Correo } from "./Correo";

export interface DatosRegistroEstudiante {
  nombre: string;
  correo: string;
  contrasena: string;
  matricula: string;
  carrera_id: number;
  semestre?: number;
  telefono?: string;
}

export interface DatosRegistroEmpresa {
  nombre: string;
  correo: string;
  contrasena: string;
  razon_social: string;
  rfc: string;
  giro: string;
  telefono: string;
  contacto_nombre: string;
  contacto_correo: string;
  sitio_web?: string;
}

export interface SesionIniciada {
  usuario: Registro;
  token: string;
}

/** Correo con el enlace de verificacion. */
function enviarVerificacion(usuarioId: number, nombre: string, correo: string): void {
  const { expira, firma } = firmar(usuarioId, config.auth.horasVerificacion * 60);
  const enlace = `${config.app.url}/api/v1/auth/verificar-correo?usuario=${usuarioId}&expira=${expira}&firma=${firma}`;

  Correo.enviar({
    para: correo,
    asunto: "Confirma tu correo en Job ITM",
    texto: [
      `Hola ${nombre}:`,
      "",
      "Gracias por registrarte en Job ITM, la bolsa de trabajo del Tecnologico de Mexicali.",
      "Para activar tu cuenta abre el siguiente enlace:",
      "",
      enlace,
      "",
      `El enlace vence en ${config.auth.horasVerificacion} horas.`,
      "Si no solicitaste este registro, puedes ignorar este mensaje.",
    ].join("\n"),
  });
}

/** Correo con el enlace de restablecimiento. */
function enviarRestablecimiento(usuarioId: number, nombre: string, correo: string): void {
  const { expira, firma } = firmar(usuarioId, config.auth.minutosReset);
  const enlace = `${config.app.url}/api/v1/auth/restablecer?usuario=${usuarioId}&expira=${expira}&firma=${firma}`;

  Correo.enviar({
    para: correo,
    asunto: "Restablece tu contrasena de Job ITM",
    texto: [
      `Hola ${nombre}:`,
      "",
      "Recibimos una solicitud para restablecer tu contrasena.",
      "Abre el siguiente enlace para elegir una nueva:",
      "",
      enlace,
      "",
      `El enlace vence en ${config.auth.minutosReset} minutos y solo puede usarse una vez.`,
      "Si no fuiste tu, ignora este mensaje: tu contrasena no cambia.",
    ].join("\n"),
  });
}

/** Construye el objeto de sesion que consume el frontend. */
async function armarUsuario(userId: number): Promise<UsuarioAutenticado> {
  const fila = await User.buscar(userId);
  if (!fila) throw new NoAutenticado("La cuenta ya no existe.");

  return {
    id: Number(fila.id),
    nombre: String(fila.nombre),
    correo: String(fila.correo),
    estado: String(fila.estado),
    correo_verificado_en: fila.correo_verificado_en ?? null,
    rol: await rolDe(userId),
    permisos: await permisosDe(userId),
  };
}

export const Autenticacion = {
  /** Registro del estudiante: valida matricula y carrera, crea cuenta y perfil. */
  async registrarEstudiante(datos: DatosRegistroEstudiante): Promise<SesionIniciada> {
    const carrera = await Carrera.buscar(datos.carrera_id);
    if (!carrera) throw new NoEncontrado("La carrera seleccionada no existe.");

    const usuarioId = await db.transaction(async (trx) => {
      const id = await User.crear(
        {
          nombre: datos.nombre,
          correo: datos.correo.toLowerCase(),
          contrasena: await Hash.hacer(datos.contrasena),
        },
        trx,
      );

      await Estudiante.crear(
        {
          user_id: id,
          matricula: datos.matricula,
          carrera_id: datos.carrera_id,
          semestre: datos.semestre ?? null,
          telefono: datos.telefono ?? null,
        },
        trx,
      );

      return id;
    });

    await asignarRol(usuarioId, "estudiante");
    enviarVerificacion(usuarioId, datos.nombre, datos.correo);

    return {
      usuario: await armarUsuario(usuarioId),
      token: await emitirToken(usuarioId, "registro-web"),
    };
  },

  /** Registro de la empresa: queda pendiente hasta que Vinculacion la valide. */
  async registrarEmpresa(datos: DatosRegistroEmpresa): Promise<SesionIniciada> {
    const usuarioId = await db.transaction(async (trx) => {
      const id = await User.crear(
        {
          nombre: datos.nombre,
          correo: datos.correo.toLowerCase(),
          contrasena: await Hash.hacer(datos.contrasena),
        },
        trx,
      );

      await Empresa.crear(
        {
          user_id: id,
          razon_social: datos.razon_social,
          rfc: datos.rfc.toUpperCase(),
          giro: datos.giro,
          sitio_web: datos.sitio_web ?? null,
          telefono: datos.telefono,
          contacto_nombre: datos.contacto_nombre,
          contacto_correo: datos.contacto_correo.toLowerCase(),
          estatus_validacion: "pendiente",
        },
        trx,
      );

      return id;
    });

    await asignarRol(usuarioId, "empresa");
    enviarVerificacion(usuarioId, datos.nombre, datos.correo);

    Correo.enviar({
      para: datos.correo,
      asunto: "Recibimos el registro de tu empresa",
      texto: [
        `Hola ${datos.nombre}:`,
        "",
        `Registramos a ${datos.razon_social} en Job ITM.`,
        "El Departamento de Vinculacion revisara la informacion y te avisaremos por este medio.",
        "Mientras la cuenta este en revision no podras publicar vacantes.",
      ].join("\n"),
    });

    return {
      usuario: await armarUsuario(usuarioId),
      token: await emitirToken(usuarioId, "registro-web"),
    };
  },

  /** Inicio de sesion. Devuelve el token y el perfil con rol y permisos. */
  async iniciarSesion(correo: string, contrasena: string, dispositivo = "web"): Promise<SesionIniciada> {
    const fila = await User.porCorreoConCredenciales(correo);

    // El mensaje es el mismo exista o no la cuenta: no se revela quien esta registrado.
    if (!fila) throw new NoAutenticado("El correo o la contrasena no son correctos.");

    const coincide = await Hash.verificar(contrasena, String(fila.contrasena));
    if (!coincide) throw new NoAutenticado("El correo o la contrasena no son correctos.");

    if (fila.estado !== "activo") {
      throw new SinPermiso("La cuenta esta suspendida. Contacta al Departamento de Vinculacion.");
    }

    await User.marcarAcceso(Number(fila.id));

    return {
      usuario: await armarUsuario(Number(fila.id)),
      token: await emitirToken(Number(fila.id), dispositivo),
    };
  },

  /** Confirma el correo a partir del enlace firmado. */
  async verificarCorreo(usuarioId: number, expira: number, firma: string): Promise<void> {
    if (!verificarFirma(usuarioId, expira, firma)) {
      throw new Conflicto("El enlace de verificacion no es valido o ya vencio.");
    }

    const fila = await User.buscar(usuarioId);
    if (!fila) throw new NoEncontrado("La cuenta no existe.");

    if (fila.correo_verificado_en) return;

    await User.actualizar(usuarioId, { correo_verificado_en: new Date() });
  },

  /**
   * Solicita el restablecimiento. Responde igual exista o no el correo, para no
   * permitir averiguar que cuentas estan registradas.
   */
  async solicitarRestablecimiento(correo: string): Promise<void> {
    const fila = await User.porCorreo(correo);
    if (!fila) return;
    enviarRestablecimiento(Number(fila.id), String(fila.nombre), String(fila.correo));
  },

  /** Cambia la contrasena y revoca todas las sesiones abiertas. */
  async restablecerContrasena(
    usuarioId: number,
    expira: number,
    firma: string,
    contrasena: string,
  ): Promise<void> {
    if (!verificarFirma(usuarioId, expira, firma)) {
      throw new Conflicto("El enlace de restablecimiento no es valido o ya vencio.");
    }

    const fila = await User.buscar(usuarioId);
    if (!fila) throw new NoEncontrado("La cuenta no existe.");

    await User.actualizar(usuarioId, { contrasena: await Hash.hacer(contrasena) });
    await revocarTodos(usuarioId);

    Correo.enviar({
      para: String(fila.correo),
      asunto: "Tu contrasena cambio",
      texto: [
        `Hola ${fila.nombre}:`,
        "",
        "Tu contrasena de Job ITM se actualizo correctamente.",
        "Si no fuiste tu, contacta de inmediato al Departamento de Vinculacion.",
      ].join("\n"),
    });
  },

  /** Perfil completo para GET /auth/yo. */
  async perfil(userId: number): Promise<Registro> {
    const usuario = await armarUsuario(userId);

    let perfil: Registro | null = null;
    if (usuario.rol === "estudiante") {
      const fila = await Estudiante.conCarrera(userId);
      perfil = fila ? (Estudiante.presentar(fila) as Registro) : null;
    } else if (usuario.rol === "empresa") {
      const fila = await Empresa.porUserId(userId);
      perfil = fila ? (Empresa.presentar(fila) as Registro) : null;
    }

    return { ...usuario, perfil };
  },
};
