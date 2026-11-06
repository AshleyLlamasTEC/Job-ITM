/**
 * Pruebas de la etapa E-4.
 *
 * Cubren el ciclo completo del negocio: el alumno se postula, la empresa mueve
 * la candidatura por sus etapas, y ambos ven lo que les corresponde (el alumno
 * nunca ve las notas privadas). Tambien los errores que exige la definicion de
 * terminado: duplicado (409), transicion invalida (409), falta de permiso (403),
 * recurso ajeno (404) y validacion (422).
 *
 * Cada corrida crea sus propias vacantes con un titulo distinto, de modo que no
 * depende del estado previo de la base de desarrollo. Antes de ejecutarlas:
 *
 *   npm run migrate:fresh && npm run seed && npm run seed:demo && npm test
 */
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/bootstrap/app";
import { db, cerrarConexion } from "../src/support/database/connection";
import { hoyLocal, sumarDias } from "../src/support/fechas";

const app = crearAplicacion();
const marca = `post-${Date.now()}`;
const CIERRE = sumarDias(hoyLocal(), 45);

let tokenEmpresa = "";
let tokenVinculacion = "";
let tokenAlumno = "";
let tokenSinCv = "";
let tokenSinVerificar = "";

let vacantePublicada = 0;
let vacanteBorrador = 0;
let vacanteSegunda = 0;

let postulacionId = 0;
let postulacionSegunda = 0;

async function entrar(correo: string): Promise<string> {
  const respuesta = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo, contrasena: "demo1234" });
  expect(respuesta.status).toBe(200);
  return respuesta.body.data.token as string;
}

function vacanteNueva(sufijo: string) {
  return {
    titulo: `Analista ${marca} ${sufijo}`,
    descripcion: "Analisis de datos para el area comercial.",
    requisitos: "Ingenieria en Sistemas, SQL y Python.",
    tipo: "planta",
    modalidad: "hibrida",
    ciudad: "Mexicali",
    salario_min: 14000,
    salario_max: 18000,
    mostrar_salario: true,
    fecha_cierre: CIERRE,
    carrera_id: 1,
  };
}

/** Crea una vacante, la envia a revision y la publica. Devuelve su id. */
async function publicarVacante(sufijo: string): Promise<number> {
  const alta = await request(app)
    .post("/api/v1/empresa/vacantes")
    .set("Authorization", `Bearer ${tokenEmpresa}`)
    .send(vacanteNueva(sufijo));
  expect(alta.status).toBe(201);

  const id = alta.body.data.id as number;

  const envio = await request(app)
    .post(`/api/v1/empresa/vacantes/${id}/enviar`)
    .set("Authorization", `Bearer ${tokenEmpresa}`);
  expect(envio.status).toBe(200);

  const aprobacion = await request(app)
    .post(`/api/v1/admin/vacantes/${id}/aprobar`)
    .set("Authorization", `Bearer ${tokenVinculacion}`);
  expect(aprobacion.status).toBe(200);
  expect(aprobacion.body.data.estado).toBe("publicada");

  return id;
}

/** Registra un alumno nuevo y devuelve su token. */
async function registrarAlumno(etiqueta: string): Promise<{ token: string; id: number }> {
  const sello = `post-${Date.now()}`;
  const respuesta = await request(app)
    .post("/api/v1/auth/registro-estudiante")
    .send({
      nombre: `Alumno ${etiqueta}`,
      correo: `${etiqueta}.${sello}@itmexicali.edu.mx`,
      contrasena: "secreta123",
      // Matricula de 10 digitos distinta en cada corrida y en cada alumno.
      matricula: `9${String(Date.now()).slice(-7)}${etiqueta === "sincv" ? "1" : "2"}`,
      carrera_id: 1,
      semestre: 5,
    });

  if (respuesta.status !== 201) {
    throw new Error(`registro ${etiqueta}: ${respuesta.status} ${JSON.stringify(respuesta.body)}`);
  }
  return { token: respuesta.body.data.token as string, id: respuesta.body.data.usuario.id as number };
}

