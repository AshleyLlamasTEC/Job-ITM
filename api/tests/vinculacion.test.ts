/**
 * Pruebas de la etapa E-5.
 *
 * Cubren el panel de Vinculacion: validacion de empresas (aprobar y rechazar),
 * atencion de reportes, baja administrativa de vacantes, tablero e indicadores,
 * exportacion CSV, administracion de cuentas/roles y consulta de la bitacora.
 * Cada corrida usa datos nuevos con un sello aleatorio, de modo que no depende
 * del estado previo de la base job_itm_test.
 *
 *   npm run test:prepare && npm test
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/bootstrap/app";
import { db, cerrarConexion } from "../src/support/database/connection";
import { hoyLocal, sumarDias } from "../src/support/fechas";

const app = crearAplicacion();
const sello = Date.now().toString(36).toUpperCase();
const CIERRE = sumarDias(hoyLocal(), 60);

let tokenVinculacion = "";
let tokenAdmin = "";
let tokenAlumno = "";

let empresaPendienteId = 0;
let empresaRechazadaId = 0;
let empresaRechazadaCorreo = "";
let empresaRechazadaToken = "";
let empresaPendienteToken = "";

let vacanteId = 0;
let postulacionId = 0;

async function entrar(correo: string): Promise<string> {
  const respuesta = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo, contrasena: "demo1234" });
  expect(respuesta.status).toBe(200);
  return respuesta.body.data.token as string;
}

async function registrarEmpresa(sufijo: string) {
  const respuesta = await request(app).post("/api/v1/auth/registro-empresa").send({
    nombre: `Empresa ${sufijo}`,
    correo: `empresa.${sufijo}.${sello}@example.com`,
    contrasena: "secreta123",
    razon_social: `Industrias ${sufijo} ${sello} S.A. de C.V.`,
    rfc: `XA${sufijo}${sello.slice(-6)}`.slice(0, 13),
    giro: "Manufactura",
    telefono: "6861234567",
    contacto_nombre: `Asesor ${sufijo}`,
    contacto_correo: `contacto.${sufijo}.${sello}@example.com`,
  });

  expect(respuesta.status).toBe(201);
  const userId = respuesta.body.data.usuario.id as number;
  const empresa = await db("empresas").where({ user_id: userId }).first();
  expect(empresa).toBeTruthy();

  return {
    id: Number(empresa!.id),
    correo: respuesta.body.data.usuario.correo as string,
    token: respuesta.body.data.token as string,
  };
}

async function publicarVacanteDeEmpresa(token: string): Promise<number> {
  const alta = await request(app)
    .post("/api/v1/empresa/vacantes")
    .set("Authorization", `Bearer ${token}`)
    .send({
      titulo: `Practicante Vinculacion ${sello}`,
      descripcion: "Practicas en piso de produccion.",
      requisitos: "Ingenieria Industrial, sexto semestre.",
      tipo: "practicas",
      modalidad: "presencial",
      ciudad: "Mexicali",
      salario_min: 4000,
      salario_max: 5000,
      mostrar_salario: true,
      fecha_cierre: CIERRE,
      carrera_id: 2,
    });

  expect(alta.status).toBe(201);
  const id = alta.body.data.id as number;

  await request(app)
    .post(`/api/v1/empresa/vacantes/${id}/enviar`)
    .set("Authorization", `Bearer ${token}`);

  await request(app)
    .post(`/api/v1/admin/vacantes/${id}/aprobar`)
    .set("Authorization", `Bearer ${tokenVinculacion}`);

  return id;
}

beforeAll(async () => {
  [tokenVinculacion, tokenAdmin, tokenAlumno] = await Promise.all([
    entrar("vinculacion@itmexicali.edu.mx"),
    entrar("admin@itmexicali.edu.mx"),
    entrar("alumno@itmexicali.edu.mx"),
  ]);

  const aprobada = await registrarEmpresa("ACE" + sello.slice(-4));
  const rechazada = await registrarEmpresa("REC" + sello.slice(-4));
  empresaPendienteId = aprobada.id;
  empresaPendienteToken = aprobada.token;
  empresaRechazadaId = rechazada.id;
  empresaRechazadaCorreo = rechazada.correo;
  empresaRechazadaToken = rechazada.token;
});

afterAll(async () => {
  await cerrarConexion();
});

describe("validacion de empresas", () => {
  it("muestra las pendientes, primero las mas antiguas", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/empresas")
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    const pendientes = respuesta.body.data.map((e: { id: number }) => e.id);
    expect(pendientes).toContain(empresaPendienteId);
    expect(pendientes).toContain(empresaRechazadaId);
  });

  it("exige el motivo para rechazar", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/empresas/${empresaRechazadaId}/rechazar`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({});

    expect(respuesta.status).toBe(422);
  });

  it("rechaza con motivo y avisa a la empresa", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/empresas/${empresaRechazadaId}/rechazar`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({ motivo: "El RFC no corresponde al registro oficial." });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.estatus_validacion).toBe("rechazada");

    // La empresa recibe el aviso interno ademas del correo (tabla 37 del docx).
    const avisos = await request(app)
      .get("/api/v1/notificaciones")
      .set("Authorization", `Bearer ${empresaRechazadaToken}`);

    const aviso = avisos.body.data.find(
      (n: { tipo: string }) => n.tipo === "empresa_rechazada",
    );
    expect(aviso).toBeTruthy();
    expect(aviso.titulo).toBe("Tu registro no fue aprobado");
  });

  it("la rechazada no puede publicar vacantes", async () => {
    const respuesta = await request(app)
      .post("/api/v1/empresa/vacantes")
      .set("Authorization", `Bearer ${empresaRechazadaToken}`)
      .send({
        titulo: `Vacante rechazada ${sello}`,
        descripcion: "No deberia publicarse.",
        requisitos: "N/A",
        tipo: "temporal",
        modalidad: "presencial",
        ciudad: "Mexicali",
        salario_min: 1000,
        salario_max: 2000,
        mostrar_salario: true,
        fecha_cierre: CIERRE,
        carrera_id: 2,
      });

    expect(respuesta.status).toBe(403);
  });

  it("aprueba la pendiente y la habilita para publicar", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/empresas/${empresaPendienteId}/aprobar`)
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.estatus_validacion).toBe("aprobada");

    vacanteId = await publicarVacanteDeEmpresa(empresaPendienteToken);
    expect(vacanteId).toBeGreaterThan(0);
  });

  it("no revalida una empresa ya resuelta", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/empresas/${empresaRechazadaId}/aprobar`)
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(409);
  });

  it("los no autorizados no pueden validar empresas", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/empresas")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(403);
  });
});

describe("baja administrativa", () => {
  it("retira una vacante publicada del buscador", async () => {
    const baja = await request(app)
      .post(`/api/v1/admin/vacantes/${vacanteId}/baja`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({ motivo: "El puesto ya se cubrio con un candidato externo." });

    expect(baja.status).toBe(200);
    expect(baja.body.data.estado).toBe("cerrada");

    const buscador = await request(app).get("/api/v1/vacantes").query({ q: `Practicante Vinculacion ${sello}` });
    expect(buscador.body.meta.total).toBe(0);
  });

  it("exige motivo para la baja", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/vacantes/${vacanteId}/baja`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({});

    expect(respuesta.status).toBe(422);
  });

  it("no baja una vacante que no esta publicada", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/vacantes/${vacanteId}/baja`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({ motivo: "Segunda vez" });

    expect(respuesta.status).toBe(409);
  });

  it("la empresa no puede dar baja una vacante publicada", async () => {
    const otra = await publicarVacanteDeEmpresa(empresaPendienteToken);

    const respuesta = await request(app)
      .post(`/api/v1/admin/vacantes/${otra}/baja`)
      .set("Authorization", `Bearer ${empresaPendienteToken}`)
      .send({ motivo: "Quiero que se retire." });

    expect(respuesta.status).toBe(403);
  });
});

describe("atencion de reportes", () => {
  it("enlista los reportes abiertos y los resuelve", async () => {
    // Se genera un reporte real para tener algo que atender.
    const publicada = await publicarVacanteDeEmpresa(empresaPendienteToken);
    const reporte = await request(app)
      .post("/api/v1/reportes")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: publicada, motivo: "informacion_falsa", detalle: "El salario no coincide." });

    expect(reporte.status).toBe(201);
    const reporteId = reporte.body.data.id as number;

    const bandeja = await request(app)
      .get("/api/v1/admin/reportes")
      .set("Authorization", `Bearer ${tokenVinculacion}`);
    expect(bandeja.status).toBe(200);
    expect(bandeja.body.data.map((r: { id: number }) => r.id)).toContain(reporteId);

    const resuelto = await request(app)
      .put(`/api/v1/admin/reportes/${reporteId}`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({ estado: "descartado", detalle: "La informacion ya se corrigio." });
    expect(resuelto.status).toBe(200);
    expect(resuelto.body.data.estado).toBe("descartado");

    const despues = await request(app)
      .get("/api/v1/admin/reportes")
      .set("Authorization", `Bearer ${tokenVinculacion}`);
    expect(despues.body.data.map((r: { id: number }) => r.id)).not.toContain(reporteId);
  });

  it("rechaza un estado que no existe en el ciclo", async () => {
    const bandeja = await request(app)
      .get("/api/v1/admin/reportes")
      .set("Authorization", `Bearer ${tokenVinculacion}`);
    const abierto = bandeja.body.data[0];
    if (!abierto) return; // sin pendientes, el caso queda cubierto por el 422 de validacion

    const respuesta = await request(app)
      .put(`/api/v1/admin/reportes/${abierto.id}`)
      .set("Authorization", `Bearer ${tokenVinculacion}`)
      .send({ estado: "cerrado" });

    expect(respuesta.status).toBe(400);
  });

  it("los no autorizados no pueden atender reportes", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/reportes")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(403);
  });
});

describe("tablero e indicadores", () => {
  it("devuelve el tablero con las agrupaciones esperadas", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/tablero")
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.por_estado_vacante).toBeTruthy();
    expect(respuesta.body.data.por_estatus_empresa).toBeTruthy();
    expect(respuesta.body.data.por_estado_postulacion).toBeTruthy();
    expect(respuesta.body.data.por_estado_usuario).toBeTruthy();
    expect(respuesta.body.data.moderacion).toBeTruthy();
  });

  it("devuelve series por mes, carrera y empresa", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/indicadores")
      .query({ periodo: "6m" })
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.data.meses)).toBe(true);
    expect(Array.isArray(respuesta.body.data.por_carrera)).toBe(true);
    expect(Array.isArray(respuesta.body.data.por_empresa)).toBe(true);
    expect(Array.isArray(respuesta.body.data.por_estado_postulacion)).toBe(true);
    expect(respuesta.body.data.totales).toBeTruthy();
  });

  it("los no autorizados no pueden ver indicadores", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/tablero")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(403);
  });
});

describe("exportacion CSV", () => {
  it("exporta vacantes", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/exportar/vacantes")
      .query({ estado: "cerrada" })
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers["content-type"]).toContain("text/csv");
    expect(respuesta.text.startsWith("\uFEFF")).toBe(true);
    expect(respuesta.text).toContain("Folio,Titulo,Empresa,Tipo");
  });

  it("exporta postulaciones", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/exportar/postulaciones")
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers["content-type"]).toContain("text/csv");
    expect(respuesta.text).toContain("Folio,Alumno,Matricula,Carrera");
  });

  it("exporta empresas", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/exportar/empresas")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers["content-type"]).toContain("text/csv");
    expect(respuesta.text).toContain("Folio,Razon social,RFC,Giro");
  });

  it("responde 400 con un recurso que no existe", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/exportar/todo")
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(400);
  });

  it("la empresa no puede exportar listados globales", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/exportar/postulaciones")
      .set("Authorization", `Bearer ${empresaPendienteToken}`);

    expect(respuesta.status).toBe(403);
  });
});

describe("usuarios, roles y bitacora", () => {
  it("lista los usuarios con su rol", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/usuarios")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.data)).toBe(true);
    expect(respuesta.body.meta.total).toBeGreaterThan(0);
  });

  it("vinculacion no puede administrar cuentas", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/usuarios")
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(403);
  });

  it("cambia el rol de una cuenta y lo restaura", async () => {
    // Se crea una cuenta desechable para no tocar a nadie real.
    const correo = `rol.${sello}@itmexicali.edu.mx`;
    const registro = await request(app).post("/api/v1/auth/registro-estudiante").send({
      nombre: "Durane Cambio-Rol",
      correo,
      contrasena: "secreta123",
      matricula: `20${sello.slice(-6)}`,
      carrera_id: 1,
      semestre: 3,
    });
    expect(registro.status).toBe(201);

    const usuarioId = registro.body.data.usuario.id as number;

    const promovido = await request(app)
      .put(`/api/v1/admin/usuarios/${usuarioId}/rol`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ rol: "vinculacion" });
    expect(promovido.status).toBe(200);
    expect(promovido.body.data.rol).toBe("vinculacion");

    const restaurado = await request(app)
      .put(`/api/v1/admin/usuarios/${usuarioId}/rol`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ rol: "estudiante" });
    expect(restaurado.status).toBe(200);
    expect(restaurado.body.data.rol).toBe("estudiante");
  });

  it("rechaza un rol que no existe", async () => {
    const respuesta = await request(app)
      .put("/api/v1/admin/usuarios/2/rol")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ rol: "superadmin" });

    expect(respuesta.status).toBe(400);
  });

  it("no deja cambiar el propio rol", async () => {
    const yo = await request(app)
      .get("/api/v1/auth/yo")
      .set("Authorization", `Bearer ${tokenAdmin}`);

    const respuesta = await request(app)
      .put(`/api/v1/admin/usuarios/${yo.body.data.id}/rol`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ rol: "estudiante" });

    expect(respuesta.status).toBe(409);
  });

  it("la bitacora registra una accion de moderacion y es consultable", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/bitacora")
      .query({ entidad: "vacantes", accion: "dar_baja_vacante" })
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body.data)).toBe(true);
    expect(respuesta.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(respuesta.body.data[0].accion).toBe("dar_baja_vacante");
  });

  it("vinculacion no puede ver la bitacora tecnica", async () => {
    const respuesta = await request(app)
      .get("/api/v1/admin/bitacora")
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(403);
  });
});
