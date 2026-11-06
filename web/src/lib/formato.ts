/** Utilidades de formato en es-MX. */

export function dinero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function rangoSalario(salario: {
  min: number | null;
  max: number | null;
  mostrar: boolean;
}): string {
  if (!salario.mostrar) return "Salario a convenir";
  if (salario.min && salario.max) return `${dinero(salario.min)} – ${dinero(salario.max)}`;
  if (salario.min) return `Desde ${dinero(salario.min)}`;
  if (salario.max) return `Hasta ${dinero(salario.max)}`;
  return "Salario a convenir";
}

export function fecha(iso: string | null | undefined, opciones?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...opciones,
  }).format(fecha);
}

export function fechaHora(iso: string | null | undefined): string {
  return fecha(iso, { hour: "2-digit", minute: "2-digit" });
}

/** "Hace 3 dias" / "Hoy" / "Hace 2 h". */
export function hace(iso: string | null | undefined): string {
  if (!iso) return "";
  const entonces = new Date(iso).getTime();
  if (Number.isNaN(entonces)) return "";
  const segundos = Math.max(0, Math.round((Date.now() - entonces) / 1000));
  if (segundos < 60) return "Hace un momento";
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "Ayer";
  if (dias < 30) return `Hace ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `Hace ${meses} mes${meses === 1 ? "" : "es"}`;
  const anios = Math.floor(meses / 12);
  return `Hace ${anios} ano${anios === 1 ? "" : "s"}`;
}

/** Dias que faltan para el cierre. Negativo si ya vencio. */
export function diasPara(iso: string | null | undefined): number {
  if (!iso) return 0;
  const cierre = new Date(`${iso.slice(0, 10)}T23:59:59`);
  return Math.ceil((cierre.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function etiquetaTipo(valor: string): string {
  const mapa: Record<string, string> = {
    practicas: "Practicas profesionales",
    servicio_social: "Servicio social",
    servicios_profesionales: "Servicios profesionales",
    temporal: "Empleo temporal",
    planta: "Empleo de planta",
  };
  return mapa[valor] ?? valor;
}

export function etiquetaModalidad(valor: string): string {
  const mapa: Record<string, string> = {
    presencial: "Presencial",
    hibrida: "Hibrida",
    remota: "Remota",
  };
  return mapa[valor] ?? valor;
}

export function etiquetaRol(valor: string): string {
  const mapa: Record<string, string> = {
    estudiante: "Alumno",
    empresa: "Empresa",
    vinculacion: "Vinculacion",
    admin_tecnico: "Administrador",
  };
  return mapa[valor] ?? valor;
}

export function etiquetaEstadoVacante(valor: string): string {
  const mapa: Record<string, string> = {
    borrador: "Borrador",
    en_revision: "En revision",
    publicada: "Publicada",
    pausada: "Pausada",
    rechazada: "Rechazada",
    cerrada: "Cerrada",
    expirada: "Expirada",
  };
  return mapa[valor] ?? valor;
}

export function colorEstadoVacante(valor: string): string {
  const mapa: Record<string, string> = {
    borrador: "bg-slate-100 text-slate-700 border-slate-200",
    en_revision: "bg-amber-50 text-amber-700 border-amber-200",
    publicada: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pausada: "bg-sky-50 text-sky-700 border-sky-200",
    rechazada: "bg-rose-50 text-rose-700 border-rose-200",
    cerrada: "bg-slate-100 text-slate-600 border-slate-200",
    expirada: "bg-orange-50 text-orange-700 border-orange-200",
  };
  return mapa[valor] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

export function etiquetaEstadoPostulacion(valor: string): string {
  const mapa: Record<string, string> = {
    recibida: "Recibida",
    en_revision: "En revision",
    contactado: "Contactado",
    entrevista: "Entrevista",
    contratado: "Contratado",
    rechazado: "Rechazado",
  };
  return mapa[valor] ?? valor;
}

/** Etapas del proceso de seleccion, en orden. */
export const ETAPAS = ["recibida", "en_revision", "contactado", "entrevista", "contratado"] as const;

/** Estados a los que puede pasar una candidatura desde el actual. */
export function siguientesEstados(actual: string): string[] {
  if (actual === "contratado" || actual === "rechazado") return [];
  const indice = ETAPAS.indexOf(actual as (typeof ETAPAS)[number]);
  const siguientes = ETAPAS.slice(indice + 1);
  return [...siguientes, "rechazado"];
}

export function colorEstado(estado: string): string {
  const mapa: Record<string, string> = {
    recibida: "bg-slate-100 text-slate-700 border-slate-200",
    en_revision: "bg-amber-50 text-amber-700 border-amber-200",
    contactado: "bg-sky-50 text-sky-700 border-sky-200",
    entrevista: "bg-violet-50 text-violet-700 border-violet-200",
    contratado: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rechazado: "bg-rose-50 text-rose-700 border-rose-200",
    cancelada: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return mapa[estado] ?? "bg-slate-100 text-slate-700 border-slate-200";
}
