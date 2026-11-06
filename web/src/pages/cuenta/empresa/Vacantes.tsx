import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  Eye,
  Loader2,
  MapPin,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Aviso, CampoError } from "@/components/comunes/CampoError";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import {
  colorEstadoVacante,
  etiquetaEstadoVacante,
  etiquetaModalidad,
  etiquetaTipo,
  fecha,
} from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { Catalogo, VacanteEmpresa } from "@/lib/tipos";

const ESTADOS = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "borrador", etiqueta: "Borradores" },
  { valor: "en_revision", etiqueta: "En revision" },
  { valor: "publicada", etiqueta: "Publicadas" },
  { valor: "pausada", etiqueta: "Pausadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "cerrada", etiqueta: "Cerradas" },
  { valor: "expirada", etiqueta: "Expiradas" },
];

const TIPOS = [
  { valor: "practicas", etiqueta: "Practicas profesionales" },
  { valor: "servicio_social", etiqueta: "Servicio social" },
  { valor: "servicios_profesionales", etiqueta: "Servicios profesionales" },
  { valor: "temporal", etiqueta: "Empleo temporal" },
  { valor: "planta", etiqueta: "Empleo de planta" },
];

const MODALIDADES = [
  { valor: "presencial", etiqueta: "Presencial" },
  { valor: "hibrida", etiqueta: "Hibrida" },
  { valor: "remota", etiqueta: "Remota" },
];

interface Borrador {
  titulo: string;
  carrera_id: string;
  tipo: string;
  modalidad: string;
  ciudad: string;
  estado_geo: string;
  fecha_cierre: string;
  salario_min: string;
  salario_max: string;
  mostrar_salario: boolean;
  descripcion: string;
  requisitos: string;
  actividades: string;
}

function fechaEnMes(dias: number): string {
  return new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
}

const BORRADOR_VACIO: Borrador = {
  titulo: "",
  carrera_id: "",
  tipo: "planta",
  modalidad: "presencial",
  ciudad: "Mexicali",
  estado_geo: "Baja California",
  fecha_cierre: fechaEnMes(30),
  salario_min: "",
  salario_max: "",
  mostrar_salario: true,
  descripcion: "",
  requisitos: "",
  actividades: "",
};

function aBorrador(vacante: VacanteEmpresa): Borrador {
  return {
    titulo: vacante.titulo ?? "",
    carrera_id: vacante.carrera_id ? String(vacante.carrera_id) : "",
    tipo: vacante.tipo ?? "planta",
    modalidad: vacante.modalidad ?? "presencial",
    ciudad: vacante.ciudad ?? "",
    estado_geo: vacante.estado_geo ?? "",
    fecha_cierre: vacante.fecha_cierre ? String(vacante.fecha_cierre).slice(0, 10) : "",
    salario_min: vacante.salario_min === null ? "" : String(vacante.salario_min),
    salario_max: vacante.salario_max === null ? "" : String(vacante.salario_max),
    mostrar_salario: Boolean(vacante.mostrar_salario),
    descripcion: vacante.descripcion ?? "",
    requisitos: vacante.requisitos ?? "",
    actividades: vacante.actividades ?? "",
  };
}

