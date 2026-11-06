/**
 * Datos de demostracion.
 *
 * No forma parte de `npm run seed`: se ejecuta aparte con
 *
 *   npm run seed:demo
 *
 * y sirve para que el sistema no se vea vacio al probarlo. Crea alumnos con
 * curriculum, vacantes en los siete estados y candidaturas en todas las etapas,
 * de modo que se puedan ejercitar los filtros, la paginacion y las bandejas con
 * volumen realista.
 *
 * Todo se identifica por datos naturales (matricula, titulo de la vacante) y se
 * omite si ya existe, asi que se puede correr varias veces sin duplicar nada.
 *
 * Antes de publicar el sistema hay que borrar estos registros.
 */
import { db } from "../../support/database/connection";
import { Hash } from "../../support/auth/hash";
import { asignarRol } from "../../support/authorization/gate";
import { guardarArchivo, leerArchivo } from "../../support/storage/archivos";
import { sumarDias, hoyLocal } from "../../support/fechas";
import { Carrera } from "../../app/models/Carrera";
import { Estudiante } from "../../app/models/Estudiante";

const CONTRASENA = "demo1234";

// ---------------------------------------------------------------------------
// Alumnos
// ---------------------------------------------------------------------------

interface AlumnoDemo {
  nombre: string;
  correo: string;
  matricula: string;
  carrera: string;
  semestre: number | null;
  anio_egreso: number | null;
  telefono: string;
  habilidades: string;
}

const ALUMNOS: AlumnoDemo[] = [
  {
    nombre: "Ashley Llamas",
    correo: "ashley.llamas@itmexicali.edu.mx",
    matricula: "20400001",
    carrera: "ISC",
    semestre: 9,
    anio_egreso: null,
    telefono: "6861000001",
    habilidades: "Node.js, TypeScript, React, MySQL, Docker",
  },
  {
    nombre: "Brayan Cardenas",
    correo: "brayan.cardenas@itmexicali.edu.mx",
    matricula: "20400002",
    carrera: "IIND",
    semestre: 8,
    anio_egreso: null,
    telefono: "6861000002",
    habilidades: "Lean Manufacturing, Six Sigma, Excel avanzado, Power BI",
  },
  {
    nombre: "Carla Ruiz",
    correo: "carla.ruiz@itmexicali.edu.mx",
    matricula: "20400003",
    carrera: "IGEM",
    semestre: null,
    anio_egreso: 2025,
    telefono: "6861000003",
    habilidades: "Gestion de proyectos, Recursos Humanos, SAP, Ingles B2",
  },
  {
    nombre: "Diego Sanchez",
    correo: "diego.sanchez@itmexicali.edu.mx",
    matricula: "20400004",
    carrera: "IMEC",
    semestre: 7,
    anio_egreso: null,
    telefono: "6861000004",
    habilidades: "SolidWorks, AutoCAD, Mantenimiento industrial, CNC",
  },
  {
    nombre: "Elena Vargas",
    correo: "elena.vargas@itmexicali.edu.mx",
    matricula: "20400005",
    carrera: "ISC",
    semestre: 6,
    anio_egreso: null,
    telefono: "6861000005",
    habilidades: "Python, SQL, Machine Learning basico, Git",
  },
  {
    nombre: "Francisco Nunez",
    correo: "francisco.nunez@itmexicali.edu.mx",
    matricula: "20400006",
    carrera: "IELT",
    semestre: 9,
    anio_egreso: null,
    telefono: "6861000006",
    habilidades: "PLC, Electronica de potencia, MATLAB, IoT",
  },
];

/**
 * PDF minimo pero valido: un documento de una pagina con el nombre del alumno
 * escrito en el contenido. No se usa una libreria porque el unico requisito es
 * que empiece con %PDF- y que un lector lo abra.
 */
function pdfDeEjemplo(nombre: string, matricula: string): Buffer {
  const texto = `${nombre} - ${matricula}`;
  const contenido = [
    "%PDF-1.4",
    "1 0 obj",
    "<</Type /Catalog /Pages 2 0 R>>",
    "endobj",
    "2 0 obj",
    "<</Type /Pages /Kids [3 0 R] /Count 1>>",
    "endobj",
    "3 0 obj",
    "<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>",
    "endobj",
    "4 0 obj",
    `<</Length ${texto.length + 44}>>`,
    "stream",
    "BT /F1 14 Tf 72 720 Td (Curriculo de demostracion) Tj ET",
    "BT /F1 11 Tf 72 700 Td (" + texto + ") Tj ET",
    "endstream",
    "endobj",
    "5 0 obj",
    "<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>",
    "endobj",
    "trailer",
    "<</Root 1 0 R>>",
    "%%EOF",
    "",
  ].join("\n");

  return Buffer.from(contenido, "latin1");
}