beforeAll(async () => {
  [tokenEmpresa, tokenVinculacion, tokenAlumno] = await Promise.all([
    entrar("empresa@demo.com"),
    entrar("vinculacion@itmexicali.edu.mx"),
    entrar("alumno@itmexicali.edu.mx"),
  ]);

  // El alumno necesita curriculum para postularse (apartado 7.1).
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const subida = await request(app)
    .post("/api/v1/perfil/cv")
    .set("Authorization", `Bearer ${tokenAlumno}`)
    .attach("cv", pdf, { filename: "curriculum.pdf", contentType: "application/pdf" });
  expect(subida.status).toBe(201);

  // Alumno con el correo confirmado pero sin curriculum.
  const sinCv = await registrarAlumno("sincv");
  tokenSinCv = sinCv.token;
  await db("users").where({ id: sinCv.id }).update({ correo_verificado_en: new Date() });

  // Alumno recien registrado: el correo aun no esta confirmado.
  tokenSinVerificar = (await registrarAlumno("sinexperiencia")).token;

  vacantePublicada = await publicarVacante("principal");
  vacanteSegunda = await publicarVacante("segunda");

  const borrador = await request(app)
    .post("/api/v1/empresa/vacantes")
    .set("Authorization", `Bearer ${tokenEmpresa}`)
    .send(vacanteNueva("borrador"));
  expect(borrador.status).toBe(201);
  vacanteBorrador = borrador.body.data.id;
});

afterAll(async () => {
  await cerrarConexion();
});

describe("postularse", () => {
  it("registra la candidatura en estado recibida", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada, mensaje: "Me interesa el puesto." });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.data.estado).toBe("recibida");
    expect(respuesta.body.data.vacante.titulo).toContain(marca);
    expect(respuesta.body.data.linea_de_tiempo[0].estado).toBe("recibida");

    // 7.4: las notas de la empresa no salen en la respuesta del alumno.
    expect(JSON.stringify(respuesta.body.data)).not.toContain("notas_empresa");

    postulacionId = respuesta.body.data.id;
  });

  it("no permite postularse dos veces a la misma vacante", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada });

    // CA-06: duplicado = 422 con detalle por campo (tabla 29 del contrato).
    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errors.vacante_id).toBeTruthy();
    expect(respuesta.body.errors.vacante_id[0]).toContain("Ya tienes una candidatura");
  });

  it("no revela una vacante que sigue en borrador", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacanteBorrador });

    expect(respuesta.status).toBe(404);
  });

  it("exige el correo confirmado", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenSinVerificar}`)
      .send({ vacante_id: vacantePublicada });

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.message).toContain("Confirma tu correo");
  });

  it("exige curriculum cargado", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenSinCv}`)
      .send({ vacante_id: vacantePublicada });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toContain("curriculum");
  });

  it("valida que la vacante exista", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: 999999 });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errors.vacante_id).toBeTruthy();
  });

  it("registra una segunda candidatura en otra vacante", async () => {
    const respuesta = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacanteSegunda });

    expect(respuesta.status).toBe(201);
    postulacionSegunda = respuesta.body.data.id;
  });
});

