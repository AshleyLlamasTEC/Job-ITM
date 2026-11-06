/**
 * Pruebas de la etapa E-1.
 *
 * Cubren el criterio de avance del documento ("un usuario de cada rol inicia
 * sesion y recibe el token correcto") y los casos de error que exige la
 * definicion de terminado: validacion 422, falta de token 401 y falta de permiso
 * 403.
 *
 * Las pruebas corren contra la base real de desarrollo. Antes de ejecutarlas hay
 * que tener el esquema migrado y las semillas cargadas:
 *
 *   npm run migrate:fresh && npm run seed && npm test
 */
import express from "express";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/bootstrap/app";
import { autenticar } from "../src/app/middleware/autenticar";
import { autorizar } from "../src/app/middleware/autorizar";
import { manejarErrores } from "../src/app/middleware/manejarErrores";
import { cerrarConexion } from "../src/support/database/connection";

const app = crearAplicacion();

const CUENTAS = [
  { correo: "admin@itmexicali.edu.mx", rol: "admin_tecnico" },
  { correo: "vinculacion@itmexicali.edu.mx", rol: "vinculacion" },
  { correo: "empresa@demo.com", rol: "empresa" },
  { correo: "alumno@itmexicali.edu.mx", rol: "estudiante" },
];

async function iniciarSesion(correo: string): Promise<string> {
  const respuesta = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo, contrasena: "demo1234" });
  expect(respuesta.status).toBe(200);
  return respuesta.body.data.token as string;
}

afterAll(async () => {
  await cerrarConexion();
});

describe("servicio vivo", () => {
  it("responde la comprobacion de salud", async () => {
    const respuesta = await request(app).get("/salud");
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe("ok");
  });

  it("expone el indice de la version 1", async () => {
    const respuesta = await request(app).get("/api/v1");
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.version).toBe("v1");
  });
});

describe("autenticacion", () => {
  it.each(CUENTAS)("permite entrar a $correo con el rol $rol", async ({ correo, rol }) => {
    const respuesta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo, contrasena: "demo1234" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.usuario.rol).toBe(rol);
    // El token de Sanctum tiene la forma "id|aleatorio".
    expect(respuesta.body.data.token).toMatch(/^\d+\|[A-Za-z0-9_-]+$/);
  });

  it("rechaza una contrasena incorrecta con 401", async () => {
    const respuesta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "incorrecta" });

    expect(respuesta.status).toBe(401);
    // El mensaje no revela si la cuenta existe.
    expect(respuesta.body.message).toContain("correo o la contrasena");
  });

  it("devuelve el perfil con rol y permisos efectivos", async () => {
    const token = await iniciarSesion("vinculacion@itmexicali.edu.mx");
    const respuesta = await request(app)
      .get("/api/v1/auth/yo")
      .set("Authorization", `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.rol).toBe("vinculacion");
    expect(respuesta.body.data.permisos).toContain("vacantes.moderar");
    expect(respuesta.body.data.permisos).not.toContain("usuarios.gestionar");
  });

  it("da acceso total al admin_tecnico mediante la regla global", async () => {
    const token = await iniciarSesion("admin@itmexicali.edu.mx");
    const respuesta = await request(app)
      .get("/api/v1/auth/yo")
      .set("Authorization", `Bearer ${token}`);

    expect(respuesta.body.data.permisos).toEqual(["*"]);
  });

  it("rechaza una peticion sin token con 401", async () => {
    const respuesta = await request(app).get("/api/v1/auth/yo");
    expect(respuesta.status).toBe(401);
  });

  it("rechaza un token inventado con 401", async () => {
    const respuesta = await request(app)
      .get("/api/v1/auth/yo")
      .set("Authorization", "Bearer 999|tokenQueNoExiste");

    expect(respuesta.status).toBe(401);
  });

  it("cierra la sesion y revoca el token", async () => {
    const token = await iniciarSesion("alumno@itmexicali.edu.mx");

    const salida = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect(salida.status).toBe(204);

    const despues = await request(app)
      .get("/api/v1/auth/yo")
      .set("Authorization", `Bearer ${token}`);
    expect(despues.status).toBe(401);
  });
});

describe("validacion", () => {
  it("responde 422 con el detalle por campo", async () => {
    const respuesta = await request(app).post("/api/v1/auth/registro-estudiante").send({
      nombre: "",
      correo: "no-es-correo",
      contrasena: "123",
      matricula: "",
      carrera_id: 99999,
    });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.message).toBeTruthy();
    expect(Object.keys(respuesta.body.errors)).toEqual(
      expect.arrayContaining(["nombre", "correo", "contrasena", "matricula", "carrera_id"]),
    );
  });

  it("impide registrar dos veces el mismo correo", async () => {
    const respuesta = await request(app).post("/api/v1/auth/registro-estudiante").send({
      nombre: "Duplicado",
      correo: "alumno@itmexicali.edu.mx",
      contrasena: "secreta123",
      matricula: "99999999",
      carrera_id: 1,
    });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errors.correo?.[0]).toContain("ya esta registrado");
  });

  it("responde 404 con la envoltura de la API", async () => {
    const respuesta = await request(app).get("/api/v1/ruta-que-no-existe");
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.message).toContain("no existe");
  });
});

describe("autorizacion por permiso", () => {
  // Aplicacion minima que exige el permiso real de la matriz, para probar el
  // middleware sin depender de una etapa posterior.
  const appProtegida = express();
  appProtegida.get("/solo-moderadores", autenticar, autorizar("vacantes.moderar"), (_req, res) => {
    res.json({ data: "ok" });
  });
  appProtegida.use(manejarErrores);

  it("deja pasar al rol que tiene el permiso", async () => {
    const token = await iniciarSesion("vinculacion@itmexicali.edu.mx");
    const respuesta = await request(appProtegida)
      .get("/solo-moderadores")
      .set("Authorization", `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
  });

  it("bloquea con 403 al rol que no lo tiene", async () => {
    const token = await iniciarSesion("alumno@itmexicali.edu.mx");
    const respuesta = await request(appProtegida)
      .get("/solo-moderadores")
      .set("Authorization", `Bearer ${token}`);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.message).toContain("vacantes.moderar");
  });

  it("concede el permiso al admin_tecnico sin asignarlo", async () => {
    const token = await iniciarSesion("admin@itmexicali.edu.mx");
    const respuesta = await request(appProtegida)
      .get("/solo-moderadores")
      .set("Authorization", `Bearer ${token}`);

    expect(respuesta.status).toBe(200);
  });
});
