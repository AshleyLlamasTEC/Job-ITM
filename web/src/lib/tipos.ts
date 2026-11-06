/** Tipos compartidos con la API. */

export type Rol = "estudiante" | "empresa" | "vinculacion" | "admin_tecnico";

export interface PerfilEstudiante {
  id: number;
  user_id: number;
  matricula: string | null;
  carrera_id: number | null;
  semestre: number | null;
  anio_egreso: number | null;
  telefono: string | null;
  cv_ruta: string | null;
  cv_actualizado_en: string | null;
  habilidades: string | null;
  creado_en: string;
  actualizado_en: string;
  carrera?: string | null;
  carrera_clave?: string | null;
}

export interface PerfilEmpresa {
  id: number;
  user_id: number;
  razon_social: string;
  rfc: string;
  giro: string | null;
  sitio_web: string | null;
  telefono: string | null;
  contacto_nombre: string | null;
  contacto_correo: string | null;
  logo_ruta: string | null;
  estatus_validacion: "pendiente" | "aprobada" | "rechazada" | string;
  motivo_rechazo: string | null;
  validado_por: number | null;
  validado_en: string | null;
  creado_en: string;
  actualizado_en: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  estado: string;
  correo_verificado_en: string | null;
  rol: Rol;
  permisos: string[];
  perfil?: PerfilEstudiante | PerfilEmpresa | null;
}

export interface EmpresaResumen {
  id: number;
  nombre: string | null;
  logo: string | null;
  giro?: string | null;
  sitio_web?: string | null;
}

export interface Vacante {
  id: number;
  titulo: string;
  empresa: EmpresaResumen;
  carrera: { nombre: string; clave: string } | null;
  tipo: string;
  modalidad: string;
  ciudad: string;
  estado_geo: string | null;
  salario: { min: number | null; max: number | null; mostrar: boolean };
  fecha_cierre: string;
  publicada_en: string | null;
  vistas: number;
  descripcion?: string;
  requisitos?: string;
  actividades?: string | null;
}

export interface Catalogo {
  id: number;
  nombre: string;
  clave: string;
}

export interface Opcion {
  valor: string;
  etiqueta: string;
}

export interface Paginacion {
  pagina: number;
  por_pagina: number;
  total: number;
  paginas: number;
}

export interface EventoTimeline {
  estado: string;
  estado_etiqueta: string;
  fecha: string;
  accion: string;
}

export interface Postulacion {
  id: number;
  vacante: {
    id: number;
    titulo: string;
    empresa: string;
    ciudad: string;
    modalidad: string;
    estado: string;
  };
  estado: string;
  estado_etiqueta: string;
  mensaje: string | null;
  fecha_estado: string;
  creado_en: string;
  linea_de_tiempo?: EventoTimeline[];
}

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  leida: boolean;
  leida_en: string | null;
  creado_en: string;
}

/** Forma resumida que devuelve GET /favoritos. */
export interface FavoritoItem {
  vacante: {
    id: number;
    titulo: string;
    empresa: string | null;
    tipo: string;
    modalidad: string;
    ciudad: string;
    estado: string;
    fecha_cierre: string;
    salario: { min: number | null; max: number | null; mostrar: boolean };
  };
  guardado_en: string;
}

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  estado: string;
  ultimo_acceso_en: string | null;
  creado_en: string;
  rol: Rol;
}

/** Vacante tal como la ve la empresa duena (forma editable). */
export interface VacanteEmpresa {
  id: number;
  empresa_id: number;
  carrera_id: number | null;
  titulo: string;
  descripcion: string;
  requisitos: string;
  actividades: string | null;
  tipo: string;
  modalidad: string;
  ciudad: string;
  estado_geo: string | null;
  salario_min: number | null;
  salario_max: number | null;
  mostrar_salario: boolean;
  fecha_publicacion: string | null;
  fecha_cierre: string;
  estado: string;
  motivo_rechazo: string | null;
  vistas: number;
  creado_en: string;
  actualizado_en: string;
  postulaciones?: number;
}

export interface Candidato {
  id: number;
  alumno: string;
  matricula: string | null;
  carrera: string | null;
  semestre: number | null;
  anio_egreso: number | null;
  estado: string;
  estado_etiqueta: string;
  notas_empresa: string | null;
  fecha_estado: string;
  postulado_en: string;
}

export interface DetalleCandidato {
  id: number;
  estado: string;
  estado_etiqueta: string;
  estado_final: boolean;
  mensaje: string | null;
  notas_empresa: string | null;
  fecha_estado: string;
  postulado_en: string;
  vacante: { id: number; titulo: string; estado: string };
  alumno: {
    nombre: string;
    correo: string;
    matricula: string | null;
    telefono: string | null;
    carrera: string | null;
    carrera_clave: string | null;
    semestre: number | null;
    anio_egreso: number | null;
    habilidades: string | null;
  } | null;
  curriculum: { url: string; expira: number } | null;
  linea_de_tiempo: EventoTimeline[];
  sugerencia?: { cerrar_vacante: boolean; mensaje: string; url: string };
}

export interface TableroEmpresa {
  empresa: { id: number; razon_social: string; estatus_validacion: string };
  vacantes: {
    total: number;
    por_estado: Record<string, number>;
    publicadas: number;
  };
}

export interface TableroAdmin {
  por_estado_vacante: Record<string, number>;
  por_estatus_empresa: Record<string, number>;
  por_estado_postulacion: Record<string, number>;
  por_estado_usuario: Record<string, number>;
  moderacion: { pendientes: number; retenidas_3_dias: number };
  empresas_sin_validar: number;
  reportes_abiertos: number;
  postulaciones_totales: number;
  postulaciones_30_dias: number;
}
