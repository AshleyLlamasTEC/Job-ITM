import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { CabeceraPanel } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { colorEstado, fechaHora, hace, etiquetaModalidad } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { Postulacion } from "@/lib/tipos";

const POR_PAGINA = 10;

export function MisPostulaciones() {
  const [postulaciones, setPostulaciones] = useState<Postulacion[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [detalle, setDetalle] = useState<Postulacion | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [porCancelar, setPorCancelar] = useState<Postulacion | null>(null);

  const cargar = useCallback(async (destino: number) => {
    setCargando(true);
    try {
      const { data, meta } = await api.get<Postulacion[]>(
        `/mis-postulaciones?pagina=${destino}&por_pagina=${POR_PAGINA}`,
      );
      setPostulaciones(data);
      setTotal(Number(meta?.total ?? data.length));
      setPaginas(Number(meta?.paginas ?? 0));
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos cargar tus postulaciones.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(pagina);
  }, [cargar, pagina]);

  const abrirDetalle = async (postulacion: Postulacion) => {
    setDetalle(postulacion);
    setCargandoDetalle(true);
    try {
      const { data } = await api.get<Postulacion>(`/mis-postulaciones/${postulacion.id}`);
      setDetalle(data);
    } catch {
      toast.error("No pudimos cargar el seguimiento de esta candidatura.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cancelar = async () => {
    if (!porCancelar) return;
    setCancelando(porCancelar.id);
    try {
      await api.delete(`/mis-postulaciones/${porCancelar.id}`);
      toast.success("Candidatura cancelada.");
      setPorCancelar(null);
      setDetalle(null);
      await cargar(pagina);
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos cancelar la candidatura.",
      );
    } finally {
      setCancelando(null);
    }
  };

  return (
    <>
      <CabeceraPanel
        titulo="Mis postulaciones"
        descripcion="Da seguimiento al avance de cada proceso de seleccion."
        accion={
          <Button asChild variant="outline">
            <Link to="/vacantes">
              <BriefcaseBusiness /> Buscar vacantes
            </Link>
          </Button>
        }
      />

      {cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : postulaciones.length === 0 ? (
        <EstadoVacio
          icono={BriefcaseBusiness}
          titulo="Aun no tienes postulaciones"
          descripcion="Explora las vacantes activas, revisa las que coincidan con tu carrera y envia tu primera candidatura."
          accion={{ texto: "Ver vacantes", a: "/vacantes" }}
        />
      ) : (
        <>
          <p className="mb-4 text-xs font-semibold text-muted-foreground">
            {total} candidatura{total === 1 ? "" : "s"} en total
          </p>

          <div className="space-y-3">
            {postulaciones.map((postulacion) => {
              const cancelable = postulacion.estado === "recibida";
              return (
                <article
                  key={postulacion.id}
                  className="rounded-2xl border border-blue-100 bg-white p-5 shadow-suave transition hover:border-blue-300"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                            colorEstado(postulacion.estado),
                          )}
                        >
                          {postulacion.estado_etiqueta}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Actualizada {hace(postulacion.fecha_estado)}
                        </span>
                      </div>

                      <h2 className="mt-2 text-base font-bold text-blue-950">
                        {postulacion.vacante.titulo}
                      </h2>
                      <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-semibold text-blue-700">
                          {postulacion.vacante.empresa}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-blue-400" />
                          {postulacion.vacante.ciudad}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5 text-blue-400" />
                          {etiquetaModalidad(postulacion.vacante.modalidad)}
                        </span>
                      </p>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Enviada {fechaHora(postulacion.creado_en)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void abrirDetalle(postulacion)}>
                        Ver seguimiento
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/vacantes/${postulacion.vacante.id}`}>Ver vacante</Link>
                      </Button>
                      {cancelable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setPorCancelar(postulacion)}
                        >
                          <Trash2 /> Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {paginas > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
              >
                <ArrowLeft /> Anterior
              </Button>
              <span className="px-2 text-xs font-semibold text-muted-foreground">
                Pagina {pagina} de {paginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagina >= paginas}
                onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
              >
                Siguiente <ArrowRight />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Seguimiento */}
      <Dialog open={Boolean(detalle)} onOpenChange={(abierto) => !abierto && setDetalle(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Seguimiento de la candidatura</DialogTitle>
            <DialogDescription>
              {detalle?.vacante.titulo} · {detalle?.vacante.empresa}
            </DialogDescription>
          </DialogHeader>

          {cargandoDetalle ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            detalle && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                      colorEstado(detalle.estado),
                    )}
                  >
                    {detalle.estado_etiqueta}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {detalle.vacante.ciudad} · {etiquetaModalidad(detalle.vacante.modalidad)}
                  </span>
                </div>

                {detalle.mensaje && (
                  <div className="rounded-xl bg-blue-50/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                      Tu mensaje
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-blue-900">
                      {detalle.mensaje}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Linea de tiempo
                  </p>
                  <ol className="mt-3 space-y-4">
                    {(detalle.linea_de_tiempo ?? []).map((evento, i, lista) => {
                      const ultimo = i === lista.length - 1;
                      return (
                        <li key={`${evento.estado}-${evento.fecha}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-full",
                                ultimo
                                  ? "bg-blue-800 text-white"
                                  : "bg-blue-50 text-blue-500 ring-1 ring-blue-100",
                              )}
                            >
                              {ultimo ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : (
                                <Circle className="h-3 w-3" />
                              )}
                            </span>
                            {!ultimo && <span className="mt-1 h-full w-px bg-blue-100" />}
                          </div>
                          <div className="pb-1">
                            <p className="text-sm font-bold text-blue-950">
                              {evento.estado_etiqueta}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <CalendarClock className="h-3 w-3" /> {fechaHora(evento.fecha)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                    {(detalle.linea_de_tiempo ?? []).length === 0 && (
                      <li className="text-sm text-muted-foreground">
                        Aun no hay movimientos registrados.
                      </li>
                    )}
                  </ol>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  La empresa es la unica que puede avanzar el estado. Si tienes dudas, contacta
                  directamente al reclutador o a Vinculacion Estudiantil.
                </div>
              </div>
            )
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>
              Cerrar
            </Button>
            {detalle && detalle.estado === "recibida" && (
              <Button
                variant="destructive"
                onClick={() => setPorCancelar(detalle)}
                disabled={cancelando === detalle.id}
              >
                <Trash2 /> Cancelar candidatura
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmacion de cancelacion */}
      <Dialog open={Boolean(porCancelar)} onOpenChange={(abierto) => !abierto && setPorCancelar(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar candidatura</DialogTitle>
            <DialogDescription>
              Vas a cancelar tu postulacion a <strong>{porCancelar?.vacante.titulo}</strong>. Esta
              accion no se puede deshacer y la empresa dejara de ver tu perfil en este proceso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPorCancelar(null)}>
              Conservar
            </Button>
            <Button variant="destructive" onClick={() => void cancelar()} disabled={cancelando !== null}>
              {cancelando !== null ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Si, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
