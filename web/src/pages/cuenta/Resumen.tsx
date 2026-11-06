import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  FileText,
  Heart,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { VacanteCard } from "@/components/vacantes/VacanteCard";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import { colorEstado, etiquetaRol, fecha, hace } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type {
  Notificacion,
  PerfilEstudiante,
  Postulacion,
  TableroAdmin,
  TableroEmpresa,
  Vacante,
} from "@/lib/tipos";
import { CabeceraPanel } from "@/components/layout/UserLayout";

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos dias";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

function TarjetaIndicador({
  icono: Icono,
  valor,
  etiqueta,
  detalle,
  a,
  tono = "blue",
}: {
  icono: typeof Bell;
  valor: string | number;
  etiqueta: string;
  detalle?: string;
  a?: string;
  tono?: "blue" | "yellow" | "azul" | "violeta" | "ambar";
}) {
  const tonos = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    yellow: "bg-yellow-300/40 text-blue-800 ring-yellow-400/40",
    azul: "bg-sky-50 text-sky-700 ring-sky-100",
    violeta: "bg-violet-50 text-violet-700 ring-violet-100",
    ambar: "bg-amber-50 text-amber-700 ring-amber-100",
  };

  const contenido = (
    <div className="flex h-full items-start gap-3.5 rounded-2xl border border-blue-100 bg-white p-5 shadow-suave transition hover:-translate-y-0.5 hover:shadow-flotante">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1", tonos[tono])}>
        <Icono className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-extrabold leading-none text-blue-950">{valor}</p>
        <p className="mt-1.5 text-xs font-semibold text-blue-800">{etiqueta}</p>
        {detalle && <p className="mt-0.5 text-[11px] text-muted-foreground">{detalle}</p>}
      </div>
    </div>
  );

  return a ? <Link to={a}>{contenido}</Link> : contenido;
}