export function MisVacantes() {
  const [vacantes, setVacantes] = useState<VacanteEmpresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [estado, setEstado] = useState("");
  const [editor, setEditor] = useState<{ vacante: VacanteEmpresa | null; soloLectura: boolean } | null>(
    null,
  );
  const [confirmacion, setConfirmacion] = useState<{
    accion: "cerrar" | "eliminar";
    vacante: VacanteEmpresa;
  } | null>(null);
  const [procesando, setProcesando] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get<VacanteEmpresa[]>("/empresa/vacantes");
      setVacantes(data);
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos cargar tus vacantes.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = async (accion: "enviar" | "pausar" | "reactivar" | "cerrar" | "eliminar", vacante: VacanteEmpresa) => {
    setProcesando(vacante.id);
    try {
      if (accion === "eliminar") await api.delete(`/empresa/vacantes/${vacante.id}`);
      else await api.post(`/empresa/vacantes/${vacante.id}/${accion}`);

      const mensajes: Record<typeof accion, string> = {
        enviar: "Vacante enviada a revision.",
        pausar: "Vacante pausada; ya no aparece en el buscador.",
        reactivar: "Vacante publicada de nuevo.",
        cerrar: "Vacante cerrada. Ya no recibe postulaciones.",
        eliminar: "Borrador eliminado.",
      };
      toast.success(mensajes[accion]);
      setConfirmacion(null);
      await cargar();
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos completar la accion.");
    } finally {
      setProcesando(null);
    }
  };

  const totalPostulaciones = vacantes.reduce((suma, v) => suma + Number(v.postulaciones ?? 0), 0);
  const publicadas = vacantes.filter((v) => v.estado === "publicada").length;
  const visibles = estado ? vacantes.filter((v) => v.estado === estado) : vacantes;

  return (
    <>
      <CabeceraPanel
        titulo="Mis vacantes"
        descripcion="Publica oportunidades, da seguimiento a la moderacion y revisa a tus candidatos."
        accion={
          <Button onClick={() => setEditor({ vacante: null, soloLectura: false })}>
            <Plus /> Nueva vacante
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-suave">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Vacantes</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-950">{vacantes.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-suave">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Publicadas</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-950">{publicadas}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-suave">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">
            Postulaciones recibidas
          </p>
          <p className="mt-1 text-2xl font-extrabold text-blue-950">{totalPostulaciones}</p>
        </div>
      </div>

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
          {visibles.length} vacante{visibles.length === 1 ? "" : "s"}
        </p>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <EstadoVacio
          icono={BriefcaseBusiness}
          titulo={estado ? "Sin vacantes en este estado" : "Aun no publicas vacantes"}
          descripcion={
            estado
              ? "Prueba con otro filtro o revisa todas tus vacantes."
              : "Crea tu primera oportunidad: describe el puesto, los requisitos y la fecha de cierre."
          }
        />
      ) : (
        <div className="space-y-3">
          {visibles.map((vacante) => {
            const editable = vacante.estado === "borrador" || vacante.estado === "rechazada";
            const conCandidatos = ["publicada", "pausada", "cerrada", "expirada"].includes(
              vacante.estado,
            );

            return (
              <article
                key={vacante.id}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-suave transition hover:border-blue-300"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          colorEstadoVacante(vacante.estado),
                        )}
                      >
                        {etiquetaEstadoVacante(vacante.estado)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {etiquetaTipo(vacante.tipo)} · {etiquetaModalidad(vacante.modalidad)}
                      </span>
                    </div>

                    <h2 className="mt-2 text-base font-bold text-blue-950">{vacante.titulo}</h2>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-400" />
                        {vacante.ciudad}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-blue-400" />
                        {vacante.postulaciones ?? 0} postulacion
                        {(vacante.postulaciones ?? 0) === 1 ? "" : "es"}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5 text-blue-400" />
                        Cierre {fecha(vacante.fecha_cierre)}
                      </span>
                      {vacante.vistas > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 text-blue-400" />
                          {vacante.vistas} vistas
                        </span>
                      )}
                    </div>

                    {vacante.estado === "rechazada" && vacante.motivo_rechazo && (
                      <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-700">
                        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          <strong>Motivo del rechazo:</strong> {vacante.motivo_rechazo}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {conCandidatos && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/cuenta/vacantes/${vacante.id}/candidatos`}>
                          <Users /> Candidatos
                        </Link>
                      </Button>
                    )}

                    {editable && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditor({ vacante, soloLectura: false })}
                        >
                          <Pencil /> Editar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void ejecutar("enviar", vacante)}
                          disabled={procesando === vacante.id}
                        >
                          {procesando === vacante.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Send />
                          )}
                          Enviar
                        </Button>
                        {vacante.estado === "borrador" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => setConfirmacion({ accion: "eliminar", vacante })}
                          >
                            <Trash2 /> Eliminar
                          </Button>
                        )}
                      </>
                    )}

                    {vacante.estado === "en_revision" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditor({ vacante, soloLectura: true })}
                      >
                        <Eye /> Ver
                      </Button>
                    )}

                    {vacante.estado === "publicada" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void ejecutar("pausar", vacante)}
                        disabled={procesando === vacante.id}
                      >
                        <Pause /> Pausar
                      </Button>
                    )}

                    {vacante.estado === "pausada" && (
                      <Button
                        size="sm"
                        onClick={() => void ejecutar("reactivar", vacante)}
                        disabled={procesando === vacante.id}
                      >
                        <Play /> Reactivar
                      </Button>
                    )}

                    {(vacante.estado === "publicada" || vacante.estado === "pausada") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => setConfirmacion({ accion: "cerrar", vacante })}
                      >
                        <XCircle /> Cerrar
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editor && (
        <EditorVacante
          vacante={editor.vacante}
          soloLectura={editor.soloLectura}
          onCerrar={() => setEditor(null)}
          onGuardado={async () => {
            setEditor(null);
            await cargar();
          }}
        />
      )}

      <Dialog
        open={Boolean(confirmacion)}
        onOpenChange={(abierto) => !abierto && setConfirmacion(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmacion?.accion === "eliminar" ? "Eliminar borrador" : "Cerrar vacante"}
            </DialogTitle>
            <DialogDescription>
              {confirmacion?.accion === "eliminar"
                ? `Se eliminara el borrador "${confirmacion?.vacante.titulo}". Esta accion no se puede deshacer.`
                : `Vas a cerrar "${confirmacion?.vacante.titulo}". Dejara de recibir postulaciones y no se puede reabrir.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmacion(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={procesando !== null}
              onClick={() => {
                if (confirmacion) void ejecutar(confirmacion.accion, confirmacion.vacante);
              }}
            >
              {procesando !== null ? (
                <Loader2 className="animate-spin" />
              ) : confirmacion?.accion === "eliminar" ? (
                <Trash2 />
              ) : (
                <XCircle />
              )}
              {confirmacion?.accion === "eliminar" ? "Si, eliminar" : "Si, cerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* --------------------------------------------------------------- formulario */

function EditorVacante({
  vacante,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  vacante: VacanteEmpresa | null;
  soloLectura: boolean;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [formulario, setFormulario] = useState<Borrador>(
    vacante ? aBorrador(vacante) : { ...BORRADOR_VACIO },
  );
  const [carreras, setCarreras] = useState<Catalogo[]>([]);
  const [errores, setErrores] = useState<Record<string, string[]>>({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api
      .get<Catalogo[]>("/catalogos/carreras", { publico: true })
      .then(({ data }) => setCarreras(data))
      .catch(() => undefined);
  }, []);

  const cambiar = <C extends keyof Borrador>(campo: C, valor: Borrador[C]) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

  const err = (campo: string) => errores[campo]?.[0];

  const guardar = async (enviar: boolean) => {
    setErrores({});
    setErrorGeneral("");
    setGuardando(true);

    const datos = {
      titulo: formulario.titulo.trim(),
      descripcion: formulario.descripcion.trim(),
      requisitos: formulario.requisitos.trim(),
      actividades: formulario.actividades.trim() || null,
      tipo: formulario.tipo,
      modalidad: formulario.modalidad,
      ciudad: formulario.ciudad.trim(),
      estado_geo: formulario.estado_geo.trim() || null,
      carrera_id: formulario.carrera_id ? Number(formulario.carrera_id) : null,
      salario_min: formulario.salario_min ? Number(formulario.salario_min) : null,
      salario_max: formulario.salario_max ? Number(formulario.salario_max) : null,
      mostrar_salario: formulario.mostrar_salario,
      fecha_cierre: formulario.fecha_cierre || null,
    };

    try {
      if (vacante) {
        await api.put(`/empresa/vacantes/${vacante.id}`, datos);
        if (enviar) await api.post(`/empresa/vacantes/${vacante.id}/enviar`);
        toast.success(enviar ? "Vacante enviada a revision." : "Cambios guardados.");
        await onGuardado();
      } else {
        const { data } = await api.post<VacanteEmpresa>("/empresa/vacantes", datos);
        if (enviar) {
          try {
            await api.post(`/empresa/vacantes/${data.id}/enviar`);
            toast.success("Vacante enviada a revision.");
          } catch (fallo) {
            toast.error(
              `El borrador se guardo, pero no se pudo enviar: ${
                fallo instanceof ApiError ? fallo.message : "intenta de nuevo"
              }`,
            );
          }
        } else {
          toast.success("Borrador guardado.");
        }
        await onGuardado();
      }
    } catch (fallo) {
      if (fallo instanceof ApiError) {
        setErrores(fallo.errores);
        setErrorGeneral(fallo.message);
      } else {
        setErrorGeneral("No pudimos guardar la vacante.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const enviarFormulario = (evento: FormEvent) => {
    evento.preventDefault();
    void guardar(false);
  };

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {soloLectura ? "Detalle de la vacante" : vacante ? "Editar vacante" : "Nueva vacante"}
          </DialogTitle>
          <DialogDescription>
            {soloLectura
              ? "La vacante esta en revision por Vinculacion y no se puede editar por ahora."
              : "Los cambios se guardan como borrador; despues los envias a revision."}
          </DialogDescription>
        </DialogHeader>

        {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}

        <form onSubmit={enviarFormulario} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="v-titulo">Titulo del puesto</Label>
              <Input
                id="v-titulo"
                value={formulario.titulo}
                onChange={(e) => cambiar("titulo", e.target.value)}
                maxLength={140}
                disabled={soloLectura}
                placeholder="Practicante de Recursos Humanos"
              />
              <CampoError>{err("titulo")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-tipo">Tipo de contratacion</Label>
              <Select
                id="v-tipo"
                value={formulario.tipo}
                onChange={(e) => cambiar("tipo", e.target.value)}
                disabled={soloLectura}
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.etiqueta}
                  </option>
                ))}
              </Select>
              <CampoError>{err("tipo")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-modalidad">Modalidad</Label>
              <Select
                id="v-modalidad"
                value={formulario.modalidad}
                onChange={(e) => cambiar("modalidad", e.target.value)}
                disabled={soloLectura}
              >
                {MODALIDADES.map((modalidad) => (
                  <option key={modalidad.valor} value={modalidad.valor}>
                    {modalidad.etiqueta}
                  </option>
                ))}
              </Select>
              <CampoError>{err("modalidad")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-carrera">Carrera dirigida</Label>
              <Select
                id="v-carrera"
                value={formulario.carrera_id}
                onChange={(e) => cambiar("carrera_id", e.target.value)}
                disabled={soloLectura}
              >
                <option value="">Todas las carreras</option>
                {carreras.map((carrera) => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.nombre}
                  </option>
                ))}
              </Select>
              <CampoError>{err("carrera_id")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-cierre">Fecha de cierre</Label>
              <Input
                id="v-cierre"
                type="date"
                value={formulario.fecha_cierre}
                onChange={(e) => cambiar("fecha_cierre", e.target.value)}
                disabled={soloLectura}
              />
              <CampoError>{err("fecha_cierre")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-ciudad">Ciudad</Label>
              <Input
                id="v-ciudad"
                value={formulario.ciudad}
                onChange={(e) => cambiar("ciudad", e.target.value)}
                maxLength={80}
                disabled={soloLectura}
              />
              <CampoError>{err("ciudad")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-estado">Estado</Label>
              <Input
                id="v-estado"
                value={formulario.estado_geo}
                onChange={(e) => cambiar("estado_geo", e.target.value)}
                maxLength={80}
                disabled={soloLectura}
              />
              <CampoError>{err("estado_geo")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-salario-min">Salario minimo (MXN)</Label>
              <Input
                id="v-salario-min"
                type="number"
                min={0}
                inputMode="numeric"
                value={formulario.salario_min}
                onChange={(e) => cambiar("salario_min", e.target.value)}
                disabled={soloLectura}
                placeholder="18000"
              />
              <CampoError>{err("salario_min")}</CampoError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-salario-max">Salario maximo (MXN)</Label>
              <Input
                id="v-salario-max"
                type="number"
                min={0}
                inputMode="numeric"
                value={formulario.salario_max}
                onChange={(e) => cambiar("salario_max", e.target.value)}
                disabled={soloLectura}
                placeholder="26000"
              />
              <CampoError>{err("salario_max")}</CampoError>
            </div>

            <label className="flex items-center gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 px-3.5 py-3 text-sm font-medium text-blue-900 sm:col-span-2">
              <input
                type="checkbox"
                checked={formulario.mostrar_salario}
                onChange={(e) => cambiar("mostrar_salario", e.target.checked)}
                disabled={soloLectura}
                className="h-4 w-4 rounded border-blue-300 text-blue-700 focus:ring-blue-500"
              />
              Mostrar el salario en la publicacion
            </label>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="v-descripcion">Descripcion del puesto</Label>
              <Textarea
                id="v-descripcion"
                value={formulario.descripcion}
                onChange={(e) => cambiar("descripcion", e.target.value)}
                maxLength={5000}
                disabled={soloLectura}
                placeholder="Actividades principales, area y condiciones del puesto."
              />
              <CampoError>{err("descripcion")}</CampoError>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="v-requisitos">Requisitos</Label>
              <Textarea
                id="v-requisitos"
                value={formulario.requisitos}
                onChange={(e) => cambiar("requisitos", e.target.value)}
                maxLength={5000}
                disabled={soloLectura}
                placeholder="Carrera, semestre, conocimientos y experiencia necesaria."
              />
              <CampoError>{err("requisitos")}</CampoError>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="v-actividades">Actividades (opcional)</Label>
              <Textarea
                id="v-actividades"
                value={formulario.actividades}
                onChange={(e) => cambiar("actividades", e.target.value)}
                maxLength={5000}
                disabled={soloLectura}
                placeholder="Detalle adicional de las tareas del dia a dia."
              />
              <CampoError>{err("actividades")}</CampoError>
            </div>
          </div>

          <Separator />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              {soloLectura ? "Cerrar" : "Cancelar"}
            </Button>
            {!soloLectura && (
              <>
                <Button type="submit" variant="outline" disabled={guardando}>
                  {guardando ? <Loader2 className="animate-spin" /> : null}
                  Guardar borrador
                </Button>
                <Button
                  type="button"
                  onClick={() => void guardar(true)}
                  disabled={guardando}
                >
                  {guardando ? <Loader2 className="animate-spin" /> : <Send />}
                  Guardar y enviar
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
