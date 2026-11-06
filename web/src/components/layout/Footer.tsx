import { Link } from "react-router-dom";
import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";

import { Logo } from "./Logo";

const COLUMNAS = [
  {
    titulo: "Plataforma",
    enlaces: [
      { texto: "Buscar vacantes", a: "/vacantes" },
      { texto: "Crear cuenta", a: "/registro" },
      { texto: "Iniciar sesion", a: "/login" },
      { texto: "Mi panel", a: "/cuenta" },
    ],
  },
  {
    titulo: "Para empresas",
    enlaces: [
      { texto: "Publicar una vacante", a: "/registro?tipo=empresa" },
      { texto: "Validacion de empresas", a: "/#empresas" },
      { texto: "Preguntas frecuentes", a: "/#como-funciona" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-blue-950 text-blue-100">
      <div className="pointer-events-none absolute inset-0 fondo-cuadricula opacity-60" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-700/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-yellow-500/10 blur-3xl" />

      <div className="contenedor relative py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo tono="claro" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-blue-200/80">
              La bolsa de trabajo del Tecnologico de Mexicali. Conectamos a alumnos y egresados
              con empresas de Baja California.
            </p>
            <div className="mt-6 flex gap-2">
              {[Facebook, Instagram, Linkedin].map((Icono, i) => (
                <span
                  key={i}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-blue-200 transition hover:border-yellow-400/40 hover:text-yellow-300"
                >
                  <Icono className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          {COLUMNAS.map((columna) => (
            <div key={columna.titulo}>
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">
                {columna.titulo}
              </h3>
              <ul className="mt-5 space-y-3">
                {columna.enlaces.map((enlace) => (
                  <li key={enlace.texto}>
                    <Link
                      to={enlace.a}
                      className="group inline-flex items-center gap-1 text-sm text-blue-200/80 transition hover:text-white"
                    >
                      {enlace.texto}
                      <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-300">
              Vinculacion Estudiantil
            </h3>
            <ul className="mt-5 space-y-3.5 text-sm text-blue-200/80">
              <li className="flex gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span>
                  Av. Instituto Tecnologico S/N, Colonia Plutarco Elias Calles,
                  C.P. 21376, Mexicali, Baja California, Mexico.
                </span>
              </li>
              <li className="flex gap-2.5">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span>
                  (686) 580-4980
                  <br />
                  Ext. 4927 Gestion Tecnologica y Vinculacion
                  <br />
                  Ext. 4911 Servicio Social
                  <br />
                  Ext. 4990 Practicas y Promocion Profesional
                  <br />
                  Ext. 4910 Seguimiento a Egresados / Incubadora
                </span>
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <span className="space-y-1">
                  <span className="block">ssocial@itmexicali.edu.mx</span>
                  <span className="block">promocionprofesional@itmexicali.edu.mx</span>
                  <span className="block">residencias-vinculacion@itmexicali.edu.mx</span>
                  <span className="block">egresados@itmexicali.edu.mx</span>
                  <span className="block">incubadora@itmexicali.edu.mx</span>
                  <span className="block">sec_gestion@itmexicali.edu.mx</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-blue-300/70 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} Tecnologico de Mexicali. Todos los derechos reservados.
          </p>
          <p className="flex items-center gap-1.5">
            Hecho para la comunidad ITM
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" />
          </p>
        </div>
      </div>
    </footer>
  );
}
