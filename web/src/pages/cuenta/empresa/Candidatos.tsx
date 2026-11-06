import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  MessageSquareText,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Aviso } from "@/components/comunes/CampoError";
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
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, descargarArchivo } from "@/lib/api";
import {
  colorEstado,
  etiquetaEstadoPostulacion,
  siguientesEstados,
  fechaHora,
} from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { Candidato, DetalleCandidato, VacanteEmpresa } from "@/lib/tipos";

const ESTADOS = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "recibida", etiqueta: "Recibidas" },
  { valor: "en_revision", etiqueta: "En revision" },
  { valor: "contactado", etiqueta: "Contactados" },
  { valor: "entrevista", etiqueta: "Entrevista" },
  { valor: "contratado", etiqueta: "Contratados" },
  { valor: "rechazado", etiqueta: "Rechazados" },
];

export function Candidatos() {
  const { id } = useParams();
  const vacanteId = Number(id);

  const [vacante, setVacante] = useState<VacanteEmpresa | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState("");
  const [detalle, setDetalle] = useState<DetalleCandidato | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [cambio, setCambio] = useState<{
    candidato: Candidato;
    estado: string;
    notas: string;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [v, c] = await Promise.all([
        api.get<VacanteEmpresa>(`/empresa/vacantes/${vacanteId}`),
        api.get<Candidato[]>(
          `/empresa/vacantes/${vacanteId}/candidatos${estado ? `?estado=${estado}` : ""}`,
        ),
      ]);
      setVacante(v.data);
      setCandidatos(c.data);
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos cargar los candidatos.",
      );
    } finally {
      setCargando(false);
    }
  }, [vacanteId, estado]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirDetalle = async (candidato: Candidato) => {
    setDetalle(null);
    setCargandoDetalle(true);
    try {
      const { data } = await api.get<DetalleCandidato>(`/empresa/candidatos/${candidato.id}`);
      setDetalle(data);
    } catch {
      toast.error("No pudimos cargar la ficha del candidato.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirCambio = (candidato: Candidato) => {
    const opciones = siguientesEstados(candidato.estado);
    if (opciones.length === 0) {
      toast.info("Esta candidatura ya esta en un estado final.");
      return;
    }
    setCambio({ candidato, estado: opciones[0], notas: candidato.notas_empresa ?? "" });
  };

  const confirmarCambio = async () => {
    if (!cambio) return;
    setGuardando(true);
    try {
      await api.put(`/empresa/candidatos/${cambio.candidato.id}/estado`, {
        estado: cambio.estado,
        notas_empresa: cambio.notas.trim() || null,
      });
      toast.success(
        `Candidatura actualizada a ${etiquetaEstadoPostulacion(cambio.estado)}.`,
      );
      setCambio(null);
      await cargar();
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos actualizar el estado.");
    } finally {
      setGuardando(false);
    }
  };

  const descargarCv = async (candidato: Candidato) => {
    try {
      const { data } = await api.get<{ url: string; expira: number }>(
        `/empresa/candidatos/${candidato.id}/cv`,
      );
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos abrir el CV.");
    }
  };

  const exportar = async () => {
    try {
      await descargarArchivo(
        `/empresa/exportar/candidatos?vacante_id=${vacanteId}`,
        `candidatos-vacante-${vacanteId}.csv`,
      );
      toast.success("Archivo CSV descargado.");
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos exportar.");
    }
  };

  if (cargando && !vacante) {
    return (
      <>
        <CabeceraPanel titulo="Candidatos" descripcion="Cargando la vacante..." />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </>
    );
  }

  const opcionesCambio = cambio ? siguientesEstados(cambio.candidato.estado) : [];

  return (
    <>
      <CabeceraPanel
        titulo={vacante?.titulo ?? "Candidatos"}
        descripcion={
          vacante
            ? `${etiquetaEstadoPostulacion(vacante.estado)} · ${vacante.ciudad} · ${candidatos.length} candidato${candidatos.length === 1 ? "" : "s"}`
            : "Candidatos de la vacante."
        }
        accion={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/cuenta/vacantes">
                <ArrowLeft /> Volver
              </Link>
            </Button>
            {candidatos.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => void exportar()}>
                <Download /> Exportar CSV
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          aria-label="Filtrar por estado"
          className="sm:w-64"
        >
          {ESTADOS.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </Select>
        <p className="text-xs font-semibold text-muted-foreground">
          {candidatos.length} candidato{candidatos.length === 1 ? "" : "s"}
        </p>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : candidatos.length === 0 ? (
        <EstadoVacio
          icono={Users}
          titulo={estado ? "Sin candidatos en este estado" : "Aun no hay candidaturas"}
          descripcion={
            estado
              ? "Prueba con otro filtro para ver el resto de los candidatos."
              : "Cuando un alumno se postule a esta vacante, aparecera aqui con su perfil y curriculum."
          }
        />
      ) : (
        <div className="space-y-3">
          {candidatos.map((candidato) => {
            const terminado =
              candidato.estado === "contratado" || candidato.estado === "rechazado";
            return (
              <article
                key={candidato.id}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-suave transition hover:border-blue-300"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          colorEstado(candidato.estado),
                        )}
                      >
                        {candidato.estado_etiqueta}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Postulado {fechaHora(candidato.postulado_en)}
                      </span>
                    </div>

                    <h2 className="mt-2 text-base font-bold text-blue-950">
                      {candidato.alumno}
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{candidato.matricula ?? "Sin matricula"}</span>
                      <span>{candidato.carrera ?? "Sin carrera"}</span>
                      {candidato.semestre && <span>{candidato.semestre}° semestre</span>}
                      {candidato.anio_egreso && <span>Egreso {candidato.anio_egreso}</span>}
                    </div>

                    {candidato.notas_empresa && (
                      <p className="mt-3 rounded-xl bg-blue-50/70 px-3 py-2 text-[11px] leading-relaxed text-blue-800">
                        <strong>Notas:</strong> {candidato.notas_empresa}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => void abrirDetalle(candidato)}>
                      <FileText /> Ver ficha
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void descargarCv(candidato)}>
                      <Download /> CV
                    </Button>
                    {!terminado && (
                      <Button size="sm" onClick={() => abrirCambio(candidato)}>
                        <MessageSquareText /> Cambiar estado
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Ficha del candidato */}
      <Dialog open={Boolean(detalle || cargandoDetalle)} onOpenChange={(abierto) => !abierto && setDetalle(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detalle?.alumno?.nombre ?? "Candidato"}</DialogTitle>
            <DialogDescription>
              {detalle?.vacante.titulo ?? "Cargando..."} · {detalle?.estado_etiqueta}
            </DialogDescription>
          </DialogHeader>

          {cargandoDetalle ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            detalle && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                      Alumno
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-950">
                      {detalle.alumno?.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">{detalle.alumno?.correo}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detalle.alumno?.matricula ?? "Sin matricula"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                      Academico
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-950">
                      {detalle.alumno?.carrera ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {detalle.alumno?.semestre
                        ? `${detalle.alumno.semestre}° semestre`
                        : detalle.alumno?.anio_egreso
                          ? `Egreso ${detalle.alumno.anio_egreso}`
                          : "—"}
                    </p>
                    {detalle.alumno?.telefono && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Tel. {detalle.alumno.telefono}
                      </p>
                    )}
                  </div>
                </div>

                {detalle.alumno?.habilidades && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                      Habilidades
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-blue-900">
                      {detalle.alumno.habilidades}
                    </p>
                  </div>
                )}

                {detalle.mensaje && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                      Mensaje del candidato
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-blue-900">
                      {detalle.mensaje}
                    </p>
                  </div>
                )}

                {detalle.curriculum && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(detalle.curriculum!.url, "_blank", "noopener,noreferrer")}
                  >
                    <Download /> Descargar curriculum (enlace vigente 5 min)
                  </Button>
                )}

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                    Linea de tiempo
                  </p>
                  <ol className="mt-3 space-y-3">
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
                              <span className="h-2.5 w-2.5 rounded-full bg-current" />
                            </span>
                            {!ultimo && <span className="mt-1 h-full w-px bg-blue-100" />}
                          </div>
                          <div className="pb-1">
                            <p className="text-sm font-bold text-blue-950">
                              {evento.estado_etiqueta}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {fechaHora(evento.fecha)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {detalle.sugerencia?.cerrar_vacante && (
                  <Aviso tono="info">{detalle.sugerencia.mensaje}</Aviso>
                )}
              </div>
            )
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalle(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cambio de estado */}
      <Dialog
        open={Boolean(cambio)}
        onOpenChange={(abierto) => !abierto && setCambio(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar estado de la candidatura</DialogTitle>
            <DialogDescription>
              {cambio?.candidato.alumno} · {vacante?.titulo}
            </DialogDescription>
          </DialogHeader>

          {cambio && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-blue-900">Nuevo estado</label>
                <Select
                  value={cambio.estado}
                  onChange={(e) =>
                    setCambio((actual) =>
                      actual ? { ...actual, estado: e.target.value } : actual,
                    )
                  }
                >
                  {opcionesCambio.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {etiquetaEstadoPostulacion(opcion)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-blue-900">
                  Notas privadas (opcional)
                </label>
                <Textarea
                  value={cambio.notas}
                  onChange={(e) =>
                    setCambio((actual) =>
                      actual ? { ...actual, notas: e.target.value } : actual,
                    )
                  }
                  maxLength={600}
                  placeholder="Observaciones internas; el candidato no las ve."
                />
                <p className="text-[11px] text-muted-foreground">
                  {cambio.notas.length}/600
                </p>
              </div>

              <Aviso tono="info">
                El cambio solo avanza. Una vez contratado o rechazado, la
                candidatura queda en estado final.
              </Aviso>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCambio(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmarCambio()} disabled={guardando || opcionesCambio.length === 0}>
              {guardando ? <Loader2 className="animate-spin" /> : null}
              Guardar estado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
