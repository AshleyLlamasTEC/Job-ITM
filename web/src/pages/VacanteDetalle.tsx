import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Eye,
  Flag,
  Globe,
  Heart,
  Loader2,
  MapPin,
  Send,
  Share2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Aviso } from "@/components/comunes/CampoError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VacanteCard } from "@/components/vacantes/VacanteCard";
import { useAuth } from "@/context/AuthProvider";
import { api, ApiError } from "@/lib/api";
import {
  diasPara,
  etiquetaModalidad,
  etiquetaTipo,
  fecha,
  hace,
  rangoSalario,
} from "@/lib/formato";
import { iniciales } from "@/lib/utils";
import type { PerfilEstudiante, Vacante } from "@/lib/tipos";

const MOTIVOS = [
  { valor: "informacion_falsa", etiqueta: "Informacion falsa" },
  { valor: "duplicada", etiqueta: "Vacante duplicada" },
  { valor: "discriminatoria", etiqueta: "Contenido discriminatorio" },
  { valor: "datos_de_contacto", etiqueta: "Datos de contacto sospechosos" },
  { valor: "otro", etiqueta: "Otro motivo" },
];

export function VacanteDetalle() {
  const { id } = useParams();
  const { usuario, tienePermiso } = useAuth();
  const [vacante, setVacante] = useState<Vacante | null>(null);
  const [similares, setSimilares] = useState<Vacante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [noExiste, setNoExiste] = useState(false);
  const [favorito, setFavorito] = useState(false);

  const [postularAbierto, setPostularAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorPostulacion, setErrorPostulacion] = useState("");
  const [postulado, setPostulado] = useState(false);

  const [reporteAbierto, setReporteAbierto] = useState(false);
  const [motivo, setMotivo] = useState("informacion_falsa");
  const [detalle, setDetalle] = useState("");
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setNoExiste(false);

    api
      .get<Vacante>(`/vacantes/${id}`, { publico: true })
      .then(({ data }) => {
        if (activo) setVacante(data);
        return api.get<Vacante[]>(`/vacantes/${id}/similares`, { publico: true });
      })
      .then((respuesta) => {
        if (activo && respuesta) setSimilares(respuesta.data);
      })
      .catch((error) => {
        if (!activo) return;
        if (error instanceof ApiError && error.estado === 404) setNoExiste(true);
        else toast.error("No pudimos cargar la vacante.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id]);

  useEffect(() => {
    if (!usuario || usuario.rol !== "estudiante") return;
    api
      .get<Array<{ vacante: { id: number } }>>("/favoritos")
      .then(({ data }) => setFavorito(data.some((f) => f.vacante.id === Number(id))))
      .catch(() => undefined);
  }, [usuario, id]);

  const alternarFavorito = async () => {
    if (!vacante) return;
    if (!usuario) {
      toast.info("Inicia sesion para guardar esta vacante.");
      return;
    }
    if (usuario.rol !== "estudiante") return;

    setFavorito((v) => !v);
    try {
      if (favorito) await api.delete(`/favoritos/${vacante.id}`);
      else await api.post("/favoritos", { vacante_id: vacante.id });
      toast.success(favorito ? "Quitada de favoritos." : "Guardada en favoritos.");
    } catch {
      setFavorito((v) => !v);
      toast.error("No pudimos actualizar tus favoritos.");
    }
  };

  const postularse = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!vacante) return;
    setEnviando(true);
    setErrorPostulacion("");
    try {
      await api.post("/postulaciones", {
        vacante_id: vacante.id,
        mensaje: mensaje.trim() || undefined,
      });
      setPostulado(true);
      setPostularAbierto(false);
      toast.success("Tu candidatura se envio. Revisa su avance en Mis postulaciones.");
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrorPostulacion(
          fallo.errores.vacante_id?.[0] ??
            fallo.errores.cv?.[0] ??
            fallo.message,
        );
      } else setErrorPostulacion("No pudimos enviar tu candidatura.");
    } finally {
      setEnviando(false);
    }
  };

  const reportar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!vacante) return;
    setEnviandoReporte(true);
    try {
      await api.post("/reportes", {
        vacante_id: vacante.id,
        motivo,
        detalle: detalle.trim() || undefined,
      });
      toast.success("Reporte enviado. Vinculacion lo revisara.");
      setReporteAbierto(false);
      setDetalle("");
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos enviar el reporte.");
    } finally {
      setEnviandoReporte(false);
    }
  };

  const compartir = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.error("No pudimos copiar el enlace.");
    }
  };

  if (cargando) {
    return (
      <div className="contenedor py-10">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-5 h-10 w-3/4" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (noExiste || !vacante) {
    return (
      <div className="contenedor py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
          <BriefcaseBusiness className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-blue-950">
          Esta vacante ya no esta disponible
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pudo cerrarse, expirar o ser retirada por Vinculacion. Explora otras oportunidades
          activas.
        </p>
        <Button asChild className="mt-6">
          <Link to="/vacantes">
            Ver vacantes <ArrowRight />
          </Link>
        </Button>
      </div>
    );
  }

  const dias = diasPara(vacante.fecha_cierre);
  const sinCv = !(usuario?.perfil as PerfilEstudiante | null)?.cv_ruta;
  const puedePostularse = usuario?.rol === "estudiante";

  return (
    <div className="bg-blue-50/40 pb-16">
      <div className="border-b border-blue-100 bg-white">
        <div className="contenedor py-6">
          <Link
            to="/vacantes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al buscador
          </Link>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-lg font-extrabold text-blue-700 ring-1 ring-blue-100">
                {iniciales(vacante.empresa.nombre)}
              </div>
              <div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="suave">{etiquetaTipo(vacante.tipo)}</Badge>
                  <Badge variant="outline">{etiquetaModalidad(vacante.modalidad)}</Badge>
                  {dias >= 0 && dias <= 7 && <Badge variant="yellow">Cierra en {dias} dias</Badge>}
                </div>
                <h1 className="mt-2 max-w-3xl font-display text-2xl font-extrabold leading-tight tracking-tight text-blue-950 sm:text-3xl">
                  {vacante.titulo}
                </h1>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-semibold text-blue-800">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    {vacante.empresa.nombre}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-blue-400" />
                    {vacante.ciudad}
                    {vacante.estado_geo ? `, ${vacante.estado_geo}` : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-blue-400" /> {vacante.vistas} vistas
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={compartir} aria-label="Compartir">
                <Share2 />
              </Button>
              {puedePostularse && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={alternarFavorito}
                  aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
                  aria-pressed={favorito}
                  className={favorito ? "border-rose-200 text-rose-500" : ""}
                >
                  <Heart className={favorito ? "fill-current" : ""} />
                </Button>
              )}
              {usuario && tienePermiso("reportes.crear") && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setReporteAbierto(true)}
                  aria-label="Reportar vacante"
                >
                  <Flag />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="contenedor grid gap-8 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave sm:p-8">
            <h2 className="text-lg font-bold text-blue-950">Descripcion del puesto</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {vacante.descripcion}
            </p>

            {vacante.actividades && (
              <>
                <h3 className="mt-8 text-base font-bold text-blue-950">Actividades</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {vacante.actividades}
                </p>
              </>
            )}

            <h3 className="mt-8 text-base font-bold text-blue-950">Requisitos</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {vacante.requisitos}
            </p>

            {vacante.carrera && (
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-blue-800">
                  Vacante dirigida a <strong>{vacante.carrera.nombre}</strong> y carreras afines.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-blue-950 text-lg font-extrabold text-yellow-300">
                {iniciales(vacante.empresa.nombre)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-blue-950">{vacante.empresa.nombre}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {vacante.empresa.giro ?? "Empresa verificada por Vinculacion ITM"}
                </p>
                {vacante.empresa.sitio_web && (
                  <a
                    href={vacante.empresa.sitio_web}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> {vacante.empresa.sitio_web}
                  </a>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Esta empresa fue validada por Vinculacion Estudiantil. Si detectas informacion
              sospechosa, usa el boton de reporte.
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          <div className="sticky top-24 space-y-5">
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-suave">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
                Salario mensual
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-blue-950">
                {rangoSalario(vacante.salario)}
              </p>

              <div className="mt-5 space-y-3 border-t border-blue-50 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 text-blue-400" /> Ubicacion
                  </span>
                  <span className="font-semibold text-blue-900">{vacante.ciudad}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <BriefcaseBusiness className="h-4 w-4 text-blue-400" /> Tipo
                  </span>
                  <span className="font-semibold text-blue-900">
                    {etiquetaTipo(vacante.tipo)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4 text-blue-400" /> Modalidad
                  </span>
                  <span className="font-semibold text-blue-900">
                    {etiquetaModalidad(vacante.modalidad)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-4 w-4 text-blue-400" /> Cierre
                  </span>
                  <span className="font-semibold text-blue-900">
                    {fecha(vacante.fecha_cierre)}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                {postulado ? (
                  <Aviso tono="exito">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Ya enviaste tu candidatura.
                    </span>
                    <Link
                      to="/cuenta/postulaciones"
                      className="mt-2 inline-flex items-center gap-1 font-semibold underline"
                    >
                      Ver mis postulaciones <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Aviso>
                ) : puedePostularse ? (
                  <>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => setPostularAbierto(true)}
                    >
                      <Send /> Postularme
                    </Button>
                    {sinCv && (
                      <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Aun no subes tu CV.{" "}
                        <Link to="/cuenta/perfil" className="font-semibold underline">
                          Subelo aqui
                        </Link>{" "}
                        antes de postularte.
                      </p>
                    )}
                  </>
                ) : usuario ? (
                  <p className="rounded-xl bg-blue-50 p-3 text-center text-xs text-muted-foreground">
                    Solo las cuentas de alumno pueden postularse a vacantes.
                  </p>
                ) : (
                  <>
                    <Button asChild className="w-full" size="lg">
                      <Link to={`/login?redirect=/vacantes/${vacante.id}`}>
                        Inicia sesion para postularte
                      </Link>
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">
                      ¿No tienes cuenta?{" "}
                      <Link to="/registro" className="font-semibold text-blue-700 hover:underline">
                        Registrate gratis
                      </Link>
                    </p>
                  </>
                )}
              </div>

              <p className="mt-4 text-center text-[10px] text-muted-foreground">
                Publicada {hace(vacante.publicada_en)} · {dias >= 0 ? `${dias} dias para postularte` : "Fecha de cierre vencida"}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
              <p className="flex items-center gap-2 text-xs font-bold text-blue-800">
                <BadgeCheck className="h-4 w-4 text-blue-600" /> Proceso seguro
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Tu curriculum solo lo ven la empresa destinataria y Vinculacion. Nunca compartas
                datos bancarios ni pagues por una vacante.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {similares.length > 0 && (
        <section className="contenedor">
          <div className="flex items-end justify-between">
            <div>
              <p className="etiqueta-ojo">Tambien te puede interesar</p>
              <h2 className="mt-1 text-2xl font-extrabold text-blue-950">Vacantes similares</h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/vacantes">
                Ver todas <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similares.slice(0, 3).map((similar) => (
              <VacanteCard key={similar.id} vacante={similar} />
            ))}
          </div>
        </section>
      )}

      {/* Dialogo de postulacion */}
      <Dialog open={postularAbierto} onOpenChange={setPostularAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postularte a esta vacante</DialogTitle>
            <DialogDescription>
              Se enviara una copia de tu curriculum y tu perfil a {vacante.empresa.nombre}. Puedes
              acompanar el proceso desde Mis postulaciones.
            </DialogDescription>
          </DialogHeader>

          {sinCv ? (
            <Aviso tono="info">
              Antes de postularte necesitas subir tu CV en PDF.{" "}
              <Link to="/cuenta/perfil" className="font-semibold underline">
                Ir a mi perfil
              </Link>
            </Aviso>
          ) : (
            <form onSubmit={postularse} className="space-y-4">
              {errorPostulacion && <Aviso tono="error">{errorPostulacion}</Aviso>}
              <div className="space-y-1.5">
                <Label htmlFor="mensaje">Mensaje para la empresa (opcional)</Label>
                <Textarea
                  id="mensaje"
                  value={mensaje}
                  maxLength={600}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Cuentales por que te interesa la vacante y que puedes aportar."
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {mensaje.length}/600
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                <p className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Se adjuntara tu CV actual
                </p>
                <p className="mt-1 text-muted-foreground">
                  Si lo actualizas despues, esta candidatura conserva la version enviada.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPostularAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando}>
                  {enviando ? <Loader2 className="animate-spin" /> : <Send />}
                  Enviar candidatura
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogo de reporte */}
      <Dialog open={reporteAbierto} onOpenChange={setReporteAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar esta vacante</DialogTitle>
            <DialogDescription>
              Vinculacion revisara el reporte. Los reportes son confidenciales.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={reportar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="motivo">Motivo</Label>
              <Select id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="detalle">Detalle (opcional)</Label>
              <Textarea
                id="detalle"
                value={detalle}
                maxLength={600}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Describe lo que encontraste."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReporteAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={enviandoReporte}>
                {enviandoReporte ? <Loader2 className="animate-spin" /> : <Flag />}
                Enviar reporte
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
