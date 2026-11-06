/**
 * Avisos del negocio.
 *
 * El apartado 9 fija que cada evento genera un correo y, cuando tiene sentido,
 * un aviso interno. Se centraliza aqui para que el texto sea el mismo sin
 * importar que servicio disparo el evento, y para que ningun cambio de estado
 * se olvide de avisar al alumno.
 *
 * El correo se encola (no bloquea la respuesta) y el aviso interno se guarda
 * como respaldo: si el envio falla, el usuario igual se entera al entrar.
 */
import { config } from "../../config";
import { Notificacion } from "../models/Notificacion";
import { Postulacion } from "../models/Postulacion";
import { Correo } from "./Correo";

interface Destinatario {
  userId: number;
  correo: string;
  nombre: string;
}

interface DatosPostulacion {
  vacanteId: number;
  vacanteTitulo: string;
  empresa: string;
}

/** Enlace absoluto a una pantalla del frontend. */
function enlace(ruta: string): string {
  return `${config.app.url}${ruta}`;
}

export const Avisos = {
  /**
   * Se postulo un alumno: se avisa a la empresa y se confirma al alumno.
   * Dos correos y dos avisos, como pide la tabla 37 del apartado 9.
   */
  async postulacionRecibida(
    empresa: Destinatario,
    alumno: Destinatario,
    datos: DatosPostulacion,
  ): Promise<void> {
    await Notificacion.enviar(empresa.userId, {
      tipo: "postulacion_recibida",
      titulo: "Nuevo candidato en tu vacante",
      mensaje: `${alumno.nombre} se postulo a "${datos.vacanteTitulo}".`,
      url: `/empresa/vacantes/${datos.vacanteId}/candidatos`,
    });

    Correo.enviar({
      para: empresa.correo,
      asunto: `Nuevo candidato para "${datos.vacanteTitulo}"`,
      texto: [
        `Hola ${empresa.nombre}:`,
        "",
        `${alumno.nombre} envio su candidatura a la vacante "${datos.vacanteTitulo}".`,
        "Revisa el perfil y el curriculum desde el panel de la empresa:",
        "",
        enlace(`/empresa/vacantes/${datos.vacanteId}/candidatos`),
      ].join("\n"),
    });

    await Notificacion.enviar(alumno.userId, {
      tipo: "postulacion_enviada",
      titulo: "Tu candidatura fue enviada",
      mensaje: `Recibimos tu postulacion a "${datos.vacanteTitulo}" en ${datos.empresa}.`,
      url: `/mis-postulaciones`,
    });

    Correo.enviar({
      para: alumno.correo,
      asunto: "Recibimos tu candidatura",
      texto: [
        `Hola ${alumno.nombre}:`,
        "",
        `Tu candidatura a "${datos.vacanteTitulo}" en ${datos.empresa} quedo registrada.`,
        "El estado inicial es Recibida; te avisaremos por este medio cada vez que cambie.",
        "",
        enlace("/mis-postulaciones"),
      ].join("\n"),
    });
  },

  /**
   * La empresa movio al alumno de etapa.
   *
   * No se incluye `notas_empresa`: son privadas y no pueden aparecer en nada
   * que consuma el estudiante, ni siquiera en el correo (apartado 7.4).
   */
  async cambioEstadoPostulacion(
    alumno: Destinatario,
    datos: DatosPostulacion,
    estado: string,
  ): Promise<void> {
    const etiqueta = Postulacion.etiqueta(estado);

    await Notificacion.enviar(alumno.userId, {
      tipo: `postulacion_${estado}`,
      titulo: `Tu candidatura paso a ${etiqueta}`,
      mensaje: `"${datos.vacanteTitulo}" en ${datos.empresa}.`,
      url: `/mis-postulaciones`,
    });

    Correo.enviar({
      para: alumno.correo,
      asunto: `Tu candidatura paso a ${etiqueta}`,
      texto: [
        `Hola ${alumno.nombre}:`,
        "",
        `Tu candidatura a "${datos.vacanteTitulo}" en ${datos.empresa} cambio de estado a: ${etiqueta}.`,
        "",
        enlace("/mis-postulaciones"),
      ].join("\n"),
    });
  },

  /** El alumno cancelo su candidatura: se avisa a la empresa. */
  async postulacionCancelada(
    empresa: Destinatario,
    alumno: Destinatario,
    datos: DatosPostulacion,
  ): Promise<void> {
    await Notificacion.enviar(empresa.userId, {
      tipo: "postulacion_cancelada",
      titulo: "Un candidato retiro su postulacion",
      mensaje: `${alumno.nombre} cancelo su candidatura a "${datos.vacanteTitulo}".`,
      url: `/empresa/vacantes/${datos.vacanteId}/candidatos`,
    });
  },

  /** Se aprueba el registro de una empresa (tabla 37, apartado 9). */
  async empresaAprobada(empresa: Destinatario, razonSocial: string): Promise<void> {
    await Notificacion.enviar(empresa.userId, {
      tipo: "empresa_aprobada",
      titulo: "Tu empresa fue aprobada",
      mensaje: `Tu cuenta de ${razonSocial} ya esta validada. Puedes publicar vacantes.`,
      url: "/empresa/vacantes",
    });

    Correo.enviar({
      para: empresa.correo,
      asunto: "Tu empresa fue aprobada",
      texto: [
        `Hola ${razonSocial}:`,
        "",
        "El Departamento de Vinculacion aprobo tu registro. Ya puedes iniciar",
        "sesion, editar tu perfil y enviar vacantes a revision.",
        "",
        enlace("/empresa/vacantes"),
      ].join("\n"),
    });
  },

  /** Se rechaza el registro de una empresa (tabla 37, apartado 9). */
  async empresaRechazada(empresa: Destinatario, razonSocial: string, motivo: string): Promise<void> {
    await Notificacion.enviar(empresa.userId, {
      tipo: "empresa_rechazada",
      titulo: "Tu registro no fue aprobado",
      mensaje: motivo,
      url: "/empresa/perfil",
    });

    Correo.enviar({
      para: empresa.correo,
      asunto: "Tu registro necesita correcciones",
      texto: [
        `Hola ${razonSocial}:`,
        "",
        "El Departamento de Vinculacion no aprobo el registro de tu empresa.",
        `Motivo: ${motivo}`,
        "",
        "Corrige los datos desde tu perfil y vuelve a enviarlo.",
        "",
        enlace("/empresa/perfil"),
      ].join("\n"),
    });
  },

  /** Se retira una vacante publicada del buscador (baja administrativa). */
  async vacanteDadaDeBaja(
    empresa: Destinatario,
    datos: DatosPostulacion,
    motivo: string,
  ): Promise<void> {
    await Notificacion.enviar(empresa.userId, {
      tipo: "vacante_dada_de_baja",
      titulo: "Tu vacante fue retirada",
      mensaje: `"${datos.vacanteTitulo}": ${motivo}`,
      url: "/empresa/vacantes",
    });

    Correo.enviar({
      para: empresa.correo,
      asunto: `Tu vacante "${datos.vacanteTitulo}" fue retirada`,
      texto: [
        `Hola ${empresa.nombre}:`,
        "",
        `El Departamento de Vinculacion retiro la vacante "${datos.vacanteTitulo}" del buscador.`,
        `Motivo: ${motivo}`,
        "",
        "Si necesitas aclarar algo, responde este correo.",
      ].join("\n"),
    });
  },

  /** El que reporto una vacante recibe aviso de que su reporte ya se atendio. */
  async reporteAtendido(
    reportante: Destinatario,
    datos: { vacanteTitulo: string; estado: string; detalle?: string | null },
  ): Promise<void> {
    const etiqueta = datos.estado === "resuelto" ? "resuelto" : datos.estado === "descartado" ? "descartado" : datos.estado;

    await Notificacion.enviar(reportante.userId, {
      tipo: "reporte_atendido",
      titulo: "Tu reporte fue atendido",
      mensaje: `Reporte de "${datos.vacanteTitulo}": ${etiqueta}.`,
      url: "/vacantes",
    });

    Correo.enviar({
      para: reportante.correo,
      asunto: "Tu reporte fue atendido",
      texto: [
        `Hola ${reportante.nombre}:`,
        "",
        `El reporte que hiciste sobre "${datos.vacanteTitulo}" fue atendido por Vinculacion.`,
        `Estado: ${etiqueta}.`,
        ...(datos.detalle ? [`Respuesta: ${datos.detalle}`] : []),
        "",
        "Gracias por ayudarnos a mantener la calidad del portal.",
      ].join("\n"),
    });
  },
};