async function asegurarAlumno(datos: AlumnoDemo): Promise<number | null> {
  const carrera = await Carrera.q().where({ clave: datos.carrera }).first();
  if (!carrera) {
    console.warn(`  alumno ${datos.matricula}: no existe la carrera ${datos.carrera}`);
    return null;
  }

  let user = await db("users").whereRaw("LOWER(correo) = ?", [datos.correo]).first();

  if (!user) {
    const [id] = await db("users").insert({
      nombre: datos.nombre,
      correo: datos.correo,
      contrasena: await Hash.hacer(CONTRASENA),
      correo_verificado_en: new Date(),
      estado: "activo",
    });
    user = { id };
    await asignarRol(Number(id), "estudiante");
  }

  const userId = Number(user.id);

  let perfil = await Estudiante.porUserId(userId);
  if (!perfil) {
    const cvRuta = await guardarArchivo("cv", pdfDeEjemplo(datos.nombre, datos.matricula), "pdf");
    const id = await Estudiante.crear({
      user_id: userId,
      matricula: datos.matricula,
      carrera_id: carrera.id,
      semestre: datos.semestre,
      anio_egreso: datos.anio_egreso,
      telefono: datos.telefono,
      habilidades: datos.habilidades,
      cv_ruta: cvRuta,
      cv_actualizado_en: new Date(),
    });
    perfil = await Estudiante.buscar(id);
  }

  return Number(perfil!.id);
}

// ---------------------------------------------------------------------------
// Vacantes
// ---------------------------------------------------------------------------

interface VacanteDemo {
  titulo: string;
  estado: string;
  tipo: string;
  modalidad: string;
  ciudad: string;
  carrera: string;
  salario_min: number | null;
  salario_max: number | null;
  mostrar_salario: boolean;
  cierreEnDias: number;
  descripcion: string;
  requisitos: string;
  motivo_rechazo?: string;
}

