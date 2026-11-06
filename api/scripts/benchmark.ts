/**
 * Bench de aceptacion (CA-12).
 *
 * Inserta 1000 vacantes publicadas en job_itm (la base de desarrollo, NO la
 * de pruebas), mide el tiempo de respuesta del buscador publico por HTTP y
 * luego borra todo lo que creo. Es idempotente y deseleccionable.
 *
 *   npm run bench
 *
 * Correla cuando no haya nada importante en tu entorno: durante el bench la
 * tabla de vacantes incluye 1000 filas sinteticas.
 */
process.env.DB_DATABASE = "job_itm";

const { db, cerrarConexion } = await import("../src/support/database/connection");
const { sumarDias, hoyLocal } = await import("../src/support/fechas");
const { crearAplicacion } = await import("../src/bootstrap/app");
const request = (await import("supertest")).default;

const app = crearAplicacion();
const TOTAL = 1000;
const RANGO = `bench-${Date.now().toString(36)}`;

interface Medicion {
  nombre: string;
  ruta: string;
  ms: number;
}

const mediciones: Medicion[] = [];

/** Empresa de respaldo: la aprobada del seeder o la primera aprobada. */
async function idEmpresaAprobada(): Promise<number> {
  const fila = await db("empresas").where({ estatus_validacion: "aprobada" }).orderBy("id").first();
  if (!fila) throw new Error("No hay empresa aprobada; corre el seeder demo primero.");
  return Number(fila.id);
}

async function medir(nombre: string, ruta: string): Promise<void> {
  const inicio = performance.now();
  for (let i = 0; i < 3; i += 1) {
    const respuesta = await request(app).get(ruta);
    if (respuesta.status >= 500) {
      throw new Error(`${ruta} respondio ${respuesta.status}`);
    }
  }
  const ms = (performance.now() - inicio) / 3;
  mediciones.push({ nombre, ruta, ms: Math.round(ms) });
}

async function insertarCarga(empresaId: number): Promise<number> {
  const filaCarrera = await db("carreras").orderBy("id").first();
  const carreraId = Number(filaCarrera?.id ?? 1);
  const cierre = sumarDias(hoyLocal(), 400);
  const filas: Record<string, unknown>[] = [];

  for (let i = 1; i <= TOTAL; i += 1) {
    const practicante = i % 2 === 0;
    filas.push({
      empresa_id: empresaId,
      carrera_id: carreraId,
      titulo: `${practicante ? "Practicante" : "Analista"} ${RANGO} ${String(i).padStart(4, "0")}`,
      descripcion:
        "Carga sintetica para el criterio de aceptacion CA-12. " +
        (practicante
          ? "Proyecto web con Node.js, TypeScript y MySQL en produccion."
          : "Analisis de datos, dashboards y reportes institucionales en Python."),
      requisitos: "Ingenieria en Sistemas Computacionales; sexto semestre o mas.",
      tipo: "planta",
      modalidad: "hibrida",
      ciudad: i % 3 === 0 ? "Tijuana" : "Mexicali",
      estado_geo: "Baja California",
      salario_min: 10000 + (i % 40) * 250,
      salario_max: 15000 + (i % 40) * 250,
      mostrar_salario: 1,
      fecha_cierre: cierre,
      estado: "publicada",
      fecha_publicacion: new Date(),
      vistas: 0,
      actualizado_en: new Date(),
      creado_en: new Date(),
    });
  }

  const tamano = 100;
  for (let i = 0; i < filas.length; i += tamano) {
    await db("vacantes").insert(filas.slice(i, i + tamano));
  }

  return filas.length;
}

async function borrarCarga(): Promise<number> {
  return db("vacantes").where("titulo", "like", `%${RANGO}%`).delete();
}

// ---------------------------------------------------------------------------

console.log(`bench | rango ${RANGO} | ${TOTAL} vacantes sinteticas`);

const empresaId = await idEmpresaAprobada();
const total = await insertarCarga(empresaId);
console.log(`bench | insertadas: ${total}`);

try {
  await medir("Buscador recientes (pagina 1 de 15)", `/api/v1/vacantes?orden=recientes&por_pagina=15`);
  await medir("Buscador fulltext (Practicante bench)", `/api/v1/vacantes?q=${encodeURIComponent(`Practicante ${RANGO}`)}&por_pagina=15`);
  await medir("Buscador + 4 filtros combinados", `/api/v1/vacantes?q=${encodeURIComponent(`Analista ${RANGO}`)}&modalidad=hibrida&ciudad=Mexicali&tipo=planta&salario_min=9000&por_pagina=15`);

  const tabla = mediciones
    .map((m) => `  ${m.nombre.padEnd(42)} ${String(m.ms).padStart(5)} ms`)
    .join("\n");
  console.log(`\nbench | tiempos promedio de tres corridas:\n${tabla}\n`);

  const maximo = Math.max(...mediciones.map((m) => m.ms));
  console.log(`bench | el buscador respondio en ${maximo} ms`);
  if (maximo >= 2000) {
    console.error("bench | FALLO: el buscador supera los 2 segundos (CA-12).");
    process.exitCode = 1;
  } else {
    console.log("bench | CA-12 cumplido en la maquina de desarrollo (nota: no es produccion).");
  }
} finally {
  const borradas = await borrarCarga();
  await cerrarConexion();
  console.log(`bench | vacantes sinteticas borradas: ${borradas}`);
}
