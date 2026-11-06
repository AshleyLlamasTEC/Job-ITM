/**
 * Pruebas de la etapa E-2.
 *
 * Cubren el criterio de avance ("se puede publicar una vacante de prueba y
 * encontrarla desde el buscador") y los errores que exige la definicion de
 * terminado: transicion de estado invalida (409), falta de permiso (403),
 * validacion (422) y archivo con contenido incorrecto.
 *
 * Cada corrida usa un titulo distinto para no depender del estado previo de la
 * base de desarrollo.
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/bootstrap/app";
import { cerrarConexion } from "../src/support/database/connection";
import { hoyLocal, sumarDias } from "../src/support/fechas";

const app = crearAplicacion();
const marca = `prueba-${Date.now()}`;
const CIERRE = sumarDias(hoyLocal(), 60);

let tokenEmpresa = "";
let tokenVinculacion = "";
let tokenAlumno = "";
let vacanteId = 0;

async function entrar(correo: string): Promise<string> {
  const respuesta = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo, contrasena: "demo1234" });
  expect(respuesta.status).toBe(200);
  return respuesta.body.data.token as string;
}

function nuevaVacante(extra: Record<string, unknown> = {}) {
  return {
    titulo: `Desarrollador ${marca}`,
    descripcion: "Servicios REST en Node.js para el area de operaciones.",
    requisitos: "Ingenieria en Sistemas Computacionales, JavaScript y MySQL.",
    tipo: "planta",
    modalidad: "hibrida",
    ciudad: "Mexicali",
    salario_min: 12000,
    salario_max: 16000,
    mostrar_salario: true,
    fecha_cierre: CIERRE,
    carrera_id: 1,
    ...extra,
  };
}

beforeAll(async () => {
  [tokenEmpresa, tokenVinculacion, tokenAlumno] = await Promise.all([
    entrar("empresa@demo.com"),
    entrar("vinculacion@itmexicali.edu.mx"),
    entrar("alumno@itmexicali.edu.mx"),
  ]);
});

afterAll(async () => {
  await cerrarConexion();
});

describe("alta de vacante", () => {
  it("crea la vacante en borrador", async () => {
    const respuesta = await request(app)
      .post("/api/v1/empresa/vacantes")
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send(nuevaVacante());

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.data.estado).toBe("borrador");
    vacanteId = respuesta.body.data.id;
  });

  it("rechaza una fecha de cierre que ya paso", async () => {
    const respuesta = await request(app)
      .post("/api/v1/empresa/vacantes")
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send(nuevaVacante({ fecha_cierre: "2020-01-01" }));

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errors.fecha_cierre).toBeTruthy();
  });

  it("no deja que un estudiante cree vacantes", async () => {
    const respuesta = await request(app)
      .post("/api/v1/empresa/vacantes")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send(nuevaVacante());

    expect(respuesta.status).toBe(403);
  });
});

describe("maquina de estados", () => {
  it("envia a revision", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/empresa/vacantes/${vacanteId}/enviar`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.estado).toBe("en_revision");
  });

  it("no permite editar una vacante en revision", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/empresa/vacantes/${vacanteId}`)
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send({ ciudad: "Tijuana" });

    expect(respuesta.status).toBe(409);
  });

  it("no permite aprobar sin el permiso de moderar", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/vacantes/${vacanteId}/aprobar`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(403);
  });

  it("publica la vacante al aprobarla", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/vacantes/${vacanteId}/aprobar`)
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.estado).toBe("publicada");
    expect(respuesta.body.data.fecha_publicacion).toBeTruthy();
  });

  it("no permite aprobar dos veces", async () => {
    const respuesta = await request(app)
      .post(`/api/v1/admin/vacantes/${vacanteId}/aprobar`)
      .set("Authorization", `Bearer ${tokenVinculacion}`);

    expect(respuesta.status).toBe(409);
  });
});

describe("buscador publico", () => {
  it("encuentra la vacante publicada", async () => {
    const respuesta = await request(app).get("/api/v1/vacantes").query({ q: marca });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data).toHaveLength(1);
    expect(respuesta.body.meta.total).toBe(1);
    expect(respuesta.body.data[0].empresa.nombre).toBe("Grupo Industrial del Valle");
    expect(respuesta.body.data[0].salario).toEqual({ min: 12000, max: 16000, mostrar: true });
  });

  it("devuelve lista vacia y total en cero cuando nada coincide", async () => {
    const respuesta = await request(app)
      .get("/api/v1/vacantes")
      .query({ q: marca, ciudad: "CiudadQueNoExiste" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data).toEqual([]);
    expect(respuesta.body.meta.total).toBe(0);
  });

  it("rechaza un orden que no existe", async () => {
    const respuesta = await request(app).get("/api/v1/vacantes").query({ orden: "caro" });
    expect(respuesta.status).toBe(400);
  });

  it("cuenta una sola vista por sesion", async () => {
    const primera = await request(app).get(`/api/v1/vacantes/${vacanteId}`);
    const segunda = await request(app).get(`/api/v1/vacantes/${vacanteId}`);

    expect(primera.status).toBe(200);
    expect(primera.body.data.descripcion).toBeTruthy();
    expect(segunda.body.data.vistas).toBe(primera.body.data.vistas);
  });

  it("oculta una vacante pausada", async () => {
    await request(app)
      .post(`/api/v1/empresa/vacantes/${vacanteId}/pausar`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    const respuesta = await request(app).get("/api/v1/vacantes").query({ q: marca });
    expect(respuesta.body.meta.total).toBe(0);

    await request(app)
      .post(`/api/v1/empresa/vacantes/${vacanteId}/reactivar`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);
  });
});

describe("perfil del estudiante", () => {
  it("actualiza los datos academicos", async () => {
    const respuesta = await request(app)
      .put("/api/v1/perfil")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ telefono: "6861112233", habilidades: "Node.js, MySQL" });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.telefono).toBe("6861112233");
    expect(respuesta.body.data.carrera).toContain("Sistemas");
  });

  it("rechaza un archivo que no es PDF", async () => {
    const respuesta = await request(app)
      .post("/api/v1/perfil/cv")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .attach("cv", Buffer.from("esto no es un pdf"), "curriculum.pdf");

    expect(respuesta.status).toBe(400);
  });

  it("acepta un PDF y entrega un enlace firmado que descarga el archivo", async () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

    const subida = await request(app)
      .post("/api/v1/perfil/cv")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .attach("cv", pdf, { filename: "curriculum.pdf", contentType: "application/pdf" });

    expect(subida.status).toBe(201);
    expect(subida.body.data.cv_ruta).toMatch(/^cv\/.+\.pdf$/);

    const enlace = await request(app)
      .get("/api/v1/perfil/cv")
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(enlace.status).toBe(200);

    const ruta = new URL(enlace.body.data.url);
    const descarga = await request(app).get(`${ruta.pathname}${ruta.search}`);
    expect(descarga.status).toBe(200);
    expect(descarga.headers["content-type"]).toContain("application/pdf");
  });

  it("rechaza un enlace con la firma alterada", async () => {
    const respuesta = await request(app).get("/api/v1/archivos/cv/1").query({
      expira: Math.floor(Date.now() / 1000) + 600,
      firma: "0000000000000000000000000000000000000000000000000000000000000000",
    });

    expect(respuesta.status).toBe(403);
  });
});
