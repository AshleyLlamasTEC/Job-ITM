/**
 * Arranque de la aplicacion HTTP.
 *
 * Equivalente a `bootstrap/app.php` de Laravel: un solo lugar donde se montan
 * los middleware globales, las rutas y el manejo de errores. `server.ts` solo se
 * encarga de escuchar y de apagar ordenadamente.
 */
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { config } from "../config";
import { manejarErrores, noEncontrado } from "../app/middleware/manejarErrores";
import { rutasApi } from "../routes/api";

export function crearAplicacion(): Express {
  const app = express();

  // Detras de un proxy (nginx, Docker) se necesita para que req.ip sea la del
  // cliente real y el limitador de intentos no bloquee a todos por igual.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  // Cabeceras de seguridad. La API no sirve HTML, asi que la politica de
  // contenido se relaja para no estorbar al cliente.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origen, callback) {
        // Las herramientas de escritorio y curl no envian Origin.
        if (!origen) return callback(null, true);
        if (config.cors.origenes.includes(origen)) return callback(null, true);
        return callback(new Error(`El origen ${origen} no esta autorizado por CORS.`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    }),
  );

  // El limite es holgado porque las descripciones de vacante viajan en el cuerpo.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Las respuestas dependen del usuario y cambian con frecuencia: no se
  // cachean. Sin esto Express responde 304 y el cliente se queda sin cuerpo.
  app.disable("etag");

  // Todas las respuestas de la API son JSON, incluidas las de error.
  app.use((_req, res, next) => {
    res.setHeader("Accept", "application/json");
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // Comprobacion de salud: la usa el despliegue y sirve para saber si el
  // proceso esta vivo sin tocar la base de datos.
  app.get("/salud", (_req, res) => {
    res.json({ estado: "ok", servicio: config.app.nombre, entorno: config.app.entorno });
  });

  app.use("/api/v1", rutasApi);

  // 404 y manejador de errores van al final, en ese orden.
  app.use(noEncontrado);
  app.use(manejarErrores);

  return app;
}
