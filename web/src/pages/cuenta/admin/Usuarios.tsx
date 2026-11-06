import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { CabeceraPanel } from "@/components/layout/UserLayout";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthProvider";
import { api, ApiError } from "@/lib/api";
import { etiquetaRol, fecha, hace } from "@/lib/formato";
import { cn, iniciales } from "@/lib/utils";
import type { Rol, UsuarioAdmin } from "@/lib/tipos";

const ROLES: Rol[] = ["estudiante", "empresa", "vinculacion", "admin_tecnico"];
const ESTADOS = [
  { valor: "", etiqueta: "Todos los estados" },
  { valor: "activo", etiqueta: "Activos" },
  { valor: "suspendido", etiqueta: "Suspendidos" },
];

const POR_PAGINA = 12;

export function UsuariosAdmin() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [rol, setRol] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [seleccionado, setSeleccionado] = useState<UsuarioAdmin | null>(null);
  const [nuevoRol, setNuevoRol] = useState<Rol>("estudiante");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        por_pagina: String(POR_PAGINA),
      });
      if (rol) parametros.set("rol", rol);
      if (estado) parametros.set("estado", estado);

      const { data, meta } = await api.get<UsuarioAdmin[]>(
        `/admin/usuarios?${parametros.toString()}`,
      );
      setUsuarios(data);
      setTotal(Number(meta?.total ?? data.length));
      setPaginas(Number(meta?.paginas ?? 0));
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos cargar los usuarios.",
      );
    } finally {
      setCargando(false);
    }
  }, [pagina, rol, estado]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirCambioRol = (fila: UsuarioAdmin) => {
    setSeleccionado(fila);
    setNuevoRol(fila.rol);
  };

  const cambiarRol = async () => {
    if (!seleccionado) return;
    if (nuevoRol === seleccionado.rol) {
      setSeleccionado(null);
      return;
    }
    setGuardando(true);
    try {
      await api.put(`/admin/usuarios/${seleccionado.id}/rol`, { rol: nuevoRol });
      toast.success(
        `Rol de ${seleccionado.nombre.split(" ")[0]} actualizado a ${etiquetaRol(nuevoRol)}.`,
      );
      setSeleccionado(null);
      await cargar();
    } catch (fallo) {
      toast.error(fallo instanceof ApiError ? fallo.message : "No pudimos cambiar el rol.");
    } finally {
      setGuardando(false);
    }
  };

  const visibles = busqueda.trim()
    ? usuarios.filter((fila) => {
        const texto = busqueda.trim().toLowerCase();
        return (
          fila.nombre.toLowerCase().includes(texto) ||
          fila.correo.toLowerCase().includes(texto)
        );
      })
    : usuarios;

  const limpiarFiltros = () => {
    setRol("");
    setEstado("");
    setBusqueda("");
    setPagina(1);
  };

  const hayFiltros = Boolean(rol || estado || busqueda.trim());

  return (
    <>
      <CabeceraPanel
        titulo="Usuarios del sistema"
        descripcion="Consulta las cuentas registradas y ajusta sus roles de acceso."
      />

      <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-suave sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o correo"
              className="pl-10"
              aria-label="Buscar usuario"
            />
          </div>

          <Select
            value={rol}
            onChange={(e) => {
              setRol(e.target.value);
              setPagina(1);
            }}
            aria-label="Filtrar por rol"
          >
            <option value="">Todos los roles</option>
            {ROLES.map((valor) => (
              <option key={valor} value={valor}>
                {etiquetaRol(valor)}
              </option>
            ))}
          </Select>

          <Select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPagina(1);
            }}
            aria-label="Filtrar por estado"
          >
            {ESTADOS.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </Select>

          <Button variant="outline" onClick={limpiarFiltros} disabled={!hayFiltros}>
            Limpiar
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {cargando
            ? "Consultando cuentas..."
            : `${total} cuenta${total === 1 ? "" : "s"}${hayFiltros ? " con los filtros aplicados" : " registradas"}`}
        </p>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-suave">
        {cargando ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : visibles.length === 0 ? (
          <div className="p-4">
            <EstadoVacio
              icono={Users}
              titulo="No encontramos cuentas"
              descripcion="Ajusta los filtros o limpia la busqueda para ver todos los usuarios registrados."
            />
          </div>
        ) : (
          <>
            {/* Tabla en escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/60 text-[11px] uppercase tracking-wider text-blue-600">
                    <th className="px-5 py-3 font-bold">Usuario</th>
                    <th className="px-5 py-3 font-bold">Rol</th>
                    <th className="px-5 py-3 font-bold">Estado</th>
                    <th className="px-5 py-3 font-bold">Ultimo acceso</th>
                    <th className="px-5 py-3 font-bold">Alta</th>
                    <th className="px-5 py-3 text-right font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((fila) => {
                    const esYo = fila.id === usuario?.id;
                    return (
                      <tr
                        key={fila.id}
                        className="border-b border-blue-50 transition last:border-0 hover:bg-blue-50/30"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-extrabold text-blue-800">
                              {iniciales(fila.nombre)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-blue-950">
                                {fila.nombre}
                                {esYo && (
                                  <span className="ml-1.5 text-[10px] font-bold text-blue-500">
                                    (tu cuenta)
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">{fila.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant="suave">{etiquetaRol(fila.rol)}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                              fila.estado === "activo"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-rose-200 bg-rose-50 text-rose-700",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                fila.estado === "activo" ? "bg-emerald-500" : "bg-rose-500",
                              )}
                            />
                            {fila.estado === "activo" ? "Activo" : "Suspendido"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {fila.ultimo_acceso_en ? hace(fila.ultimo_acceso_en) : "Sin acceso"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          {fecha(fila.creado_en)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirCambioRol(fila)}
                            disabled={esYo}
                            title={esYo ? "No puedes cambiar tu propio rol" : undefined}
                          >
                            <ShieldCheck /> Cambiar rol
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en movil */}
            <div className="divide-y divide-blue-50 md:hidden">
              {visibles.map((fila) => {
                const esYo = fila.id === usuario?.id;
                return (
                  <div key={fila.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-extrabold text-blue-800">
                        {iniciales(fila.nombre)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-blue-950">
                          {fila.nombre}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{fila.correo}</p>
                      </div>
                      <Badge variant={fila.estado === "activo" ? "yellow" : "destructivo"}>
                        {fila.estado}
                      </Badge>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <Badge variant="suave">{etiquetaRol(fila.rol)}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirCambioRol(fila)}
                        disabled={esYo}
                      >
                        Cambiar rol
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {paginas > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
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

      <Dialog
        open={Boolean(seleccionado)}
        onOpenChange={(abierto) => !abierto && setSeleccionado(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar rol de acceso</DialogTitle>
            <DialogDescription>
              {seleccionado?.nombre} · {seleccionado?.correo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rol-nuevo">Nuevo rol</Label>
              <Select
                id="rol-nuevo"
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as Rol)}
              >
                {ROLES.map((valor) => (
                  <option key={valor} value={valor}>
                    {etiquetaRol(valor)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
              Cambiar el rol modifica los permisos de inmediato y queda registrado en la bitacora.
              Verifica que la cuenta conserve el perfil adecuado (alumno o empresa).
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSeleccionado(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void cambiarRol()} disabled={guardando}>
              {guardando ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              Guardar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