const VACANTES: VacanteDemo[] = [
  {
    titulo: "Desarrollador Full Stack",
    estado: "publicada",
    tipo: "planta",
    modalidad: "hibrida",
    ciudad: "Mexicali",
    carrera: "ISC",
    salario_min: 18000,
    salario_max: 26000,
    mostrar_salario: true,
    cierreEnDias: 45,
    descripcion:
      "Desarrollo de aplicaciones web con React y Node.js para el area de transformacion digital. Participaras en el diseno de APIs, la integracion con sistemas internos y la puesta en produccion.",
    requisitos:
      "Ingenieria en Sistemas Computacionales o afin, experiencia con JavaScript y bases de datos relacionales, ingles tecnico de lectura.",
  },
  {
    titulo: "Practicante de Recursos Humanos",
    estado: "publicada",
    tipo: "practicas",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "IGEM",
    salario_min: 4500,
    salario_max: 6000,
    mostrar_salario: true,
    cierreEnDias: 30,
    descripcion:
      "Apoyo en reclutamiento, integracion de expedientes y actividades de clima laboral. Horario compatible con el semestre.",
    requisitos: "Estudiante de Gestion Empresarial o Administracion, sexto semestre en adelante.",
  },
  {
    titulo: "Analista de datos junior",
    estado: "publicada",
    tipo: "servicios_profesionales",
    modalidad: "remota",
    ciudad: "Tijuana",
    carrera: "ISC",
    salario_min: 15000,
    salario_max: 20000,
    mostrar_salario: true,
    cierreEnDias: 20,
    descripcion:
      "Construccion de tableros y modelos de datos para el area comercial. Trabajo 100 por ciento remoto con equipo distribuido.",
    requisitos: "SQL, Python y nociones de visualizacion de datos.",
  },
  {
    titulo: "Ingeniero de mantenimiento",
    estado: "publicada",
    tipo: "planta",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "IMEC",
    salario_min: 22000,
    salario_max: 30000,
    mostrar_salario: true,
    cierreEnDias: 60,
    descripcion:
      "Planeacion del mantenimiento preventivo y correctivo de la linea de produccion. Coordinacion con proveedores y supervision de tecnicos.",
    requisitos: "Ingenieria Mecanica o Industrial, conocimiento de TPM y lectura de planos.",
  },
  {
    titulo: "Servicio social en vinculacion",
    estado: "publicada",
    tipo: "servicio_social",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "IGEM",
    salario_min: null,
    salario_max: null,
    mostrar_salario: false,
    cierreEnDias: 25,
    descripcion:
      "Apoyo en la gestion de convenios con empresas y seguimiento a egresados. Se otorga beca de transporte.",
    requisitos: "Estudiante activo con al menos 70 por ciento de creditos.",
  },
  {
    titulo: "Tecnico electronico de pruebas",
    estado: "publicada",
    tipo: "temporal",
    modalidad: "presencial",
    ciudad: "Tecate",
    carrera: "IELT",
    salario_min: 12000,
    salario_max: 14000,
    mostrar_salario: true,
    cierreEnDias: 15,
    descripcion:
      "Pruebas de tarjetas electronicas en linea de ensamble. Contrato por proyecto de seis meses.",
    requisitos: "Electronica, manejo de multimetro y osciloscopio.",
  },
  {
    titulo: "Coordinador de logistica",
    estado: "en_revision",
    tipo: "planta",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "ILOG",
    salario_min: 20000,
    salario_max: 25000,
    mostrar_salario: true,
    cierreEnDias: 40,
    descripcion:
      "Control de inventarios, rutas de distribucion y negociacion con transportistas.",
    requisitos: "Ingenieria en Logistica o Industrial, manejo de WMS.",
  },
  {
    titulo: "Asistente administrativo",
    estado: "borrador",
    tipo: "temporal",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "LA",
    salario_min: 9000,
    salario_max: 11000,
    mostrar_salario: true,
    cierreEnDias: 35,
    descripcion: "Apoyo en facturacion, archivo y atencion a proveedores.",
    requisitos: "Administracion, manejo de paqueteria de oficina.",
  },
  {
    titulo: "Practicante de automatizacion",
    estado: "rechazada",
    tipo: "practicas",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "IELT",
    salario_min: 4000,
    salario_max: 5000,
    mostrar_salario: true,
    cierreEnDias: 30,
    descripcion: "Apoyo en programacion de PLC y pruebas de tableros.",
    requisitos: "Estudiante de Electronica con conocimiento de PLC.",
    motivo_rechazo:
      "La descripcion no indica el horario ni las actividades concretas del practicante. Corrige y vuelve a enviar.",
  },
  {
    titulo: "Supervisor de produccion",
    estado: "pausada",
    tipo: "planta",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "IIND",
    salario_min: 24000,
    salario_max: 28000,
    mostrar_salario: true,
    cierreEnDias: 50,
    descripcion:
      "Supervision de turno, control de indicadores y seguimiento a metas de produccion.",
    requisitos: "Ingenieria Industrial, experiencia en piso de produccion.",
  },
  {
    titulo: "Becario de calidad",
    estado: "cerrada",
    tipo: "practicas",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "IIND",
    salario_min: 5000,
    salario_max: 5000,
    mostrar_salario: true,
    cierreEnDias: 10,
    descripcion: "Apoyo en auditorias internas y control de documentacion.",
    requisitos: "Ingenieria Industrial, conocimiento de ISO 9001.",
  },
  {
    titulo: "Auxiliar de sistemas",
    estado: "expirada",
    tipo: "temporal",
    modalidad: "presencial",
    ciudad: "Mexicali",
    carrera: "ISC",
    salario_min: 10000,
    salario_max: 12000,
    mostrar_salario: true,
    cierreEnDias: -5,
    descripcion: "Soporte tecnico a usuarios y mantenimiento de equipos.",
    requisitos: "Sistemas Computacionales, conocimiento de redes.",
  },
];

