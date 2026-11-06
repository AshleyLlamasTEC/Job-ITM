/**
 * Rutas de autenticacion (apartado 5.2 del documento de diseno).
 *
 *   POST /auth/registro-estudiante   publico
 *   POST /auth/registro-empresa      publico
 *   POST /auth/verificar-correo      publico
 *   GET  /auth/verificar-correo      publico (enlace del correo)
 *   POST /auth/login                 publico
 *   POST /auth/recuperar             publico
 *   POST /auth/restablecer           publico
 *   POST /auth/logout                autenticado
 *   GET  /auth/yo                    autenticado
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";

import { config } from "../config";
import { AuthController } from "../app/controllers/AuthController";
import { autenticar } from "../app/middleware/autenticar";
import { accion } from "../support/http/asyncHandler";

/**
 * Limite de intentos en las rutas sensibles. Se aplica por IP y por ventana de
 * tiempo, igual que el `throttle` de Laravel, para frenar ataques de fuerza
 * bruta sin afectar el uso normal.
 */
const limitarIntentos = rateLimit({
  windowMs: config.auth.minutosBloqueo * 60 * 1000,
  limit: config.auth.maxIntentos * 4,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Las pruebas automatizadas inician sesion muchas veces desde la misma IP.
  skip: () => config.app.entorno === "test",
  message: { message: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." },
});

export const rutasAuth = Router();

rutasAuth.post("/registro-estudiante", limitarIntentos, accion(AuthController.registroEstudiante));
rutasAuth.post("/registro-empresa", limitarIntentos, accion(AuthController.registroEmpresa));
rutasAuth.post("/verificar-correo", accion(AuthController.verificarCorreo));
rutasAuth.get("/verificar-correo", accion(AuthController.verificarCorreo));
rutasAuth.post("/login", limitarIntentos, accion(AuthController.login));
rutasAuth.post("/recuperar", limitarIntentos, accion(AuthController.recuperar));
rutasAuth.post("/restablecer", limitarIntentos, accion(AuthController.restablecer));

rutasAuth.post("/logout", autenticar, accion(AuthController.logout));
rutasAuth.get("/yo", autenticar, accion(AuthController.yo));