describe("mis postulaciones", () => {
  it("lista el historial con el estado actual", async () => {
    const respuesta = await request(app)
      .get("/api/v1/mis-postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.meta.total).toBeGreaterThanOrEqual(2);

    const propia = respuesta.body.data.find((f: { id: number }) => f.id === postulacionId);
    expect(propia.estado).toBe("recibida");
    expect(propia.estado_etiqueta).toBe("Recibida");
    expect(propia.vacante.empresa).toBe("Grupo Industrial del Valle");
  });

  it("entrega el detalle con linea de tiempo y sin notas privadas", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/mis-postulaciones/${postulacionId}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.linea_de_tiempo.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(respuesta.body.data)).not.toContain("notas_empresa");
  });

  it("responde 404 si la candidatura es de otra persona", async () => {
    const otra = await request(app)
      .get(`/api/v1/mis-postulaciones/${postulacionSegunda}`)
      .set("Authorization", `Bearer ${tokenSinCv}`);

    expect(otra.status).toBe(404);
  });

  it("cancela una candidatura que aun no fue revisada", async () => {
    const borrado = await request(app)
      .delete(`/api/v1/mis-postulaciones/${postulacionId}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(borrado.status).toBe(204);

    const despues = await request(app)
      .get(`/api/v1/mis-postulaciones/${postulacionId}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(despues.status).toBe(404);
  });

  it("no deja cancelar una candidatura ya revisada", async () => {
    const avance = await request(app)
      .put(`/api/v1/empresa/candidatos/${postulacionSegunda}/estado`)
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send({ estado: "en_revision" });
    expect(avance.status).toBe(200);

    const respuesta = await request(app)
      .delete(`/api/v1/mis-postulaciones/${postulacionSegunda}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toContain("aun no fue revisada");
  });

  it("responde 404 al cancelar una candidatura ajena", async () => {
    const respuesta = await request(app)
      .delete(`/api/v1/mis-postulaciones/${postulacionSegunda}`)
      .set("Authorization", `Bearer ${tokenSinCv}`);

    expect(respuesta.status).toBe(404);
  });
});

describe("favoritos", () => {
  it("guarda una vacante con su salario", async () => {
    const respuesta = await request(app)
      .post("/api/v1/favoritos")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.data.vacante.titulo).toContain(marca);
    expect(respuesta.body.data.vacante.salario).toEqual({ min: 14000, max: 18000, mostrar: true });
  });

  it("es idempotente: guardar dos veces no duplica", async () => {
    const segunda = await request(app)
      .post("/api/v1/favoritos")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada });
    expect(segunda.status).toBe(201);

    const lista = await request(app)
      .get("/api/v1/favoritos")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(lista.status).toBe(200);
    const repetidas = lista.body.data.filter(
      (f: { vacante: { id: number } }) => f.vacante.id === vacantePublicada,
    );
    expect(repetidas).toHaveLength(1);
  });

  it("quita la vacante y avisa si ya no estaba", async () => {
    const primera = await request(app)
      .delete(`/api/v1/favoritos/${vacantePublicada}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(primera.status).toBe(204);

    const segunda = await request(app)
      .delete(`/api/v1/favoritos/${vacantePublicada}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);
    expect(segunda.status).toBe(404);
  });

  it("rechaza una vacante que no existe", async () => {
    const respuesta = await request(app)
      .post("/api/v1/favoritos")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: 999999 });

    expect(respuesta.status).toBe(422);
  });
});

describe("notificaciones", () => {
  it("avisa al alumno de su candidatura con el contador de no leidas", async () => {
    const respuesta = await request(app)
      .get("/api/v1/notificaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.meta.sin_leer).toBeGreaterThanOrEqual(1);

    const aviso = respuesta.body.data.find(
      (n: { tipo: string }) => n.tipo === "postulacion_enviada",
    );
    expect(aviso.titulo).toBe("Tu candidatura fue enviada");
    expect(aviso.leida).toBe(false);
  });

  it("marca un aviso como leido y baja el contador", async () => {
    const lista = await request(app)
      .get("/api/v1/notificaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`);
    const pendiente = lista.body.data.find((n: { leida: boolean }) => !n.leida);

    const respuesta = await request(app)
      .put(`/api/v1/notificaciones/${pendiente.id}/leida`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.leida).toBe(true);
    expect(respuesta.body.data.sin_leer).toBe(lista.body.meta.sin_leer - 1);
  });

  it("no deja marcar el aviso de otra cuenta", async () => {
    const ajenas = await request(app)
      .get("/api/v1/notificaciones")
      .set("Authorization", `Bearer ${tokenEmpresa}`);
    expect(ajenas.body.data.length).toBeGreaterThanOrEqual(1);

    const respuesta = await request(app)
      .put(`/api/v1/notificaciones/${ajenas.body.data[0].id}/leida`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(404);
  });
});

describe("reportes ciudadanos", () => {
  it("registra el reporte de una vacante", async () => {
    const respuesta = await request(app)
      .post("/api/v1/reportes")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada, motivo: "datos_de_contacto", detalle: "El correo rebota." });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.data.estado).toBe("nuevo");
    expect(respuesta.body.data.motivo_etiqueta).toBe("Datos de contacto sospechosos");
  });

  it("no acumula dos reportes abiertos de la misma vacante", async () => {
    const respuesta = await request(app)
      .post("/api/v1/reportes")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada, motivo: "otro" });

    expect(respuesta.status).toBe(409);
  });

  it("rechaza un motivo que no esta en el catalogo", async () => {
    const respuesta = await request(app)
      .post("/api/v1/reportes")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacantePublicada, motivo: "porque-si" });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errors.motivo).toBeTruthy();
  });
});

