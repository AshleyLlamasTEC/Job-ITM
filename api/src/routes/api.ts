/**
 * Tabla de rutas de la API.
 *
 * Es el equivalente a `routes/api.php` de Laravel: un solo archivo donde se ve
 * el mapa completo de la version 1. Cada bloque corresponde a un apartado del
 * capitulo 5 del documento de diseno, de modo que revisar el contrato sea leer
 * este archivo.
 *
 * Todas las rutas cuelgan de /api/v1.
 */
import { Router } from "express";

import { rutasAdmin } from "./admin";
import { rutasArchivos } from "./archivos";
import { rutasAuth } from "./auth";
import { rutasCatalogos } from "./catalogos";
import {
  rutasFavoritos,
  rutasMisPostulaciones,
  rutasNotificaciones,
  rutasPostulaciones,
  rutasReportes,
} from "./estudiante";
import { rutasEmpresa } from "./empresa";
import { rutasPerfil } from "./perfil";
import { rutasVacantes } from "./vacantes";

export const rutasApi = Router();

// 5.2 Autenticacion y cuentas
rutasApi.use("/auth", rutasAuth);

// 5.3 Catalogo publico y buscador
rutasApi.use("/catalogos", rutasCatalogos);
rutasApi.use("/vacantes", rutasVacantes);

// 5.4 Panel del estudiante
rutasApi.use("/perfil", rutasPerfil);
rutasApi.use("/postulaciones", rutasPostulaciones);
rutasApi.use("/mis-postulaciones", rutasMisPostulaciones);
rutasApi.use("/favoritos", rutasFavoritos);
rutasApi.use("/notificaciones", rutasNotificaciones);
rutasApi.use("/reportes", rutasReportes);

// 5.5 Panel de la empresa
rutasApi.use("/empresa", rutasEmpresa);

// 5.6 Panel de Vinculacion y administracion (parcial en E-2)
rutasApi.use("/admin", rutasAdmin);

// 8.3 Descarga de archivos con URL firmada
rutasApi.use("/archivos", rutasArchivos);

/**
 * GET /api/v1
 * Indice de la version. Sirve para comprobar que el servidor esta arriba y para
 * que quien consuma la API sepa que version esta viendo.
 */
rutasApi.get("/", (_req, res) => {
  res.json({
    data: {
      nombre: "Job ITM API",
      version: "v1",
      documentacion: "Ver capitulo 5 del documento de diseno.",
      modulos: [
        "auth",
        "catalogos",
        "vacantes",
        "perfil",
        "postulaciones",
        "favoritos",
        "notificaciones",
        "reportes",
        "empresa",
        "admin",
        "archivos",
      ],
    },
  });
});
