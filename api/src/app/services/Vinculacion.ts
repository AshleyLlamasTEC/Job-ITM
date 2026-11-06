/**
 * Servicio del panel de Vinculacion (apartados 5.6 y 6.4).
 *
 * Cubre lo que la etapa E-5 agrega sobre la base de E-4:
 *
 *   - Tablero con las metricas generales del portal.
 *   - Validacion de las empresas que envian su registro (pendientes ->
 *     aprobadas o rechazadas, con motivo obligatorio).
 *   - Atencion de los reportes ciudadanos sobre vacantes dudosas.
 *   - Baja administrativa de una vacante publicada (retira del buscador).
 *   - Indicadores agregados por carrera, empresa y periodo.
 *   - Exportacion de listados a CSV (vacantes, postulaciones, empresas).
 *   - Administracion de cuentas y roles (tecnico).
 *   - Consulta de la bitacora administrativa.
 *
 * Reglas que no se delegan a la interfaz:
 *
 *   - Solo se valida una empresa en estado `pendiente`; cualquier otro
 *     responde 409.
 *   - Toda accion de Vinculacion queda registrada en la bitacora con usuario,
 *     fecha, datos anteriores y datos nuevos.
 *   - La baja administrativa es una via final: la vacante pasa a `cerrada` y
 *     ya no se puede publicar de nuevo ni recibir postulaciones.
 *   - El usuario no puede cambiar su propio rol ni acumular dos roles; el
 *     cambio reemplaza la asignacion anterior.
 */
import { db } from "../../support/database/connection";
import { Conflicto, NoEncontrado, PeticionInvalida, SinPermiso } from "../../support/http/errors";
import { registrar as bitacora } from "../../support/bitacora";
import { fechaEnApp, hoyLocal } from "../../support/fechas";
import type { Registro } from "../../support/model";
import { aCsv, nombreArchivo } from "../../support/csv";
import { Avisos } from "./Avisos";
import { enlaceCvPostulacion } from "./Postulaciones";
import { ROLES } from "../../database/seeders/permisos";
import { Empresa } from "../models/Empresa";
import { Reporte } from "../models/Reporte";
import { Vacante } from "../models/Vacante";
import { User } from "../models/User";

/** Nombre de clase con el que el guard de permisos identifica a las cuentas. */
const TIPO_MODELO = "App\\Models\\User";

/** Periodos soportados por GET /admin/indicadores. */
const PERIODOS = ["30d", "6m", "12m"] as const;

/** Estados de reporte que implican que Vinculacion aun no lo cierra. */
const ABIERTOS = ["nuevo", "en_revision"];

const MES = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** Datos de contacto de una cuenta para los avisos. */
async function contacto(userId: number): Promise<{ userId: number; correo: string; nombre: string }> {
  const fila = await db("users").where({ id: userId }).first();
  return {
    userId,
    correo: String(fila?.correo ?? ""),
    nombre: String(fila?.nombre ?? ""),
  };
}

/** Destinatario de los avisos a una empresa: se avisa a su correo de contacto. */
async function destinatarioEmpresa(empresa: Registro): Promise<{ userId: number; correo: string; nombre: string }> {
  const base = await contacto(Number(empresa.user_id));
  base.correo = String(empresa.contacto_correo ?? base.correo);
  base.nombre = String(empresa.razon_social ?? empresa.contacto_nombre ?? base.nombre);
  return base;
}

/** Destinatario de un usuario cualquiera (p. ej. el reportante). */
async function destinatarioUsuario(userId: number): Promise<{ userId: number; correo: string; nombre: string }> {
  return contacto(userId);
}

/** Usuario vinculado a la cuenta (o 404). */
async function exigirCuenta(userId: number): Promise<Registro> {
  const fila = await db("users").where({ id: userId }).first();
  if (!fila) throw new NoEncontrado("La cuenta no existe.");
  return fila;
}

/** Filas todos ceros para cada mes del periodo, en orden cronologico. */
function mesInicial(offset: number): { mes: string; postulaciones: number; vacantes_publicadas: number } {
  const base = new Date();
  base.setUTCMonth(base.getUTCMonth() - offset);
  return {
    mes: `${base.getUTCFullYear()}-${MES[base.getUTCMonth()]}`,
    postulaciones: 0,
    vacantes_publicadas: 0,
  };
}

// ---------------------------------------------------------------------------
// Tablero e indicadores
// ---------------------------------------------------------------------------

