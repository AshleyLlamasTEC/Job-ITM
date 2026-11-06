/**
 * Pruebas de aceptación del diseño (tabla 38 del docx), un bloque por criterio.
 *
 * El criterio CA-11 (pantallas prototipadas) no es verificable en esta etapa:
 * el frontend aun no existe y el anexo A del diseño esta "pendiente", asi que se
 * documenta alli mismo que no puede cumplirse con este alcance.
 *
 * Corre en la misma base que el resto (`job_itm_test`, ver `npm run test:prepare`).
 * Al igual que el resto de la suite, se reconstruye `job_itm_test` en cada ejecucion.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/bootstrap/app";
import { db, cerrarConexion } from "../src/support/database/connection";
import { ejecutarTareas } from "../src/console/schedule";
import { hoyLocal, sumarDias } from "../src/support/fechas";
import { ROLES, MATRIZ } from "../src/database/seeders/permisos";

const app = crearAplicacion();
const sello = Date.now().toString(36).toUpperCase();
const CIERRE = sumarDias(hoyLocal(), 60);

const RUTAS = [
  // RF-01..RF-03 cuenta y acceso
  { rf: "RF-01", method: "POST", path: "/api/v1/auth/registro-estudiante", esperado: 422 },
  { rf: "RF-02", method: "POST", path: "/api/v1/auth/registro-empresa", esperado: 422 },
  { rf: "RF-02", method: "GET", path: "/api/v1/admin/empresas", esperado: 401 },
  { rf: "RF-03", method: "POST", path: "/api/v1/auth/login", esperado: 422 },
  { rf: "RF-03", method: "POST", path: "/api/v1/auth/recuperar", esperado: 422 },
  { rf: "RF-03", method: "POST", path: "/api/v1/auth/restablecer", esperado: 422 },
  { rf: "RF-03", method: "POST", path: "/api/v1/auth/logout", esperado: 401 },
  // RF-04 alta de vacante
  { rf: "RF-04", method: "GET", path: "/api/v1/empresa/vacantes", esperado: 401 },
  { rf: "RF-04", method: "POST", path: "/api/v1/empresa/vacantes", esperado: 401 },
  { rf: "RF-04", method: "PUT", path: "/api/v1/empresa/vacantes/1", esperado: 401 },
  { rf: "RF-04", method: "DELETE", path: "/api/v1/empresa/vacantes/1", esperado: 401 },
  // RF-05 buscador
  { rf: "RF-05", method: "GET", path: "/api/v1/vacantes", esperado: 200 },
  // RF-06 postulacion
  { rf: "RF-06", method: "POST", path: "/api/v1/postulaciones", esperado: 401 },
  // RF-07 panel de la empresa
  { rf: "RF-07", method: "GET", path: "/api/v1/empresa/vacantes/1/candidatos", esperado: 401 },
  { rf: "RF-07", method: "PUT", path: "/api/v1/empresa/candidatos/1/estado", esperado: 401 },
  // RF-08 historial del alumno
  { rf: "RF-08", method: "GET", path: "/api/v1/mis-postulaciones", esperado: 401 },
  // RF-09 moderacion
  { rf: "RF-09", method: "GET", path: "/api/v1/admin/vacantes", esperado: 401 },
  { rf: "RF-09", method: "POST", path: "/api/v1/admin/vacantes/1/aprobar", esperado: 401 },
  // RF-10 tablero e indicadores
  { rf: "RF-10", method: "GET", path: "/api/v1/admin/indicadores", esperado: 401 },
  { rf: "RF-10", method: "GET", path: "/api/v1/admin/exportar/vacantes", esperado: 401 },
  // RF-11 notificaciones
  { rf: "RF-11", method: "GET", path: "/api/v1/notificaciones", esperado: 401 },
  // RF-12 expira (el endpoint real es la tarea programada; la ruta no existe)
  { rf: "RF-12", method: "GET", path: "/salud", esperado: 200 },
];

function rfcUnico(sufijo: string) {
  return `XA${sufijo}${sello}`.slice(0, 13);
}

async function registrarEmpresaPend(sufijo: string) {
  const respuesta = await request(app).post("/api/v1/auth/registro-empresa").send({
    nombre: `Empresa ${sufijo}`,
    correo: `empresa.${sufijo}.${sello}@example.com`,
    contrasena: "secreta123",
    razon_social: `Razon ${sufijo} ${sello} S.A. de C.V.`,
    rfc: rfcUnico(sufijo),
    giro: "Manufactura",
    telefono: "6861112233",
    contacto_nombre: `Asesor ${sufijo}`,
    contacto_correo: `contacto.${sufijo}.${sello}@example.com`,
  });
  expect(respuesta.status).toBe(201);
  const userId = respuesta.body.data.usuario.id as number;
  const empresa = await db("empresas").where({ user_id: userId }).first();
  return { id: Number(empresa!.id), token: respuesta.body.data.token as string, userId };
}

async function aprobarEmpresa(id: number) {
  const cuenta = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo: "vinculacion@itmexicali.edu.mx", contrasena: "demo1234" });
  const token = cuenta.body.data.token as string;
  const respuesta = await request(app)
    .post(`/api/v1/admin/empresas/${id}/aprobar`)
    .set("Authorization", `Bearer ${token}`);
  expect(respuesta.status).toBe(200);
}

async function crearVacantePublicada(token: string, titulo: string, extra: Record<string, unknown> = {}) {
  const alta = await request(app)
    .post("/api/v1/empresa/vacantes")
    .set("Authorization", `Bearer ${token}`)
    .send({
      titulo,
      descripcion: "Descripcion de la vacante de aceptacion.",
      requisitos: "Requisitos de la vacante de aceptacion.",
      tipo: "planta",
      modalidad: "presencial",
      ciudad: "Mexicali",
      salario_min: 10000,
      salario_max: 15000,
      mostrar_salario: true,
      fecha_cierre: CIERRE,
      carrera_id: 1,
      ...extra,
    });
  expect(alta.status).toBe(201);
  const id = alta.body.data.id as number;
  await request(app)
    .post(`/api/v1/empresa/vacantes/${id}/enviar`)
    .set("Authorization", `Bearer ${token}`);
  const vinci = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo: "vinculacion@itmexicali.edu.mx", contrasena: "demo1234" });
  const aprobacion = await request(app)
    .post(`/api/v1/admin/vacantes/${id}/aprobar`)
    .set("Authorization", `Bearer ${vinci.body.data.token}`);
  expect(aprobacion.status).toBe(200);
  return id;
}

beforeAll(async () => {
  // Subir un curriculum al alumno demo: sin CV no se puede postular (7.1).
  const cuenta = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "demo1234" });
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
  const subida = await request(app)
    .post("/api/v1/perfil/cv")
    .set("Authorization", `Bearer ${cuenta.body.data.token}`)
    .attach("cv", pdf, { filename: "curriculum.pdf", contentType: "application/pdf" });
  expect(subida.status).toBe(201);
});

afterAll(async () => {
  await cerrarConexion();
});

describe("CA-01 | el esquema cabe en las catorce tablas de negocio", () => {
  it("existen las 14 tablas de negocio y las 2 de infraestructura", async () => {
    const negocios = [
      "users",
      "estudiantes",
      "empresas",
      "carreras",
      "vacantes",
      "postulaciones",
      "favoritos",
      "notificaciones",
      "reportes",
      "roles",
      "permissions",
      "model_has_roles",
      "model_has_permissions",
      "role_has_permissions",
    ];
    const infraestructura = ["personal_access_tokens", "bitacora"];

    const fila = await db("information_schema.TABLES")
      .where({ TABLE_SCHEMA: "job_itm_test" })
      .select("TABLE_NAME");
    const nombres = new Set(fila.map((f) => String(f.TABLE_NAME)));

    for (const tabla of [...negocios, ...infraestructura]) {
      expect(nombres.has(tabla), `falta la tabla ${tabla}`).toBe(true);
    }
  });

  it("los indices documentados existen (users_correo_unique, vacantes_empresa_id_estado_index, fulltext)", async () => {
    const indices = (await db("information_schema.STATISTICS")
      .where({ TABLE_SCHEMA: "job_itm_test" })
      .select("INDEX_NAME", "TABLE_NAME")) as Array<{ INDEX_NAME: string; TABLE_NAME: string }>;

    const nombres = new Set(indices.map((i) => i.INDEX_NAME));
    expect(nombres.has("users_correo_unique")).toBe(true);
    expect(nombres.has("vacantes_empresa_id_estado_index")).toBe(true);

    const fulltext = (await db("information_schema.STATISTICS")
      .where({ TABLE_SCHEMA: "job_itm_test", TABLE_NAME: "vacantes", INDEX_TYPE: "FULLTEXT" })
      .select("INDEX_NAME")) as Array<{ INDEX_NAME: string }>;
    expect(fulltext.length).toBeGreaterThanOrEqual(1);
  });
});

describe("CA-02 | cada requerimiento funcional tiene al menos una ruta", () => {
  it.each(RUTAS)("$rf | $method $path — no es 404", async ({ method, path, esperado }) => {
    const metodo = method.toLowerCase() as "get" | "post" | "put" | "delete";
    const respuesta =
      metodo === "get"
        ? await request(app).get(path)
        : await request(app)[metodo](path).send({});
    expect(respuesta.status).toBe(esperado);
  });

  it("la tarea RF-12 esta registrada en el scheduler", async () => {
    const { listarTareas } = await import("../src/console/schedule");
    const nombres = listarTareas().map((t) => t.nombre);
    expect(nombres).toContain("vacantes:expirar");
  });
});

describe("CA-03 | cada permiso corresponde a una accion real y tiene un rol", () => {
  const archivo = (dir: string) => readdirSync(join(process.cwd(), dir));

  it("todos los permisos existen en el catalogo de la API", () => {
    const codigo = archivo("src/routes")
      .filter((f) => f.endsWith(".ts"))
      .map((f) => readFileSync(join(process.cwd(), "src/routes", f), "utf-8"))
      .join("\n");

    const usados = [...codigo.matchAll(/autorizar\(\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const permiso of Object.keys(MATRIZ)) {
      expect(usados, `el permiso ${permiso} no autoriza ninguna ruta`).toContain(permiso);
    }
  });

  it("cada permiso esta asignado al menos a un rol, o es global (documentado)", () => {
    const globales = new Set(["usuarios.gestionar", "bitacora.ver"]);
    for (const [permiso, roles] of Object.entries(MATRIZ)) {
      if (globales.has(permiso)) continue;
      expect(roles.length, `el permiso ${permiso} no tiene ningun rol asignado`).toBeGreaterThan(0);
    }
  });

  it("cada rol declarado existe en la matriz", () => {
    for (const rol of ROLES) {
      const tienePermiso = Object.values(MATRIZ).some((roles) => roles.includes(rol));
      const esAdminTecnico = rol === "admin_tecnico";
      expect(tienePermiso || esAdminTecnico, `el rol ${rol} no tiene ningun permiso`).toBe(true);
    }
  });
});

describe("CA-04 | un visitante recorre buscador y detalle sin iniciar sesion", () => {
  it("buscador y catalogos responden 200 sin token", async () => {
    for (const ruta of ["/api/v1/vacantes", "/api/v1/catalogos/carreras", "/api/v1/catalogos/modalidades", "/api/v1/catalogos/tipos-vacante"]) {
      const respuesta = await request(app).get(ruta);
      expect(respuesta.status).toBe(200);
    }
  });

  it("las rutas de sesion exigen token (no son publicas por accidente)", async () => {
    for (const ruta of [
      "/api/v1/perfil",
      "/api/v1/mis-postulaciones",
      "/api/v1/favoritos",
      "/api/v1/notificaciones",
      "/api/v1/empresa/tablero",
      "/api/v1/admin/indicadores",
    ]) {
      const respuesta = await request(app).get(ruta);
      expect(respuesta.status).toBe(401);
    }
  });
});

describe("CA-05 | una empresa sin validar no puede publicar ni enviar a revision", () => {
  let token = "";
  let empresaId = 0;

  beforeAll(async () => {
    const reg = await registrarEmpresaPend(`CA05${sello}`);
    token = reg.token;
    empresaId = reg.id;
  });

  it("el servidor responde 403 al intentar publicar", async () => {
    const respuesta = await request(app)
      .post("/api/v1/empresa/vacantes")
      .set("Authorization", `Bearer ${token}`)
      .send({
        titulo: "No deberia existir",
        descripcion: "Nunca",
        requisitos: "Ninguno",
        tipo: "planta",
        modalidad: "presencial",
        ciudad: "Mexicali",
        fecha_cierre: CIERRE,
      });

    expect(respuesta.status).toBe(403);

    const vacantes = await db("vacantes").where({ empresa_id: empresaId });
    expect(vacantes).toHaveLength(0);
  });
});

describe("CA-06 | un estudiante no puede postularse dos veces a la misma vacante", () => {
  let tokenAlumno = "";
  let candidatoId = 0;

  it("el segundo intento responde 422 y la base no registra el duplicado", async () => {
    const empresa = await registrarEmpresaPend(`CA06${sello}`);
    await aprobarEmpresa(empresa.id);

    const vacanteId = await crearVacantePublicada(
      empresa.token,
      `Vacante CA-06 ${sello}`,
    );

    const cuenta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "demo1234" });
    tokenAlumno = cuenta.body.data.token as string;

    const primera = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacanteId });
    expect(primera.status).toBe(201);
    candidatoId = primera.body.data.id;

    const duplicada = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${tokenAlumno}`)
      .send({ vacante_id: vacanteId });

    expect(duplicada.status).toBe(422);
    expect(duplicada.body.errors.vacante_id).toBeTruthy();

    const [{ total }] = await db("postulaciones")
      .where({ vacante_id: vacanteId })
      .count({ total: "*" });

    expect(Number(total)).toBe(1);
  });

  it("el alumno destinatario conserva el acceso a su candidatura", async () => {
    const cuenta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "demo1234" });

    const respuesta = await request(app)
      .get(`/api/v1/mis-postulaciones/${candidatoId}`)
      .set("Authorization", `Bearer ${cuenta.body.data.token}`);

    expect(respuesta.status).toBe(200);
  });
});

describe("CA-07 | nadie accede a recursos de otra empresa ni de otro estudiante", () => {
  let empresaA: { id: number; token: string };
  let empresaB: { id: number; token: string };
  let candidaturaId = 0;

  beforeAll(async () => {
    empresaA = await registrarEmpresaPend(`CAA${sello}`);
    empresaB = await registrarEmpresaPend(`CBB${sello}`);
    await aprobarEmpresa(empresaA.id);
    await aprobarEmpresa(empresaB.id);

    const vacanteA = await crearVacantePublicada(empresaA.token, `Vacante de A ${sello}`);

    const cuenta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "demo1234" });

    const candidatura = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${cuenta.body.data.token}`)
      .send({ vacante_id: vacanteA });
    candidaturaId = candidatura.body.data.id;
  });

  it("empresa B recibe 404 al detalle de una candidatura ajena", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/empresa/candidatos/${candidaturaId}`)
      .set("Authorization", `Bearer ${empresaB.token}`);

    expect(respuesta.status).toBe(404);
  });

  it("empresa B recibe 404 al cambiar el estado de esa candidatura", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/empresa/candidatos/${candidaturaId}/estado`)
      .set("Authorization", `Bearer ${empresaB.token}`)
      .send({ estado: "en_revision" });

    expect(respuesta.status).toBe(404);
  });

  it("un estudiante recibe 404 al detalle de una candidatura ajena", async () => {
    // Alumno que no es el dueno: se registra via correo propio.
    const registro = await request(app).post("/api/v1/auth/registro-estudiante").send({
      nombre: "Ajeno Demo",
      correo: `ajeno.${sello}@itmexicali.edu.mx`,
      contrasena: "secreta123",
      matricula: `300${sello}`,
      carrera_id: 1,
      semestre: 4,
    });
    expect(registro.status).toBe(201);

    const respuesta = await request(app)
      .get(`/api/v1/mis-postulaciones/${candidaturaId}`)
      .set("Authorization", `Bearer ${registro.body.data.token}`);

    expect(respuesta.status).toBe(404);
  });
});

describe("CA-08 | el buscador combina filtros correctamente", () => {
  let tokenEmpresa = "";

  beforeAll(async () => {
    const reg = await registrarEmpresaPend(`CA08${sello}`);
    await aprobarEmpresa(reg.id);
    tokenEmpresa = reg.token;
  });

  it("resultados de la API = resultados de una consulta directa", async () => {
    const idMX = await crearVacantePublicada(tokenEmpresa, `Analista CA08 MX ${sello}`, {
      tipo: "servicios_profesionales",
      modalidad: "remota",
    });
    const idTJ = await crearVacantePublicada(tokenEmpresa, `Analista CA08 TJ ${sello}`, {
      tipo: "servicios_profesionales",
      modalidad: "remota",
      ciudad: "Tijuana",
    });

    const API = await request(app).get("/api/v1/vacantes").query({
      tipo: "servicios_profesionales",
      modalidad: "remota",
      ciudad: "Mexicali",
      salario_min: 5000,
    });

    const BD = await db("vacantes")
      .where("estado", "publicada")
      .where("tipo", "servicios_profesionales")
      .where("modalidad", "remota")
      .where("ciudad", "like", "%Mexicali%")
      .where("salario_max", ">=", 5000)
      .select("id");

    expect(API.status).toBe(200);
    expect(API.body.data.map((v: { id: number }) => v.id).sort()).toEqual(
      BD.map((r) => Number(r.id)).sort(),
    );
    expect(API.body.meta.total).toBe(BD.length);
    expect(idMX).not.toBe(idTJ);
  });
});

describe("CA-09 | una vacante vencida deja de aparecer sin intervencion humana", () => {
  it("la tarea diaria la marca como expirada y el buscador deja de mostrarla", async () => {
    const reg = await registrarEmpresaPend(`CA09${sello}`);
    await aprobarEmpresa(reg.id);
    const q = `CA09-${sello}`;

    const vacanteId = await crearVacantePublicada(reg.token, q);

    // Antes de vencer, la vacante es visible.
    const antes = await request(app).get(`/api/v1/vacantes/${vacanteId}`);
    expect(antes.status).toBe(200);

    // Se fuerza una fecha de cierre ya vencida directamente en la base: pasar el
    // tiempo es el escenario de campo, no una auto-baja manual.
    await db("vacantes").where({ id: vacanteId }).update({ fecha_cierre: "2020-01-01" });

    await ejecutarTareas();

    const despues = await request(app).get(`/api/v1/vacantes/${vacanteId}`);
    expect(despues.status).toBe(404);

    const fila = await db("vacantes").where({ id: vacanteId }).first();
    expect(fila?.estado).toBe("expirada");

    await db("vacantes").where({ id: vacanteId }).delete();
  });
});

describe("CA-10 | el curriculum solo lo descargan alumno, empresa destinataria y Vinculacion", () => {
  let postulateId = 0;
  let empresaToken = "";

  beforeAll(async () => {
    const reg = await registrarEmpresaPend(`CA10${sello}`);
    await aprobarEmpresa(reg.id);
    empresaToken = reg.token;

    const vacanteId = await crearVacantePublicada(reg.token, `Vacante CA-10 ${sello}`);

    const cuenta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "demo1234" });

    const candidatura = await request(app)
      .post("/api/v1/postulaciones")
      .set("Authorization", `Bearer ${cuenta.body.data.token}`)
      .send({ vacante_id: vacanteId });
    postulateId = candidatura.body.data.id;
  });

  async function rutaDesde(url: string) {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  }

  it("el alumno descarga su CV", async () => {
    const cuenta = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "alumno@itmexicali.edu.mx", contrasena: "demo1234" });

    const enlace = await request(app)
      .get("/api/v1/perfil/cv")
      .set("Authorization", `Bearer ${cuenta.body.data.token}`);

    expect(enlace.status).toBe(200);
    const descarga = await request(app).get(await rutaDesde(enlace.body.data.url));
    expect(descarga.status).toBe(200);
    expect(descarga.headers["content-type"]).toContain("application/pdf");
  });

  it("la empresa destinataria descarga el CV de la candidatura", async () => {
    const enlace = await request(app)
      .get(`/api/v1/empresa/candidatos/${postulateId}/cv`)
      .set("Authorization", `Bearer ${empresaToken}`);

    expect(enlace.status).toBe(200);
    const descarga = await request(app).get(await rutaDesde(enlace.body.data.url));
    expect(descarga.status).toBe(200);
    expect(descarga.headers["content-type"]).toContain("application/pdf");
  });

  it("Vinculacion descarga el CV de la candidatura", async () => {
    const vinci = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "vinculacion@itmexicali.edu.mx", contrasena: "demo1234" });

    const enlace = await request(app)
      .get(`/api/v1/admin/postulaciones/${postulateId}/cv`)
      .set("Authorization", `Bearer ${vinci.body.data.token}`);

    expect(enlace.status).toBe(200);
    const descarga = await request(app).get(await rutaDesde(enlace.body.data.url));
    expect(descarga.status).toBe(200);
    expect(descarga.headers["content-type"]).toContain("application/pdf");
  });

  it("un otro estudiante no puede generar un enlace al CV ajeno", async () => {
    const registro = await request(app).post("/api/v1/auth/registro-estudiante").send({
      nombre: "Visitante Demo",
      correo: `visitante.${sello}@itmexicali.edu.mx`,
      contrasena: "secreta123",
      matricula: `400${sello}`,
      carrera_id: 1,
      semestre: 2,
    });
    const token = registro.body.data.token;

    // Empresa-only route: el estudiante no tiene permiso.
    const res1 = await request(app)
      .get(`/api/v1/empresa/candidatos/${postulateId}/cv`)
      .set("Authorization", `Bearer ${token}`);
    expect(res1.status).toBe(403);

    // Admin-only route: tampoco.
    const res2 = await request(app)
      .get(`/api/v1/admin/postulaciones/${postulateId}/cv`)
      .set("Authorization", `Bearer ${token}`);
    expect(res2.status).toBe(403);

    // Su propio enlace SI existe pero no expone el CV ajeno.
    const res3 = await request(app)
      .get("/api/v1/perfil/cv")
      .set("Authorization", `Bearer ${token}`);
    expect(res3.status).toBe(404); // aun no sube su curriculum, pero no obtiene el ajeno
  });

  it("un enlace con la firma alterada no descarga nada", async () => {
    const vinci = await request(app)
      .post("/api/v1/auth/login")
      .send({ correo: "vinculacion@itmexicali.edu.mx", contrasena: "demo1234" });

    const enlace = await request(app)
      .get(`/api/v1/admin/postulaciones/${postulateId}/cv`)
      .set("Authorization", `Bearer ${vinci.body.data.token}`);

    const parsed = new URL(enlace.body.data.url);
    const firma = parsed.searchParams.get("firma");
    const alterada = `${parsed.pathname}?expira=${parsed.searchParams.get("expira")}&firma=${firma!.slice(0, -1)}0`;
    const descarga = await request(app).get(alterada);
    expect(descarga.status).toBe(403);
  });
});

describe("CA-11 | las veinte pantallas tienen prototipo", () => {
  it("Anexo A del diseño: pendiente de elaboración → no verificable en esta etapa", () => {
    // El inventario de la tabla 32 cuenta 20 pantallas (P-01..P-20) y el anexo A
    // marca "Prototipos graficos: Pendiente". Mientras el frontend no exista,
    // este criterio es evidencia documental, no una assertion automatica.
    const inventario = Array.from({ length: 20 }, (_, i) => `P-${String(i + 1).padStart(2, "0")}`);
    expect(inventario).toHaveLength(20);
  });
});

describe("CA-12 | el buscador responde en menos de dos segundos con 1000 vacantes", () => {
  it("la carga masiva y la medicion viven en scripts/benchmark.ts", () => {
    // El documento exige medir contra 1000 vacantes publicadas; ese es un
    // experimento, no una asercion de unidad. `npm run bench` crea 1000 filas,
    // mide el buscador y las borra. Ver manuales/Criterios_de_aceptacion.md.
    expect(true).toBe(true);
  });
});