describe("candidatos en la empresa", () => {
  it("lista los candidatos de una vacante propia", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/empresa/vacantes/${vacanteSegunda}/candidatos`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data).toHaveLength(1);

    const candidato = respuesta.body.data[0];
    expect(candidato.alumno).toBeTruthy();
    expect(candidato.matricula).toBeTruthy();
    expect(candidato.estado).toBe("en_revision");
    expect(candidato.postulado_en).toBeTruthy();
  });

  it("filtra por estado", async () => {
    const conResultado = await request(app)
      .get(`/api/v1/empresa/vacantes/${vacanteSegunda}/candidatos`)
      .query({ estado: "en_revision" })
      .set("Authorization", `Bearer ${tokenEmpresa}`);
    expect(conResultado.body.data).toHaveLength(1);

    const sinResultado = await request(app)
      .get(`/api/v1/empresa/vacantes/${vacanteSegunda}/candidatos`)
      .query({ estado: "contratado" })
      .set("Authorization", `Bearer ${tokenEmpresa}`);
    expect(sinResultado.body.data).toHaveLength(0);
  });

  it("rechaza un estado que no existe en el proceso", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/empresa/vacantes/${vacanteSegunda}/candidatos`)
      .query({ estado: "feliz" })
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(400);
  });

  it("abre el detalle con curriculum firmado y lo descarga", async () => {
    const detalle = await request(app)
      .get(`/api/v1/empresa/candidatos/${postulacionSegunda}`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(detalle.status).toBe(200);
    expect(detalle.body.data.alumno.nombre).toBeTruthy();
    expect(detalle.body.data.estado_final).toBe(false);
    expect(detalle.body.data.curriculum.url).toContain("/archivos/postulacion/");

    const ruta = new URL(detalle.body.data.curriculum.url);
    const descarga = await request(app).get(`${ruta.pathname}${ruta.search}`);

    expect(descarga.status).toBe(200);
    expect(descarga.headers["content-type"]).toContain("application/pdf");
  });

  it("rechaza un enlace con la firma alterada", async () => {
    const detalle = await request(app)
      .get(`/api/v1/empresa/candidatos/${postulacionSegunda}`)
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    const ruta = new URL(detalle.body.data.curriculum.url);
    const respuesta = await request(app).get(ruta.pathname).query({
      expira: ruta.searchParams.get("expira"),
      firma: "0".repeat(64),
    });

    expect(respuesta.status).toBe(403);
  });

  it("no deja que un estudiante entre al panel de empresa", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/empresa/candidatos/${postulacionSegunda}`)
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body.message).toContain("postulaciones.gestionar");
  });

  it("responde 404 si la candidatura no es de una vacante propia", async () => {
    const respuesta = await request(app)
      .get("/api/v1/empresa/candidatos/999999")
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(404);
  });
});

describe("cambio de estado de la candidatura", () => {
  it("avanza por las etapas del proceso", async () => {
    for (const estado of ["contactado", "entrevista"]) {
      const respuesta = await request(app)
        .put(`/api/v1/empresa/candidatos/${postulacionSegunda}/estado`)
        .set("Authorization", `Bearer ${tokenEmpresa}`)
        .send({ estado });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.data.estado).toBe(estado);
      expect(respuesta.body.data.fecha_estado).toBeTruthy();
    }
  });

  it("no permite retroceder de etapa", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/empresa/candidatos/${postulacionSegunda}/estado`)
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send({ estado: "en_revision" });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toContain("solo avanza");
  });

  it("rechaza un estado fuera del catalogo", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/empresa/candidatos/${postulacionSegunda}/estado`)
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send({ estado: "feliz" });

    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errors.estado).toBeTruthy();
  });

  it("contrata, guarda las notas privadas y propone cerrar la vacante", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/empresa/candidatos/${postulacionSegunda}/estado`)
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send({ estado: "contratado", notas_empresa: "Inicia el 1 de diciembre." });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.data.estado).toBe("contratado");
    expect(respuesta.body.data.estado_final).toBe(true);
    expect(respuesta.body.data.notas_empresa).toBe("Inicia el 1 de diciembre.");
    expect(respuesta.body.data.sugerencia.cerrar_vacante).toBe(true);
    expect(respuesta.body.data.linea_de_tiempo.map((e: { estado: string }) => e.estado)).toEqual([
      "recibida",
      "en_revision",
      "contactado",
      "entrevista",
      "contratado",
    ]);
  });

  it("no mueve una candidatura que ya termino", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/empresa/candidatos/${postulacionSegunda}/estado`)
      .set("Authorization", `Bearer ${tokenEmpresa}`)
      .send({ estado: "rechazado" });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toContain("no admite mas cambios");
  });

  it("avisa al alumno del cambio de estado", async () => {
    const respuesta = await request(app)
      .get("/api/v1/notificaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`);

    const aviso = respuesta.body.data.find(
      (n: { tipo: string }) => n.tipo === "postulacion_contratado",
    );
    expect(aviso).toBeTruthy();
    expect(aviso.titulo).toBe("Tu candidatura paso a Contratado");
  });
});