async function asegurarVacantes(empresaId: number): Promise<Map<string, number>> {
  const ids = new Map<string, number>();

  for (const datos of VACANTES) {
    const existente = await db("vacantes")
      .where({ empresa_id: empresaId, titulo: datos.titulo })
      .first();

    if (existente) {
      ids.set(datos.titulo, Number(existente.id));
      continue;
    }

    const carrera = await Carrera.q().where({ clave: datos.carrera }).first();
    const cierre = sumarDias(hoyLocal(), datos.cierreEnDias);

    const [id] = await db("vacantes").insert({
      empresa_id: empresaId,
      carrera_id: carrera ? carrera.id : null,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      requisitos: datos.requisitos,
      actividades: null,
      tipo: datos.tipo,
      modalidad: datos.modalidad,
      ciudad: datos.ciudad,
      estado_geo: "Baja California",
      salario_min: datos.salario_min,
      salario_max: datos.salario_max,
      mostrar_salario: datos.mostrar_salario ? 1 : 0,
      estado: datos.estado,
      motivo_rechazo: datos.motivo_rechazo ?? null,
      fecha_cierre: cierre,
      // Las publicadas necesitan fecha de publicacion para ordenar el buscador.
      fecha_publicacion: datos.estado === "publicada" ? new Date() : null,
      vistas: 0,
    });

    ids.set(datos.titulo, Number(id));
  }

  return ids;
}

// ---------------------------------------------------------------------------
// Candidaturas
// ---------------------------------------------------------------------------

/** [matricula, titulo de la vacante, estado] */
const POSTULACIONES: Array<[string, string, string]> = [
  ["20400001", "Desarrollador Full Stack", "entrevista"],
  ["20400005", "Desarrollador Full Stack", "en_revision"],
  ["20400006", "Tecnico electronico de pruebas", "contactado"],
  ["20400002", "Ingeniero de mantenimiento", "recibida"],
  ["20400004", "Ingeniero de mantenimiento", "rechazado"],
  ["20400003", "Practicante de Recursos Humanos", "contratado"],
  ["20400002", "Practicante de Recursos Humanos", "recibida"],
  ["20400003", "Servicio social en vinculacion", "en_revision"],
  ["20400005", "Analista de datos junior", "recibida"],
  ["20400001", "Analista de datos junior", "contactado"],
];

async function asegurarPostulaciones(
  vacantes: Map<string, number>,
): Promise<void> {
  for (const [matricula, titulo, estado] of POSTULACIONES) {
    const vacanteId = vacantes.get(titulo);
    if (!vacanteId) continue;

    const alumno = await db("estudiantes").where({ matricula }).first();
    if (!alumno) continue;

    const existente = await db("postulaciones")
      .where({ vacante_id: vacanteId, estudiante_id: alumno.id })
      .first();
    if (existente) continue;

    // Copia del curriculum, igual que hace el servicio al postularse.
    const origen = alumno.cv_ruta ? String(alumno.cv_ruta) : null;
    let cvCopia = origen;
    if (origen) {
      const contenido = await leerArchivo(origen);
      cvCopia = await guardarArchivo("postulaciones", contenido, "pdf");
    }
    if (!cvCopia) continue;

    await db("postulaciones").insert({
      vacante_id: vacanteId,
      estudiante_id: alumno.id,
      cv_ruta: cvCopia,
      mensaje: "Me interesa la vacante y cuento con la experiencia que solicitan.",
      estado,
      fecha_estado: new Date(),
    });
  }
}

// ---------------------------------------------------------------------------

export async function sembrarDemo(): Promise<void> {
  const empresa = await db("empresas").where({ estatus_validacion: "aprobada" }).first();
  if (!empresa) {
    throw new Error(
      "No hay una empresa aprobada. Corre primero `npm run seed` para crear las cuentas demo.",
    );
  }

  console.log("  [demo] alumnos con curriculum");
  for (const alumno of ALUMNOS) {
    const id = await asegurarAlumno(alumno);
    if (id) console.log(`    ${alumno.matricula}  ${alumno.nombre}`);
  }

  console.log("  [demo] vacantes en todos los estados");
  const vacantes = await asegurarVacantes(Number(empresa.id));

  console.log("  [demo] candidaturas");
  await asegurarPostulaciones(vacantes);

  const totalVacantes = await db("vacantes").count({ total: "*" }).first();
  const totalPostulaciones = await db("postulaciones").count({ total: "*" }).first();

  console.log(
    `    vacantes: ${(totalVacantes as { total: string | number }).total} | candidaturas: ${
      (totalPostulaciones as { total: string | number }).total
    }`,
  );
  console.log(`    contrasena de los alumnos demo: ${CONTRASENA}`);
}