/** GET /admin/tablero — metricas generales del portal. */
async function tablero(): Promise<Registro> {
  const vacantes = await db("vacantes").whereIn("estado", [
    "publicada",
    "en_revision",
    "pausada",
    "cerrada",
    "rechazada",
    "borrador",
    "expirada",
  ])
    .groupBy("estado")
    .select("estado")
    .count({ total: "*" });

  const empresas = await db("empresas")
    .groupBy("estatus_validacion")
    .select("estatus_validacion")
    .count({ total: "*" });

  const postulaciones = await db("postulaciones")
    .groupBy("estado")
    .select("estado")
    .count({ total: "*" });

  const usuarios = await db("users")
    .groupBy("estado")
    .select("estado")
    .count({ total: "*" });

  const [reportes] = await db("reportes")
    .whereIn("estado", ABIERTOS)
    .count({ total: "*" });

  const [ultimasPeticiones] = await db("postulaciones")
    .where("creado_en", ">=", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .count({ total: "*" });

  const [rechazadasAntesDe] = await db("vacantes")
    .where("estado", "en_revision")
    .whereRaw("DATEDIFF(NOW(), actualizado_en) >= 3")
    .count({ total: "*" });

  const porEstadoVacante: Record<string, number> = {};
  for (const fila of vacantes as Array<{ estado: string; total: string | number }>) {
    porEstadoVacante[fila.estado] = Number(fila.total);
  }

  const porEstatusEmpresa: Record<string, number> = {};
  for (const fila of empresas as Array<{ estatus_validacion: string; total: string | number }>) {
    porEstatusEmpresa[fila.estatus_validacion] = Number(fila.total);
  }

  const porEstadoPostulacion: Record<string, number> = {};
  for (const fila of postulaciones as Array<{ estado: string; total: string | number }>) {
    porEstadoPostulacion[fila.estado] = Number(fila.total);
  }

  const porEstadoUsuario: Record<string, number> = {};
  for (const fila of usuarios as Array<{ estado: string; total: string | number }>) {
    porEstadoUsuario[fila.estado] = Number(fila.total);
  }

  const totalPostulaciones = Object.values(porEstadoPostulacion).reduce((total, n) => total + n, 0);

  return {
    por_estado_vacante: porEstadoVacante,
    por_estatus_empresa: porEstatusEmpresa,
    por_estado_postulacion: porEstadoPostulacion,
    por_estado_usuario: porEstadoUsuario,
    // Resumenes que el panel necesita de un vistazo.
    // `en_revision` con 3 o mas dias pendientes es la medicion que delata
    // saturacion de moderacion.
    moderacion: {
      pendientes: porEstadoVacante.en_revision ?? 0,
      retenidas_3_dias: Number((rechazadasAntesDe as { total: string | number }).total),
    },
    empresas_sin_validar: porEstatusEmpresa.pendiente ?? 0,
    reportes_abiertos: Number((reportes as { total: string | number })?.total ?? 0),
    postulaciones_totales: totalPostulaciones,
    postulaciones_30_dias: Number((ultimasPeticiones as { total: string | number })?.total ?? 0),
  };
}

/** GET /admin/indicadores — series por carrera, empresa y periodo. */
async function indicadores(
  params: { periodo?: string; carrera_id?: number; empresa_id?: number },
): Promise<Registro> {
  const periodo = PERIODOS.includes((params.periodo ?? "6m") as (typeof PERIODOS)[number])
    ? ((params.periodo ?? "6m") as (typeof PERIODOS)[number])
    : "6m";

  const months = periodo === "30d" ? 1 : periodo === "12m" ? 12 : 6;
  const desde = new Date();
  desde.setUTCMonth(desde.getUTCMonth() - months + 1);
  desde.setUTCDate(1);
  desde.setUTCHours(0, 0, 0, 0);

  // ---- Serie por mes
  const porMesCrudo = (await db("postulaciones")
    .select(db.raw("DATE_FORMAT(creado_en, '%Y-%m') as mes"))
    .count({ postulaciones: "*" })
    .where("creado_en", ">=", desde)
    .groupBy("mes")) as Array<{ mes: string; postulaciones: string | number }>;

  if (params.carrera_id || params.empresa_id) {
    const consulta = db("postulaciones as p")
      .join("vacantes as v", "v.id", "p.vacante_id")
      .join("estudiantes as est", "est.id", "p.estudiante_id")
      .select(db.raw("DATE_FORMAT(p.creado_en, '%Y-%m') as mes"))
      .count({ postulaciones: "*" })
      .where("p.creado_en", ">=", desde);
    if (params.carrera_id) consulta.where("est.carrera_id", params.carrera_id);
    if (params.empresa_id) consulta.where("v.empresa_id", params.empresa_id);

    porMesCrudo.splice(
      0,
      porMesCrudo.length,
      ...((await consulta.groupBy("mes")) as Array<{ mes: string; postulaciones: string | number }>),
    );
  }

  const porMes = Array.from({ length: months }, (_, index) => mesInicial(months - 1 - index));
  for (const fila of porMesCrudo) {
    const indice = porMes.findIndex((m) => m.mes === fila.mes);
    if (indice >= 0) porMes[indice].postulaciones = Number(fila.postulaciones);
  }

  const publicadasMes = (await db("vacantes")
    .select(db.raw("DATE_FORMAT(fecha_publicacion, '%Y-%m') as mes"))
    .count({ publicadas: "*" })
    .where("fecha_publicacion", ">=", desde)
    .groupBy("mes")) as Array<{ mes: string; publicadas: string | number }>;

  for (const fila of publicadasMes) {
    const indice = porMes.findIndex((m) => m.mes === fila.mes);
    if (indice >= 0) porMes[indice].vacantes_publicadas = Number(fila.publicadas);
  }

  // ---- Series por carrera y empresa (ultimos `months` meses)
  const porCarrera = (await db("postulaciones as p")
    .join("estudiantes as est", "est.id", "p.estudiante_id")
    .join("carreras as c", "c.id", "est.carrera_id")
    .select("c.id as carrera_id", "c.nombre as carrera", "c.clave as carrera_clave")
    .count({ postulaciones: "*" })
    .where("p.creado_en", ">=", desde)
    .groupBy("c.id", "c.nombre", "c.clave")
    .orderByRaw("count(*) desc")
    .limit(10)) as Registro[];

  const porEmpresa = (await db("postulaciones as p")
    .join("vacantes as v", "v.id", "p.vacante_id")
    .join("empresas as e", "e.id", "v.empresa_id")
    .select("e.id as empresa_id", "e.razon_social as empresa")
    .count({ postulaciones: "*" })
    .countDistinct({ vacantes: "p.vacante_id" })
    .where("p.creado_en", ">=", desde)
    .groupBy("e.id", "e.razon_social")
    .orderByRaw("count(*) desc")
    .limit(10)) as Registro[];

  const porEstadoPostulacion = (await db("postulaciones")
    .select("estado")
    .count({ total: "*" })
    .where("creado_en", ">=", desde)
    .groupBy("estado")) as Registro[];

  const porEstado = porEstadoPostulacion.map((f) => ({
    estado: f.estado,
    total: Number(f.total),
  }));

  const [postulacionesTotales] = await db("postulaciones")
    .where("creado_en", ">=", desde)
    .count({ total: "*" });

  return {
    periodo,
    meses: porMes,
    por_carrera: porCarrera.map((f) => ({
      carrera_id: Number(f.carrera_id),
      carrera: f.carrera,
      carrera_clave: f.carrera_clave,
      postulaciones: Number(f.postulaciones),
    })),
    por_empresa: porEmpresa.map((f) => ({
      empresa_id: Number(f.empresa_id),
      empresa: f.empresa,
      vacantes: Number(f.vacantes),
      postulaciones: Number(f.postulaciones),
    })),
    por_estado_postulacion: porEstado,
    totales: {
      postulaciones: Number((postulacionesTotales as { total: string | number })?.total ?? 0),
      vacantes_publicadas: porMes.reduce((total, m) => total + m.vacantes_publicadas, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

/** GET /admin/empresas — solicitudes en `pendiente`, primero las mas antiguas. */
async function empresasEnRevision(): Promise<Registro[]> {
  const filas = (await db("empresas as e")
    .join("users as u", "u.id", "e.user_id")
    .select(
      "e.id",
      "e.razon_social",
      "e.rfc",
      "e.giro",
      "e.telefono",
      "e.contacto_nombre",
      "e.contacto_correo",
      "e.estatus_validacion",
      "e.creado_en",
      "u.nombre as cuenta_nombre",
      "u.correo as cuenta_correo",
    )
    .where("e.estatus_validacion", "pendiente")
    .orderBy("e.creado_en", "asc")) as Registro[];

  return filas.map((f) => ({
    id: Number(f.id),
    razon_social: f.razon_social,
    rfc: f.rfc,
    giro: f.giro,
    telefono: f.telefono,
    contacto: {
      nombre: f.contacto_nombre,
      correo: f.contacto_correo,
    },
    cuenta: {
      nombre: f.cuenta_nombre,
      correo: f.cuenta_correo,
    },
    creada_en: f.creado_en,
  }));
}

/** POST /admin/empresas/{id}/aprobar */
async function aprobarEmpresa(
  validadorId: number,
  empresaId: number,
  ip?: string,
): Promise<Registro> {
  const empresa = await Empresa.buscar(empresaId);
  if (!empresa) throw new NoEncontrado("La empresa no existe.");
  if (empresa.estatus_validacion !== "pendiente") {
    throw new Conflicto(
      `La empresa ya esta en estado ${empresa.estatus_validacion}; solo se validan las pendientes.`,
    );
  }

  await Empresa.actualizar(empresaId, {
    estatus_validacion: "aprobada",
    motivo_rechazo: null,
    validado_por: validadorId,
    validado_en: new Date(),
  });

  const objetivo = await destinatarioEmpresa(empresa);
  await Avisos.empresaAprobada(objetivo, String(empresa.razon_social));

  await bitacora({
    userId: validadorId,
    accion: "aprobar_empresa",
    entidad: "empresas",
    entidadId: empresaId,
    anteriores: { estatus_validacion: empresa.estatus_validacion },
    nuevos: { estatus_validacion: "aprobada" },
    ip,
  });

  return empresaProvisional(empresaId, "aprobada");
}

/** POST /admin/empresas/{id}/rechazar */
async function rechazarEmpresa(
  validadorId: number,
  empresaId: number,
  motivo: string,
  ip?: string,
): Promise<Registro> {
  const empresa = await Empresa.buscar(empresaId);
  if (!empresa) throw new NoEncontrado("La empresa no existe.");
  if (empresa.estatus_validacion !== "pendiente") {
    throw new Conflicto(
      `La empresa ya esta en estado ${empresa.estatus_validacion}; solo se validan las pendientes.`,
    );
  }

  await Empresa.actualizar(empresaId, {
    estatus_validacion: "rechazada",
    motivo_rechazo: motivo,
    validado_por: validadorId,
    validado_en: new Date(),
  });

  const objetivo = await destinatarioEmpresa(empresa);
  await Avisos.empresaRechazada(objetivo, String(empresa.razon_social), motivo);

  await bitacora({
    userId: validadorId,
    accion: "rechazar_empresa",
    entidad: "empresas",
    entidadId: empresaId,
    anteriores: { estatus_validacion: empresa.estatus_validacion },
    nuevos: { estatus_validacion: "rechazada", motivo_rechazo: motivo },
    ip,
  });

  return empresaProvisional(empresaId, "rechazada");
}

/** Forma de respuesta para los endpoints de validacion. */
async function empresaProvisional(empresaId: number, estatus: string): Promise<Registro> {
  const empresa = await Empresa.buscar(empresaId);
  return {
    id: Number(empresa?.id),
    razon_social: empresa?.razon_social ?? null,
    rfc: empresa?.rfc ?? null,
    estatus_validacion: estatus,
    validado_en: empresa?.validado_en ?? null,
    validado_por: empresa?.validado_por ? Number(empresa.validado_por) : null,
    motivo_rechazo: empresa?.motivo_rechazo ?? null,
  };
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

/** GET /admin/reportes — abiertos, primero los mas antiguos. */
async function reportesAbiertos(): Promise<Registro[]> {
  const filas = (await db("reportes as r")
    .join("vacantes as v", "v.id", "r.vacante_id")
    .join("empresas as e", "e.id", "v.empresa_id")
    .join("users as u", "u.id", "r.user_id")
    .select(
      "r.id",
      "r.motivo",
      "r.detalle",
      "r.estado",
      "r.creado_en",
      "v.id as vacante_id",
      "v.titulo as vacante_titulo",
      "v.estado as vacante_estado",
      "e.razon_social as empresa_nombre",
      "e.id as empresa_id",
      "u.nombre as reportante",
      "u.correo as reportante_correo",
    )
    .whereIn("r.estado", ABIERTOS)
    .orderBy("r.creado_en", "asc")) as Registro[];

  return filas.map((f) => ({
    id: Number(f.id),
    motivo: f.motivo,
    motivo_etiqueta: Reporte.ETIQUETAS[String(f.motivo)] ?? String(f.motivo),
    detalle: f.detalle ?? null,
    estado: f.estado,
    creado_en: f.creado_en,
    vacante: {
      id: Number(f.vacante_id),
      titulo: f.vacante_titulo,
      estado: f.vacante_estado,
    },
    empresa: {
      nombre: f.empresa_nombre,
      id: Number(f.empresa_id),
    },
    reportante: f.reportante,
    reportante_correo: f.reportante_correo,
  }));
}

/** PUT /admin/reportes/{id} — registra la resolucion del reporte. */
async function resolverReporte(
  atendidoPor: number,
  reporteId: number,
  datos: { estado: string; detalle?: string | null },
  ip?: string,
): Promise<Registro> {
  const estados = ["en_revision", "resuelto", "descartado"] as const;
  if (!estados.includes(datos.estado as (typeof estados)[number])) {
    throw new PeticionInvalida(
      `El estado debe ser uno de: ${estados.join(", ")}.`,
    );
  }

  const reporte = await db("reportes").where({ id: reporteId }).first();
  if (!reporte) throw new NoEncontrado("El reporte no existe.");

  if (!ABIERTOS.includes(String(reporte.estado))) {
    throw new Conflicto(
      `El reporte ya esta en estado ${reporte.estado}; solo se atienden los abiertos.`,
    );
  }

  await db("reportes").where({ id: reporteId }).update({
    estado: datos.estado,
    atendido_por: atendidoPor,
    atendido_en: new Date(),
  });

  if (datos.estado === "resuelto" || datos.estado === "descartado") {
    const vacante = await db("vacantes").where({ id: reporte.vacante_id }).first();
    const objetivo = await destinatarioUsuario(Number(reporte.user_id));
    await Avisos.reporteAtendido(objetivo, {
      vacanteTitulo: String(vacante?.titulo ?? "Vacante retirada"),
      estado: datos.estado,
      detalle: datos.detalle?.trim() || null,
    });
  }

  await bitacora({
    userId: atendidoPor,
    accion: "resolver_reporte",
    entidad: "reportes",
    entidadId: reporteId,
    anteriores: { estado: reporte.estado },
    nuevos: { estado: datos.estado, ...(datos.detalle ? { detalle: datos.detalle } : {}) },
    ip,
  });

  return {
    id: Number(reporteId),
    vacante_id: Number(reporte.vacante_id),
    estado: datos.estado,
    atendido_por: atendidoPor,
    atendido_en: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Baja administrativa
// ---------------------------------------------------------------------------

/** POST /admin/vacantes/{id}/baja — retira una vacante publicada del buscador. */
async function darBajaVacante(
  moderadorId: number,
  vacanteId: number,
  motivo: string,
  ip?: string,
): Promise<Registro> {
  const vacante = await Vacante.buscar(vacanteId);
  if (!vacante) throw new NoEncontrado("La vacante no existe.");
  if (vacante.estado !== "publicada") {
    throw new Conflicto(
      `Solo se da de baja una vacante publicada. Estado actual: ${vacante.estado}.`,
    );
  }

  await Vacante.actualizar(vacanteId, {
    estado: "cerrada",
    moderado_por: moderadorId,
    moderado_en: new Date(),
  });

  const empresa = await Empresa.buscar(Number(vacante.empresa_id));
  if (empresa) {
    const objetivo = await destinatarioEmpresa(empresa);
    await Avisos.vacanteDadaDeBaja(
      objetivo,
      {
        vacanteId,
        vacanteTitulo: String(vacante.titulo),
        empresa: String(empresa.razon_social),
      },
      motivo,
    );
  }

  await bitacora({
    userId: moderadorId,
    accion: "dar_baja_vacante",
    entidad: "vacantes",
    entidadId: vacanteId,
    anteriores: { estado: vacante.estado },
    nuevos: { estado: "cerrada", motivo_baja: motivo },
    ip,
  });

  return {
    id: Number(vacanteId),
    titulo: vacante.titulo,
    estado: "cerrada",
    moderada_por: moderadorId,
    motivo_baja: motivo,
  };
}

// ---------------------------------------------------------------------------
// Usuarios y bitacora
// ---------------------------------------------------------------------------

/** GET /admin/usuarios — cuentas con su rol, opcionalmente filtradas por rol. */
async function usuarios(
  params: { pagina: number; por_pagina: number; rol?: string; estado?: string },
): Promise<{ filas: Registro[]; total: number }> {
  const pagina = Math.max(1, params.pagina);
  const porPagina = Math.min(100, Math.max(1, params.por_pagina));

  const consulta = db("users as u")
    .leftJoin("model_has_roles as mhr", (join) => {
      join.on("mhr.model_id", "u.id").andOnVal("mhr.model_type", "=", TIPO_MODELO);
    })
    .leftJoin("roles as r", "r.id", "mhr.role_id")
    .select(
      "u.id",
      "u.nombre",
      "u.correo",
      "u.estado",
      "u.ultimo_acceso_en",
      "u.creado_en",
      "r.name as rol",
    );

  if (params.estado) consulta.where("u.estado", params.estado);
  if (params.rol) consulta.where("r.name", params.rol);

  const [cuenta] = await db("users as u")
    .leftJoin("model_has_roles as mhr", (join) => {
      join.on("mhr.model_id", "u.id").andOnVal("mhr.model_type", "=", TIPO_MODELO);
    })
    .leftJoin("roles as r", "r.id", "mhr.role_id")
    .modify((q) => {
      if (params.estado) q.where("u.estado", params.estado!);
      if (params.rol) q.where("r.name", params.rol!);
    })
    .count({ total: "*" });

  const total = Number((cuenta as { total: string | number })?.total ?? 0);

  const filas = (await consulta
    .orderBy("u.creado_en", "desc")
    .limit(porPagina)
    .offset((pagina - 1) * porPagina)) as Registro[];

  return {
    filas: filas.map((f) => ({
      id: Number(f.id),
      nombre: f.nombre,
      correo: f.correo,
      estado: f.estado,
      ultimo_acceso_en: f.ultimo_acceso_en,
      creado_en: f.creado_en,
      rol: f.rol ?? "ninguno",
    })),
    total,
  };
}

/** PUT /admin/usuarios/{id}/rol — reemplaza el rol de la cuenta. */
async function cambiarRol(
  operadorId: number,
  usuarioId: number,
  rol: string,
  ip?: string,
): Promise<Registro> {
  if (usuarioId === operadorId) {
    throw new Conflicto(
      "No puedes cambiar tu propio rol; si necesitas otro rol, pidelo a otro administrador.",
    );
  }

  const usuario = await User.buscar(usuarioId);
  if (!usuario) throw new NoEncontrado("La cuenta no existe.");

  // `ROLES` contiene los cuatro roles del sistema (apartado 4.7).
  if (!(ROLES as readonly string[]).includes(rol)) {
    throw new PeticionInvalida(`El rol debe ser uno de: ${ROLES.join(", ")}.`);
  }

  const antes = (await db("model_has_roles as mhr")
    .join("roles as r", "r.id", "mhr.role_id")
    .where("mhr.model_id", usuarioId)
    .select("r.name")) as Array<{ name: string }>;
  const rolesPrevios = antes.map((r) => r.name);

  const rolExistente = await db("roles").where({ name: rol, guard_name: "api" }).first();
  if (!rolExistente) {
    throw new PeticionInvalida(`El rol ${rol} no esta registrado; corre el seeder de permisos.`);
  }

  // El guard usa `App\Models\User` como tipo; se reemplaza cualquier
  // asignacion previa para que la cuenta no acumule dos roles.
  await db("model_has_roles").where({ model_id: usuarioId }).delete();
  await db("model_has_roles").insert({
    model_id: usuarioId,
    role_id: rolExistente.id,
    model_type: TIPO_MODELO,
  });

  await bitacora({
    userId: operadorId,
    accion: "cambio_rol_usuario",
    entidad: "users",
    entidadId: usuarioId,
    anteriores: { roles: rolesPrevios },
    nuevos: { roles: [rol] },
    ip,
  });

  return {
    id: usuarioId,
    correo: usuario.correo,
    nombre: usuario.nombre,
    estado: usuario.estado,
    rol,
  };
}

/** GET /admin/bitacora — registro de acciones administrativas. */
function leerJson(valor: unknown): unknown {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "object") return valor;

  try {
    return JSON.parse(String(valor));
  } catch {
    return null;
  }
}

async function consultarBitacora(
  params: { pagina: number; por_pagina: number; entidad?: string; accion?: string },
): Promise<{ filas: Registro[]; total: number }> {
  const pagina = Math.max(1, params.pagina);
  const porPagina = Math.min(100, Math.max(1, params.por_pagina));

  const consulta = db("bitacora as b")
    .leftJoin("users as u", "u.id", "b.user_id")
    .select(
      "b.id",
      "b.accion",
      "b.entidad",
      "b.entidad_id",
      "b.datos_anteriores",
      "b.datos_nuevos",
      "b.creado_en",
      "u.nombre as usuario",
      "u.correo as usuario_correo",
    );

  if (params.entidad) consulta.where("b.entidad", params.entidad);
  if (params.accion) consulta.where("b.accion", params.accion);

  const [cuenta] = await db("bitacora as b")
    .modify((q) => {
      if (params.entidad) q.where("b.entidad", params.entidad!);
      if (params.accion) q.where("b.accion", params.accion!);
    })
    .count({ total: "*" });

  const total = Number((cuenta as { total: string | number })?.total ?? 0);

  const filas = (await consulta
    .orderBy("b.creado_en", "desc")
    .limit(porPagina)
    .offset((pagina - 1) * porPagina)) as Registro[];

  return {
    filas: filas.map((f) => ({
      id: Number(f.id),
      accion: f.accion,
      entidad: f.entidad,
      entidad_id: f.entidad_id === null ? null : Number(f.entidad_id),
      anteriores: leerJson(f.datos_anteriores),
      nuevos: leerJson(f.datos_nuevos),
      usuario: f.usuario ?? null,
      usuario_correo: f.usuario_correo ?? null,
      creado_en: f.creado_en,
    })),
    total,
  };
}

// ---------------------------------------------------------------------------
// Exportacion CSV
// ---------------------------------------------------------------------------

/** Columnas de cada recurso exportable (apartado 5.6). */
const EXPORTABLES: Record<string, { titulo: string; columnas: Array<{ campo: string; titulo: string }> }> = {
  vacantes: {
    titulo: "Vacantes",
    columnas: [
      { campo: "id", titulo: "Folio" },
      { campo: "titulo", titulo: "Titulo" },
      { campo: "empresa", titulo: "Empresa" },
      { campo: "tipo", titulo: "Tipo" },
      { campo: "modalidad", titulo: "Modalidad" },
      { campo: "ciudad", titulo: "Ciudad" },
      { campo: "estado", titulo: "Estado" },
      { campo: "vistas", titulo: "Vistas" },
      { campo: "publicada_en", titulo: "Publicada el" },
      { campo: "fecha_cierre", titulo: "Cierre" },
      { campo: "postulaciones", titulo: "Postulaciones" },
    ],
  },
  postulaciones: {
    titulo: "Postulaciones",
    columnas: [
      { campo: "id", titulo: "Folio" },
      { campo: "alumno", titulo: "Alumno" },
      { campo: "matricula", titulo: "Matricula" },
      { campo: "carrera", titulo: "Carrera" },
      { campo: "vacante", titulo: "Vacante" },
      { campo: "empresa", titulo: "Empresa" },
      { campo: "estado", titulo: "Estado" },
      { campo: "postulado_en", titulo: "Postulado el" },
      { campo: "ultimo_cambio", titulo: "Ultimo cambio" },
    ],
  },
  empresas: {
    titulo: "Empresas",
    columnas: [
      { campo: "id", titulo: "Folio" },
      { campo: "razon_social", titulo: "Razon social" },
      { campo: "rfc", titulo: "RFC" },
      { campo: "giro", titulo: "Giro" },
      { campo: "telefono", titulo: "Telefono" },
      { campo: "contacto_nombre", titulo: "Contacto" },
      { campo: "contacto_correo", titulo: "Correo contacto" },
      { campo: "estatus_validacion", titulo: "Estatus" },
      { campo: "creada_en", titulo: "Registrada el" },
    ] as const,
  },
} as const;

type Recurso = keyof typeof EXPORTABLES;

/** GET /admin/exportar/{recurso} */
async function exportar(
  recurso: string,
  filtros: { estado?: string; estatus_validacion?: string } = {},
): Promise<{ contenido: string; filename: string }> {
  if (!(recurso in EXPORTABLES)) {
    throw new PeticionInvalida(
      `El recurso debe ser uno de: ${Object.keys(EXPORTABLES).join(", ")}.`,
    );
  }

  const configExportacion = EXPORTABLES[recurso as Recurso];

  if (recurso === "vacantes") {
    const estado = filtros.estado;
    if (estado && !["borrador", "en_revision", "publicada", "pausada", "rechazada", "cerrada", "expirada"].includes(estado)) {
      throw new PeticionInvalida(`El estado no existe para una vacante: ${estado}.`);
    }

    const filas = (await db("vacantes as v")
      .leftJoin("empresas as e", "e.id", "v.empresa_id")
      .leftJoin("postulaciones as p", "p.vacante_id", "v.id")
      .groupBy("v.id")
      .modify((q) => {
        if (estado) q.where("v.estado", estado);
      })
      .select(
        "v.id",
        "v.titulo",
        "e.razon_social as empresa",
        "v.tipo",
        "v.modalidad",
        "v.ciudad",
        "v.estado",
        "v.vistas",
        "v.fecha_publicacion",
        "v.fecha_cierre",
      )
      .count({ postulaciones: "p.id" })
      .orderBy("v.id", "asc")) as Registro[];

    const filasProyectadas = filas.map((f) => ({
      id: Number(f.id),
      titulo: String(f.titulo ?? ""),
      empresa: String(f.empresa ?? ""),
      tipo: String(f.tipo ?? ""),
      modalidad: String(f.modalidad ?? ""),
      ciudad: String(f.ciudad ?? ""),
      estado: String(f.estado ?? ""),
      vistas: Number(f.vistas ?? 0),
      publicada_en: fechaEnApp(f.fecha_publicacion),
      fecha_cierre: f.fecha_cierre ? String(f.fecha_cierre) : "",
      postulaciones: Number(f.postulaciones ?? 0),
    }));

    return {
      contenido: aCsv(filasProyectadas, configExportacion.columnas),
      filename: nombreArchivo(configExportacion.titulo),
    };
  }

  if (recurso === "postulaciones") {
    const estado = filtros.estado;
    if (estado && !["recibida", "en_revision", "contactado", "entrevista", "contratado", "rechazado"].includes(estado)) {
      throw new PeticionInvalida(`El estado no existe para una postulacion: ${estado}.`);
    }

    const filas = (await db("postulaciones as p")
      .join("estudiantes as est", "est.id", "p.estudiante_id")
      .join("users as u", "u.id", "est.user_id")
      .leftJoin("carreras as c", "c.id", "est.carrera_id")
      .join("vacantes as v", "v.id", "p.vacante_id")
      .join("empresas as e", "e.id", "v.empresa_id")
      .modify((q) => {
        if (estado) q.where("p.estado", estado);
      })
      .select(
        "p.id",
        "u.nombre as alumno",
        "est.matricula",
        "c.nombre as carrera",
        "v.titulo as vacante",
        "e.razon_social as empresa",
        "p.estado",
        "p.creado_en",
        "p.fecha_estado",
      )
      .orderBy("p.creado_en", "asc")) as Registro[];

    const filasProyectadas = filas.map((f) => ({
      id: Number(f.id),
      alumno: String(f.alumno ?? ""),
      matricula: String(f.matricula ?? ""),
      carrera: f.carrera ?? "",
      vacante: String(f.vacante ?? ""),
      empresa: String(f.empresa ?? ""),
      estado: String(f.estado ?? ""),
      postulado_en: fechaEnApp(f.creado_en),
      ultimo_cambio: fechaEnApp(f.fecha_estado),
    }));

    return {
      contenido: aCsv(filasProyectadas, configExportacion.columnas),
      filename: nombreArchivo(configExportacion.titulo),
    };
  }

  // empresas
  const estatus = filtros.estatus_validacion;
  if (estatus && !["pendiente", "aprobada", "rechazada"].includes(estatus)) {
    throw new PeticionInvalida(`El estatus no existe: ${estatus}.`);
  }

  const filas = (await db("empresas as e")
    .modify((q) => {
      if (estatus) q.where("e.estatus_validacion", estatus);
    })
    .select(
      "e.id",
      "e.razon_social",
      "e.rfc",
      "e.giro",
      "e.telefono",
      "e.contacto_nombre",
      "e.contacto_correo",
      "e.estatus_validacion",
      "e.creado_en",
    )
    .orderBy("e.creado_en", "asc")) as Registro[];

  const filasProyectadas = filas.map((f) => ({
    id: Number(f.id),
    razon_social: String(f.razon_social ?? ""),
    rfc: String(f.rfc ?? ""),
    giro: String(f.giro ?? ""),
    telefono: String(f.telefono ?? ""),
    contacto_nombre: String(f.contacto_nombre ?? ""),
    contacto_correo: String(f.contacto_correo ?? ""),
    estatus_validacion: String(f.estatus_validacion ?? ""),
    creada_en: fechaEnApp(f.creado_en),
  }));

  return {
    contenido: aCsv(filasProyectadas, configExportacion.columnas),
    filename: nombreArchivo(configExportacion.titulo),
  };
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Currículum (CA-10)
// ---------------------------------------------------------------------------

/**
 * GET /admin/postulaciones/{id}/cv
 *
 * Enlace firmado a la copia del curriculum que viaja con la candidatura. CA-10
 * del criterio de aceptacion exige que solo alumno, la empresa destinataria y
 * Vinculacion puedan descargarlo; el enlace solo nace despues de este control.
 */
async function cvDePostulacion(postulacionId: number): Promise<{ url: string; expira: number }> {
  const fila = await db("postulaciones").where({ id: postulacionId }).first();
  if (!fila) throw new NoEncontrado("La candidatura no existe.");
  return enlaceCvPostulacion(postulacionId);
}

export const Vinculacion = {
  tablero,
  indicadores,
  empresasEnRevision,
  aprobarEmpresa,
  rechazarEmpresa,
  reportesAbiertos,
  resolverReporte,
  darBajaVacante,
  usuarios,
  cambiarRol,
  consultarBitacora,
  cvDePostulacion,
  exportar,
};
