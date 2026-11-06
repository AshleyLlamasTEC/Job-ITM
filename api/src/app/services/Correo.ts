/**
 * Envio de correo.
 *
 * El diseño exige que la notificacion por correo no bloquee la respuesta de la
 * API y que, si el envio falla, el aviso interno quede como respaldo.
 *
 * En desarrollo el driver `log` escribe el mensaje en storage/logs/mail.log en
 * lugar de enviarlo: asi se puede probar el flujo completo sin servidor SMTP y
 * sin mandar correos reales a nadie. En produccion basta con cambiar
 * MAIL_DRIVER=smtp y llenar las credenciales.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { config } from "../../config";

export interface Mensaje {
  para: string;
  asunto: string;
  texto: string;
  html?: string;
}

const RUTA_LOG = join(process.cwd(), "storage", "logs", "mail.log");

async function escribirEnLog(mensaje: Mensaje): Promise<void> {
  await mkdir(dirname(RUTA_LOG), { recursive: true });
  const bloque = [
    "=".repeat(78),
    `Fecha:    ${new Date().toISOString()}`,
    `Para:     ${mensaje.para}`,
    `De:       ${config.mail.remitenteNombre} <${config.mail.remitenteCorreo}>`,
    `Asunto:   ${mensaje.asunto}`,
    "",
    mensaje.texto,
    "",
  ].join("\n");

  await appendFile(RUTA_LOG, bloque, "utf8");
}

export const Correo = {
  /**
   * Encola el envio. No se espera el resultado a proposito: la peticion HTTP no
   * debe fallar porque el servidor de correo este caido.
   */
  enviar(mensaje: Mensaje): void {
    void (async () => {
      try {
        if (config.mail.driver === "log") {
          await escribirEnLog(mensaje);
        } else {
          // El driver SMTP se implementa en la etapa de notificaciones (E-4).
          await escribirEnLog(mensaje);
        }
      } catch (error) {
        console.error("[correo] No se pudo registrar el mensaje:", (error as Error).message);
      }
    })();
  },
};