export function Resumen() {
  const { usuario } = useAuth();
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [totalPostulaciones, setTotalPostulaciones] = useState(0);
  const [favoritos, setFavoritos] = useState(0);
  const [sinLeer, setSinLeer] = useState(0);
  const [recomendadas, setRecomendadas] = useState<Vacante[]>([]);
  const [tableroEmpresa, setTableroEmpresa] = useState<TableroEmpresa | null>(null);
  const [tableroAdmin, setTableroAdmin] = useState<TableroAdmin | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    let activo = true;
    setCargando(true);

    const cargas: Promise<unknown>[] = [];

    if (usuario.rol === "estudiante") {
      cargas.push(
        api.get<Postulacion[]>("/mis-postulaciones?por_pagina=4").then(({ data, meta }) => {
          if (!activo) return;
          setPostulaciones(data);
          setTotalPostulaciones(Number(meta?.total ?? data.length));
        }),
        api.get<unknown[]>("/favoritos").then(({ data }) => {
          if (activo) setFavoritos(data.length);
        }),
        api.get<Notificacion[]>("/notificaciones").then(({ meta }) => {
          if (activo) setSinLeer(Number(meta?.sin_leer ?? 0));
        }),
        api.get<Vacante[]>("/vacantes?por_pagina=3", { publico: true }).then(({ data }) => {
          if (activo) setRecomendadas(data);
        }),
      );
    }

    if (usuario.rol === "empresa") {
      cargas.push(
        api.get<TableroEmpresa>("/empresa/tablero").then(({ data }) => {
          if (activo) setTableroEmpresa(data);
        }),
      );
    }

    if (usuario.rol === "admin_tecnico" || usuario.rol === "vinculacion") {
      cargas.push(
        api.get<TableroAdmin>("/admin/tablero").then(({ data }) => {
          if (activo) setTableroAdmin(data);
        }),
      );
    }

    Promise.allSettled(cargas).finally(() => {
      if (activo) setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [usuario]);

  const perfil = (usuario?.perfil ?? null) as PerfilEstudiante | null;

  const completitud = useMemo(() => {
    if (!usuario || usuario.rol !== "estudiante") return { porcentaje: 0, pendientes: [] as string[] };
    const puntos = [
      { texto: "Matricula registrada", listo: Boolean(perfil?.matricula) },
      { texto: "Carrera seleccionada", listo: Boolean(perfil?.carrera_id) },
      { texto: "Semestre o anio de egreso", listo: Boolean(perfil?.semestre || perfil?.anio_egreso) },
      { texto: "Telefono de contacto", listo: Boolean(perfil?.telefono) },
      { texto: "Habilidades descritas", listo: Boolean(perfil?.habilidades) },
      { texto: "Curriculum en PDF", listo: Boolean(perfil?.cv_ruta) },
    ];
    const listos = puntos.filter((p) => p.listo).length;
    return {
      porcentaje: Math.round((listos / puntos.length) * 100),
      pendientes: puntos.filter((p) => !p.listo).map((p) => p.texto),
    };
  }, [usuario, perfil]);

  if (!usuario) return null;

  const fechaHoy = fecha(new Date().toISOString(), { weekday: "long" });

  return (
    <>
      <CabeceraPanel
        titulo={`${saludo()}, ${usuario.nombre.split(" ")[0]}`}
        descripcion={`${fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)} · ${etiquetaRol(usuario.rol)}`}
        accion={
          usuario.rol === "estudiante" ? (
            <Button asChild>
              <Link to="/vacantes">
                <BriefcaseBusiness /> Buscar vacantes
              </Link>
            </Button>
          ) : undefined
        }
      />

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* ---------------- Estudiante ---------------- */}
          {usuario.rol === "estudiante" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TarjetaIndicador
                  icono={BriefcaseBusiness}
                  valor={totalPostulaciones}
                  etiqueta="Postulaciones"
                  detalle="Candidaturas enviadas"
                  a="/cuenta/postulaciones"
                />
                <TarjetaIndicador
                  icono={Heart}
                  valor={favoritos}
                  etiqueta="Favoritos"
                  detalle="Vacantes guardadas"
                  a="/cuenta/favoritos"
                  tono="yellow"
                />
                <TarjetaIndicador
                  icono={Bell}
                  valor={sinLeer}
                  etiqueta="Avisos sin leer"
                  detalle="Notificaciones nuevas"
                  a="/cuenta/notificaciones"
                  tono="azul"
                />
                <TarjetaIndicador
                  icono={FileText}
                  valor={perfil?.cv_ruta ? "Listo" : "Pendiente"}
                  etiqueta="Curriculum"
                  detalle={perfil?.cv_ruta ? "PDF cargado" : "Sube tu CV en PDF"}
                  a="/cuenta/perfil"
                  tono={perfil?.cv_ruta ? "yellow" : "ambar"}
                />
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-blue-950">Completa tu perfil</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Un perfil completo mejora tus posibilidades con las empresas.
                      </p>
                    </div>
                    <span className="font-display text-2xl font-extrabold text-blue-700">
                      {completitud.porcentaje}%
                    </span>
                  </div>
                  <Progress value={completitud.porcentaje} className="mt-4" />
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      "Matricula registrada",
                      "Carrera seleccionada",
                      "Semestre o anio de egreso",
                      "Telefono de contacto",
                      "Habilidades descritas",
                      "Curriculum en PDF",
                    ].map((texto) => {
                      const listo = !completitud.pendientes.includes(texto);
                      return (
                        <li key={texto} className="flex items-center gap-2 text-xs">
                          {listo ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-blue-200" />
                          )}
                          <span className={listo ? "text-blue-800" : "text-muted-foreground"}>
                            {texto}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link to="/cuenta/perfil">
                        Editar mi perfil <ArrowRight />
                      </Link>
                    </Button>
                    {!perfil?.cv_ruta && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/cuenta/perfil">Subir mi CV</Link>
                      </Button>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-blue-950">Ultimas candidaturas</h2>
                    <Link
                      to="/cuenta/postulaciones"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Ver todas
                    </Link>
                  </div>

                  {postulaciones.length === 0 ? (
                    <div className="mt-5 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-5 text-center">
                      <p className="text-sm font-semibold text-blue-900">
                        Aun no te has postulado
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Explora las vacantes activas y envia tu primera candidatura.
                      </p>
                      <Button asChild size="sm" className="mt-3">
                        <Link to="/vacantes">Ver vacantes</Link>
                      </Button>
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {postulaciones.slice(0, 4).map((postulacion) => (
                        <li
                          key={postulacion.id}
                          className="rounded-xl border border-blue-50 bg-blue-50/30 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-blue-950">
                                {postulacion.vacante.titulo}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                {postulacion.vacante.empresa} · {postulacion.vacante.ciudad}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                                colorEstado(postulacion.estado),
                              )}
                            >
                              {postulacion.estado_etiqueta}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            Actualizada {hace(postulacion.fecha_estado)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {recomendadas.length > 0 && (
                <section>
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="etiqueta-ojo">Para ti</p>
                      <h2 className="mt-1 text-xl font-extrabold text-blue-950">
                        Vacantes recientes
                      </h2>
                    </div>
                    <Link
                      to="/vacantes"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Ver todas
                    </Link>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {recomendadas.map((vacante) => (
                      <VacanteCard key={vacante.id} vacante={vacante} compacta />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ---------------- Empresa ---------------- */}
          {usuario.rol === "empresa" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TarjetaIndicador
                  icono={BriefcaseBusiness}
                  valor={tableroEmpresa?.vacantes.total ?? 0}
                  etiqueta="Vacantes"
                  detalle="En todos los estados"
                />
                <TarjetaIndicador
                  icono={CheckCircle2}
                  valor={tableroEmpresa?.vacantes.publicadas ?? 0}
                  etiqueta="Publicadas"
                  detalle="Visibles en el buscador"
                  tono="yellow"
                />
                <TarjetaIndicador
                  icono={CalendarClock}
                  valor={tableroEmpresa?.vacantes.por_estado.en_revision ?? 0}
                  etiqueta="En revision"
                  detalle="Esperando moderacion"
                  tono="ambar"
                />
                <TarjetaIndicador
                  icono={ShieldCheck}
                  valor={tableroEmpresa?.empresa.estatus_validacion ?? "—"}
                  etiqueta="Estatus"
                  detalle="Validacion de Vinculacion"
                  tono={
                    tableroEmpresa?.empresa.estatus_validacion === "aprobada" ? "yellow" : "ambar"
                  }
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
                  <h2 className="text-base font-bold text-blue-950">Tu empresa</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tableroEmpresa?.empresa.razon_social ?? usuario.nombre}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge
                      variant={
                        tableroEmpresa?.empresa.estatus_validacion === "aprobada"
                          ? "yellow"
                          : "suave"
                      }
                    >
                      {tableroEmpresa?.empresa.estatus_validacion ?? "pendiente"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Mantener actualizados tus datos de contacto agiliza la comunicacion con los
                    candidatos.
                  </p>
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/cuenta/perfil">
                      Editar datos <ArrowRight />
                    </Link>
                  </Button>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-800 to-blue-950 p-6 text-white shadow-suave">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-yellow-300">
                    <Sparkles className="h-3.5 w-3.5" /> Siguiente paso
                  </span>
                  <h2 className="mt-3 text-xl font-extrabold">Publica una nueva vacante</h2>
                  <p className="mt-2 text-sm leading-relaxed text-blue-100/80">
                    Captura el perfil estandarizado y envialo a revision. Vinculacion lo revisa
                    antes de publicarlo en el buscador.
                  </p>
                  <p className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-blue-100/80">
                    La gestion de vacantes y candidatos se habilitara en la siguiente entrega del
                    panel. Por ahora puedes consultar tus indicadores aqui.
                  </p>
                </section>
              </div>
            </div>
          )}

          {/* ---------------- Vinculacion / Admin ---------------- */}
          {(usuario.rol === "vinculacion" || usuario.rol === "admin_tecnico") && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TarjetaIndicador
                  icono={BriefcaseBusiness}
                  valor={tableroAdmin?.por_estado_vacante.publicada ?? 0}
                  etiqueta="Vacantes publicadas"
                  detalle={`${tableroAdmin?.moderacion.pendientes ?? 0} por moderar`}
                  tono="yellow"
                />
                <TarjetaIndicador
                  icono={TrendingUp}
                  valor={tableroAdmin?.postulaciones_totales ?? 0}
                  etiqueta="Postulaciones"
                  detalle={`${tableroAdmin?.postulaciones_30_dias ?? 0} en 30 dias`}
                />
                <TarjetaIndicador
                  icono={Building2}
                  valor={tableroAdmin?.empresas_sin_validar ?? 0}
                  etiqueta="Empresas por validar"
                  detalle="Pendientes de revision"
                  tono="ambar"
                />
                <TarjetaIndicador
                  icono={ShieldCheck}
                  valor={tableroAdmin?.reportes_abiertos ?? 0}
                  etiqueta="Reportes abiertos"
                  detalle="Requieren atencion"
                  tono="violeta"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
                  <h2 className="text-base font-bold text-blue-950">Vacantes por estado</h2>
                  <div className="mt-4 space-y-3">
                    {Object.entries(tableroAdmin?.por_estado_vacante ?? {}).map(
                      ([estado, total]) => {
                        const maximo = Math.max(
                          1,
                          ...Object.values(tableroAdmin?.por_estado_vacante ?? {}),
                        );
                        return (
                          <div key={estado} className="flex items-center gap-3">
                            <span className="w-24 shrink-0 text-xs font-semibold capitalize text-blue-800">
                              {estado.replace("_", " ")}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-50">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-yellow-500"
                                style={{ width: `${(Number(total) / maximo) * 100}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs font-bold tabular-nums text-blue-900">
                              {total}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
                  <h2 className="text-base font-bold text-blue-950">Accesos rapidos</h2>
                  <div className="mt-4 space-y-2">
                    <Link
                      to="/vacantes"
                      className="flex items-center gap-3 rounded-xl border border-blue-50 p-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
                    >
                      <BriefcaseBusiness className="h-4 w-4 text-blue-500" /> Buscador publico
                      <ArrowRight className="ml-auto h-4 w-4 text-blue-300" />
                    </Link>
                    {usuario.rol === "admin_tecnico" && (
                      <Link
                        to="/cuenta/usuarios"
                        className="flex items-center gap-3 rounded-xl border border-blue-50 p-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
                      >
                        <Users className="h-4 w-4 text-blue-500" /> Usuarios y roles
                        <ArrowRight className="ml-auto h-4 w-4 text-blue-300" />
                      </Link>
                    )}
                    <Link
                      to="/cuenta/notificaciones"
                      className="flex items-center gap-3 rounded-xl border border-blue-50 p-3 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
                    >
                      <Bell className="h-4 w-4 text-blue-500" /> Notificaciones
                      <ArrowRight className="ml-auto h-4 w-4 text-blue-300" />
                    </Link>
                  </div>
                  <div className="mt-5 rounded-xl bg-blue-50/60 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold text-blue-800">
                      <LayoutDashboard className="h-4 w-4" /> Panel administrativo
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      La bandeja de moderacion, validacion de empresas y reportes se conectara en
                      la siguiente entrega. La API ya expone esos endpoints.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
