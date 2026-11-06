import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthProvider";
import { etiquetaRol } from "@/lib/formato";
import type { PerfilEstudiante } from "@/lib/tipos";
import { cn, iniciales } from "@/lib/utils";

export function UserLayout() {
  const { usuario, cargando, cerrarSesion, tienePermiso } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50/40">
        <div className="flex flex-col items-center gap-3 text-blue-600">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm font-semibold">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(ubicacion.pathname)}`} replace />;
  }

  const enlaces = [
    { a: "/cuenta", texto: "Resumen", icono: LayoutDashboard, fin: true },
    ...(usuario.rol === "estudiante"
      ? [
          { a: "/cuenta/perfil", texto: "Mi perfil", icono: UserRound },
          { a: "/cuenta/postulaciones", texto: "Mis postulaciones", icono: BriefcaseBusiness },
          { a: "/cuenta/favoritos", texto: "Favoritos", icono: Heart },
        ]
      : []),
    ...(usuario.rol === "empresa"
      ? [
          { a: "/cuenta/perfil", texto: "Mi empresa", icono: Building2 },
          { a: "/cuenta/vacantes", texto: "Mis vacantes", icono: BriefcaseBusiness },
        ]
      : []),
    { a: "/cuenta/notificaciones", texto: "Notificaciones", icono: Bell },
    ...(tienePermiso("usuarios.gestionar")
      ? [{ a: "/cuenta/usuarios", texto: "Usuarios", icono: ShieldCheck }]
      : []),
  ];

  const salir = async () => {
    await cerrarSesion();
    toast.success("Sesion cerrada.");
    navegar("/");
  };

  return (
    <div className="min-h-screen bg-blue-50/40">
      <Navbar />
      <div className="contenedor py-8">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-suave">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-800 text-sm text-white">
                      {iniciales(usuario.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-blue-950">{usuario.nombre}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{usuario.correo}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="suave">{etiquetaRol(usuario.rol)}</Badge>
                  {usuario.rol === "estudiante" &&
                    (usuario.perfil as PerfilEstudiante | null)?.matricula && (
                      <Badge variant="outline">
                        {String((usuario.perfil as PerfilEstudiante).matricula)}
                      </Badge>
                    )}
                </div>
              </div>

              <nav className="rounded-2xl border border-blue-100 bg-white p-2.5 shadow-suave">
                {enlaces.map(({ a, texto, icono: Icono, fin }) => (
                  <NavLink
                    key={a}
                    to={a}
                    end={fin}
                    className={({ isActive }) =>
                      cn(
                        "mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition last:mb-0",
                        isActive
                          ? "bg-blue-800 text-white shadow-sm"
                          : "text-blue-800/80 hover:bg-blue-50 hover:text-blue-900",
                      )
                    }
                  >
                    <Icono className="h-4 w-4" />
                    {texto}
                  </NavLink>
                ))}
                <div className="my-2 h-px bg-blue-100" />
                <button
                  onClick={() => void salir()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesion
                </button>
              </nav>

              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-800 to-blue-950 p-4 text-white">
                <p className="text-xs font-bold text-yellow-300">¿Necesitas ayuda?</p>
                <p className="mt-1 text-[11px] leading-relaxed text-blue-100/75">
                  Acude a Vinculacion Estudiantil o escribe a sec_gestion@itmexicali.edu.mx
                </p>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
              {enlaces.map(({ a, texto, icono: Icono, fin }) => (
                <NavLink
                  key={a}
                  to={a}
                  end={fin}
                  className={({ isActive }) =>
                    cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                      isActive
                        ? "border-blue-800 bg-blue-800 text-white"
                        : "border-blue-100 bg-white text-blue-800",
                    )
                  }
                >
                  <Icono className="h-3.5 w-3.5" /> {texto}
                </NavLink>
              ))}
            </div>

            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Encabezado comun de las pantallas del panel. */
export function CabeceraPanel({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-blue-950 sm:text-3xl">
          {titulo}
        </h1>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {accion && <div className="flex gap-2">{accion}</div>}
    </div>
  );
}

export function BotonSalir() {
  const { cerrarSesion } = useAuth();
  const navegar = useNavigate();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await cerrarSesion();
        navegar("/");
      }}
    >
      <LogOut /> Salir
    </Button>
  );
}
