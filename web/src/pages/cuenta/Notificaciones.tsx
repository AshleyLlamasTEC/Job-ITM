import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CheckCheck,
  ChevronRight,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { CabeceraPanel } from "@/components/layout/UserLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { avisarNotificaciones } from "@/hooks/useSinLeer";
import { api, ApiError } from "@/lib/api";
import { fechaHora, hace } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { Notificacion } from "@/lib/tipos";

const ICONOS: Record<string, typeof Bell> = {
  postulacion: BriefcaseBusiness,
  vacante: BriefcaseBusiness,
  empresa: Building2,
  cuenta: ShieldCheck,
  sistema: Mail,
  moderacion: ShieldCheck,
};

function iconoDe(tipo: string) {
  return ICONOS[tipo] ?? BellRing;
}

export function Notificaciones() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "sin_leer">("todas");
  const [marcando, setMarcando] = useState<number | null>(null);
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data, meta } = await api.get<Notificacion[]>("/notificaciones");
      setNotificaciones(data);
      setSinLeer(Number(meta?.sin_leer ?? 0));
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos cargar tus notificaciones.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const marcarLeida = async (notificacion: Notificacion) => {
    if (notificacion.leida) return;
    setMarcando(notificacion.id);
    try {
      const { data } = await api.put<{ leida: boolean; sin_leer: number }>(
        `/notificaciones/${notificacion.id}/leida`,
      );
      setNotificaciones((actual) =>
        actual.map((n) =>
          n.id === notificacion.id
            ? { ...n, leida: true, leida_en: new Date().toISOString() }
            : n,
        ),
      );
      setSinLeer(data.sin_leer);
      avisarNotificaciones();
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos marcar la notificacion.",
      );
    } finally {
      setMarcando(null);
    }
  };

  const marcarTodas = async () => {
    const pendientes = notificaciones.filter((n) => !n.leida);
    if (pendientes.length === 0) return;
    setMarcandoTodas(true);
    try {
      await Promise.all(
        pendientes.map((n) => api.put(`/notificaciones/${n.id}/leida`)),
      );
      setNotificaciones((actual) =>
        actual.map((n) => ({ ...n, leida: true, leida_en: n.leida_en ?? new Date().toISOString() })),
      );
      setSinLeer(0);
      avisarNotificaciones();
      toast.success("Todas las notificaciones quedaron como leidas.");
    } catch {
      toast.error("No pudimos marcar todas las notificaciones.");
      await cargar();
    } finally {
      setMarcandoTodas(false);
    }
  };

  const visibles = filtro === "sin_leer" ? notificaciones.filter((n) => !n.leida) : notificaciones;

  return (
    <>
      <CabeceraPanel
        titulo="Notificaciones"
        descripcion="Avisos de postulaciones, vacantes y movimientos de tu cuenta."
        accion={
          sinLeer > 0 ? (
            <Button variant="outline" onClick={() => void marcarTodas()} disabled={marcandoTodas}>
              {marcandoTodas ? <Loader2 className="animate-spin" /> : <CheckCheck />}
              Marcar todas como leidas
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as "todas" | "sin_leer")}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="sin_leer">
              Sin leer
              {sinLeer > 0 && <Badge variant="destructivo">{sinLeer}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="hidden text-xs font-semibold text-muted-foreground sm:block">
          {notificaciones.length} aviso{notificaciones.length === 1 ? "" : "s"}
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
          icono={filtro === "sin_leer" ? CheckCheck : Bell}
          titulo={filtro === "sin_leer" ? "No tienes avisos pendientes" : "Sin notificaciones"}
          descripcion={
            filtro === "sin_leer"
              ? "Ya revisaste todo. Te avisaremos cuando haya movimiento en tus procesos."
              : "Cuando una empresa revise tu candidatura o cambie el estado de una vacante, lo veras aqui."
          }
          accion={{ texto: "Volver al panel", a: "/cuenta" }}
        />
      ) : (
        <div className="space-y-2.5">
          {visibles.map((notificacion) => {
            const Icono = iconoDe(notificacion.tipo);
            const contenido = (
              <div
                className={cn(
                  "flex gap-3.5 rounded-2xl border p-4 transition sm:p-5",
                  notificacion.leida
                    ? "border-blue-100 bg-white"
                    : "border-blue-200 bg-blue-50/70 shadow-suave",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
                    notificacion.leida
                      ? "bg-blue-50 text-blue-500 ring-blue-100"
                      : "bg-blue-800 text-yellow-300 ring-blue-800",
                  )}
                >
                  <Icono className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm",
                        notificacion.leida
                          ? "font-semibold text-blue-900"
                          : "font-bold text-blue-950",
                      )}
                    >
                      {notificacion.titulo}
                    </p>
                    {!notificacion.leida && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {notificacion.mensaje}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {hace(notificacion.creado_en)} · {fechaHora(notificacion.creado_en)}
                  </p>
                </div>

                {notificacion.url && (
                  <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-blue-300" />
                )}
              </div>
            );

            return (
              <div key={notificacion.id} className="relative">
                {notificacion.url ? (
                  <Link
                    to={notificacion.url}
                    onClick={() => void marcarLeida(notificacion)}
                    className="block"
                  >
                    {contenido}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void marcarLeida(notificacion)}
                    className="block w-full text-left"
                  >
                    {contenido}
                  </button>
                )}

                {!notificacion.leida && (
                  <button
                    type="button"
                    onClick={() => void marcarLeida(notificacion)}
                    disabled={marcando === notificacion.id}
                    className="absolute bottom-3 right-4 text-[11px] font-semibold text-blue-600 hover:underline disabled:opacity-50"
                  >
                    {marcando === notificacion.id ? "Marcando..." : "Marcar como leida"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