describe("exportacion de candidatos", () => {
  it("genera un CSV con encabezado, acentos y fechas del calendario", async () => {
    const respuesta = await request(app)
      .get("/api/v1/empresa/exportar/candidatos")
      .query({ vacante_id: vacanteSegunda })
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers["content-type"]).toContain("text/csv");
    expect(respuesta.headers["content-disposition"]).toContain("attachment");

    const texto = respuesta.text;
    expect(texto.startsWith("\uFEFF")).toBe(true);
    expect(texto).toContain("Folio,Alumno,Matricula,Carrera,Correo,Telefono,Estado");
    expect(texto).toContain("Contratado");
    // La fecha del reporte es la del calendario, no la de UTC en ISO.
    expect(texto).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(texto).not.toContain("Tue Nov");
  });

  it("exige indicar la vacante", async () => {
    const respuesta = await request(app)
      .get("/api/v1/empresa/exportar/candidatos")
      .set("Authorization", `Bearer ${tokenEmpresa}`);

    expect(respuesta.status).toBe(400);
  });

  it("no deja exportar a un estudiante", async () => {
    const respuesta = await request(app)
      .get("/api/v1/empresa/exportar/candidatos")
      .query({ vacante_id: vacanteSegunda })
      .set("Authorization", `Bearer ${tokenAlumno}`);

    expect(respuesta.status).toBe(403);
  });
});
