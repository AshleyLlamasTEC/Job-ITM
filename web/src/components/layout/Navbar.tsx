import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthProvider";
import { useSinLeer } from "@/hooks/useSinLeer";
import { etiquetaRol } from "@/lib/formato";
import { cn, iniciales } from "@/lib/utils";
import { Logo } from "./Logo";

const ENLACES = [
  { a: "/", texto: "Inicio", fin: true },
  { a: "/vacantes", texto: "Buscar vacantes" },
  { a: "/#como-funciona", texto: "Como funciona" },
  { a: "/#empresas", texto: "Para empresas" },
];

export function Navbar() {
  const { usuario, cerrarSesion, tienePermiso } = useAuth();
  const sinLeer = useSinLeer();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [conFondo, setConFondo] = useState(false);

  useEffect(() => {
    const alDesplazar = () => setConFondo(window.scrollY > 8);
    alDesplazar();
    window.addEventListener("scroll", alDesplazar, { passive: true });
    return () => window.removeEventListener("scroll", alDesplazar);
  }, []);

  const salir = async () => {
    await cerrarSesion();
    toast.success("Sesion cerrada. Hasta pronto.");
    navigate("/");
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-300",
        conFondo
          ? "border-blue-100 bg-white/90 shadow-sm backdrop-blur-xl"
          : "border-transparent bg-white/70 backdrop-blur-md",
      )}
    >
      <div className="contenedor flex h-[72px] items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {ENLACES.map((enlace) =>
            enlace.a.startsWith("/#") ? (
              <a
                key={enlace.a}
                href={enlace.a}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-blue-800/80 transition hover:bg-blue-50 hover:text-blue-900"
              >
                {enlace.texto}
              </a>
            ) : (
              <NavLink
                key={enlace.a}
                to={enlace.a}
                end={enlace.fin}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-blue-50 text-blue-900"
                      : "text-blue-800/80 hover:bg-blue-50 hover:text-blue-900",
                  )
                }
              >
                {enlace.texto}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          {usuario ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative hidden sm:inline-flex"
                aria-label="Notificaciones"
              >
                <Link to="/cuenta/notificaciones">
                  <Bell className="h-5 w-5" />
                  {sinLeer > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {sinLeer > 9 ? "9+" : sinLeer}
                    </span>
                  )}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-blue-100 bg-white py-1 pl-1 pr-2.5 shadow-sm transition hover:border-blue-300">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-800 text-white">
                        {iniciales(usuario.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-32 truncate text-sm font-semibold text-blue-900 sm:block">
                      {usuario.nombre.split(" ")[0]}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="normal-case tracking-normal">
                    <span className="block truncate text-sm font-bold text-blue-950">
                      {usuario.nombre}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                      {usuario.correo}
                    </span>
                    <Badge variant="suave" className="mt-2">
                      {etiquetaRol(usuario.rol)}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate("/cuenta")}>
                    <LayoutDashboard /> Mi panel
                  </DropdownMenuItem>
                  {usuario.rol === "estudiante" && (
                    <>
                      <DropdownMenuItem onSelect={() => navigate("/cuenta/perfil")}>
                        <UserRound /> Mi perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate("/cuenta/postulaciones")}>
                        <BriefcaseBusiness /> Mis postulaciones
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigate("/cuenta/favoritos")}>
                        <Heart /> Favoritos
                      </DropdownMenuItem>
                    </>
                  )}
                  {usuario.rol === "empresa" && (
                    <DropdownMenuItem onSelect={() => navigate("/cuenta/perfil")}>
                      <Building2 /> Mi empresa
                    </DropdownMenuItem>
                  )}
                  {tienePermiso("usuarios.gestionar") && (
                    <DropdownMenuItem onSelect={() => navigate("/cuenta/usuarios")}>
                      <ShieldCheck /> Usuarios del sistema
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => void salir()}
                    className="text-rose-600 focus:bg-rose-50 focus:text-rose-700"
                  >
                    <LogOut /> Cerrar sesion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link to="/login">Iniciar sesion</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/registro">
                  <Sparkles className="h-4 w-4" /> Crear cuenta
                </Link>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Abrir menu"
          >
            {abierto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {abierto && (
        <div className="border-t border-blue-100 bg-white lg:hidden">
          <div className="contenedor space-y-1 py-4">
            {ENLACES.map((enlace) =>
              enlace.a.startsWith("/#") ? (
                <a
                  key={enlace.a}
                  href={enlace.a}
                  onClick={() => setAbierto(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50"
                >
                  {enlace.texto}
                </a>
              ) : (
                <Link
                  key={enlace.a}
                  to={enlace.a}
                  onClick={() => setAbierto(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50"
                >
                  {enlace.texto}
                </Link>
              ),
            )}

            <div className="my-2 h-px bg-blue-100" />

            {usuario ? (
              <div className="grid gap-1">
                <Link
                  to="/cuenta"
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50"
                >
                  <LayoutDashboard className="h-4 w-4" /> Mi panel
                </Link>
                <Link
                  to="/cuenta/notificaciones"
                  onClick={() => setAbierto(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-50"
                >
                  <Bell className="h-4 w-4" /> Notificaciones
                  {sinLeer > 0 && <Badge variant="destructivo">{sinLeer}</Badge>}
                </Link>
                <button
                  onClick={() => {
                    setAbierto(false);
                    void salir();
                  }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesion
                </button>
              </div>
            ) : (
              <div className="grid gap-2 pt-1">
                <Button asChild variant="outline" onClick={() => setAbierto(false)}>
                  <Link to="/login">Iniciar sesion</Link>
                </Button>
                <Button asChild onClick={() => setAbierto(false)}>
                  <Link to="/registro">Crear cuenta</Link>
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 pt-3 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> sec_gestion@itmexicali.edu.mx
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/** Variante compacta para las pantallas de acceso. */
export function BarraSimple() {
  return (
    <div className="absolute left-0 top-0 z-20 w-full">
      <div className="contenedor flex h-20 items-center justify-between">
        <Logo tono="claro" />
        <div className="hidden items-center gap-2 text-sm text-blue-100 sm:flex">
          <Search className="h-4 w-4" />
          <Link to="/vacantes" className="font-semibold hover:text-white">
            Explorar vacantes
          </Link>
        </div>
      </div>
    </div>
  );
}
