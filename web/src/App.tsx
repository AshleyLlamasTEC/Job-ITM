import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Loader2, ShieldAlert } from "lucide-react";

import { ScrollToTop } from "@/components/ScrollToTop";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { UserLayout } from "@/components/layout/UserLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { Buscador } from "@/pages/Buscador";
import { Home } from "@/pages/Home";
import { Login } from "@/pages/Login";
import { Registro } from "@/pages/Registro";
import { VacanteDetalle } from "@/pages/VacanteDetalle";
import { Favoritos } from "@/pages/cuenta/Favoritos";
import { Candidatos } from "@/pages/cuenta/empresa/Candidatos";
import { MisVacantes } from "@/pages/cuenta/empresa/Vacantes";
import { MisPostulaciones } from "@/pages/cuenta/MisPostulaciones";
import { Notificaciones } from "@/pages/cuenta/Notificaciones";
import { Perfil } from "@/pages/cuenta/Perfil";
import { Resumen } from "@/pages/cuenta/Resumen";
import { UsuariosAdmin } from "@/pages/cuenta/admin/Usuarios";

/** Espera a que termine la carga de la sesion antes de decidir. */
function EsperandoSesion() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50/40">
      <div className="flex flex-col items-center gap-3 text-blue-600">
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-sm font-semibold">Cargando...</p>
      </div>
    </div>
  );
}

/** Solo alumnos: postulaciones y favoritos. */
function RutaEstudiante({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth();
  const ubicacion = useLocation();

  if (cargando) return <EsperandoSesion />;
  if (!usuario) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(ubicacion.pathname)}`} replace />;
  }
  if (usuario.rol !== "estudiante") return <Navigate to="/cuenta" replace />;

  return <>{children}</>;
}

/** Solo quien puede gestionar usuarios (Vinculacion y Admin). */
function RutaUsuarios({ children }: { children: ReactNode }) {
  const { usuario, cargando, tienePermiso } = useAuth();

  if (cargando) return <EsperandoSesion />;
  if (!usuario) return <Navigate to="/login?redirect=/cuenta/usuarios" replace />;
  if (!tienePermiso("usuarios.gestionar")) return <Navigate to="/cuenta" replace />;

  return <>{children}</>;
}

function NoEncontrado() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 ring-1 ring-blue-100">
        <Compass className="h-7 w-7" />
      </span>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-blue-950">
        No encontramos esta pagina
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        El enlace pudo cambiar o la vacante ya no esta disponible. Vuelve al inicio o explora las
        oportunidades activas.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/">
            <ArrowLeft /> Ir al inicio
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/vacantes">Buscar vacantes</Link>
        </Button>
      </div>
    </div>
  );
}

function SinAcceso() {
  return (
    <div className="contenedor py-24 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
        <ShieldAlert className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold text-blue-950">No tienes acceso a esta seccion</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Tu cuenta no cuenta con los permisos necesarios. Si crees que es un error, contacta a
        Vinculacion Estudiantil.
      </p>
      <Button asChild className="mt-6">
        <Link to="/cuenta">Volver a mi panel</Link>
      </Button>
    </div>
  );
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Sitio publico */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/vacantes" element={<Buscador />} />
          <Route path="/vacantes/:id" element={<VacanteDetalle />} />
          <Route path="/sin-acceso" element={<SinAcceso />} />
        </Route>

        {/* Acceso */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        {/* Panel del usuario */}
        <Route path="/cuenta" element={<UserLayout />}>
          <Route index element={<Resumen />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="vacantes" element={<MisVacantes />} />
          <Route path="vacantes/:id/candidatos" element={<Candidatos />} />
          <Route
            path="postulaciones"
            element={
              <RutaEstudiante>
                <MisPostulaciones />
              </RutaEstudiante>
            }
          />
          <Route
            path="favoritos"
            element={
              <RutaEstudiante>
                <Favoritos />
              </RutaEstudiante>
            }
          />
          <Route path="notificaciones" element={<Notificaciones />} />
          <Route
            path="usuarios"
            element={
              <RutaUsuarios>
                <UsuariosAdmin />
              </RutaUsuarios>
            }
          />
        </Route>

        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </>
  );
}
