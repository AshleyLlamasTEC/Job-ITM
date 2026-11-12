import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  ChevronRight,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, iniciales } from "@/lib/utils";
import { etiquetaModalidad, rangoSalario } from "@/lib/formato";
import type { Vacante } from "@/lib/tipos";

interface Diapositiva {
  ojo: string;
  titulo: string;
  resaltado: string;
  descripcion: string;
  principal: { texto: string; a: string };
  secundario: { texto: string; a: string };
}

const DIAPOSITIVAS: Diapositiva[] = [
  {
    ojo: "Bolsa de trabajo del Tec de Mexicali",
    titulo: "Tu talento merece",
    resaltado: "un buen lugar",
    descripcion:
      "Encuentra practicas profesionales, servicio social y empleo formal con empresas de Mexicali, Tijuana y todo Baja California.",
    principal: { texto: "Buscar vacantes", a: "/vacantes" },
    secundario: { texto: "Crear mi cuenta", a: "/registro" },
  },
  {
    ojo: "Practicas y servicio social",
    titulo: "Da tu primer paso",
    resaltado: "profesional",
    descripcion:
      "Vacantes compatibles con tu semestre, filtradas por carrera y modalidad. Postulate en linea y da seguimiento a tu proceso.",
    principal: { texto: "Ver practicas", a: "/vacantes?tipo=practicas" },
    secundario: { texto: "Conocer la plataforma", a: "/#como-funciona" },
  },
  {
    ojo: "Para empresas de la region",
    titulo: "Encuentra talento",
    resaltado: "formado en el ITM",
    descripcion:
      "Publica tus vacantes, revisa candidatos y da seguimiento al proceso de seleccion desde un solo panel validado por Vinculacion.",
    principal: { texto: "Publicar una vacante", a: "/registro?tipo=empresa" },
    secundario: { texto: "Como funciona", a: "/#como-funciona" },
  },
];

export function HeroSlider({
  destacada,
  totalVacantes,
}: {
  destacada?: Vacante | null;
  totalVacantes: number;
}) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const region = useRef<HTMLDivElement>(null);

  const mover = useCallback((delta: number) => {
    setIndice(
      (actual) => (actual + delta + DIAPOSITIVAS.length) % DIAPOSITIVAS.length,
    );
  }, []);

  useEffect(() => {
    if (pausado) return;
    const temporizador = window.setInterval(() => mover(1), 6500);
    return () => window.clearInterval(temporizador);
  }, [mover, pausado]);

  const diapositiva = DIAPOSITIVAS[indice];

  return (
    <section
      ref={region}
      aria-roledescription="carrusel"
      aria-label="Presentacion de Job ITM"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
      className="relative isolate overflow-hidden bg-blue-950 pb-28 pt-14 text-white sm:pb-32 sm:pt-16 lg:pb-36 lg:pt-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#2563eb_0%,#1e3a8a_58%,#172554_100%)]" />
      <div className="absolute inset-0 fondo-cuadricula opacity-70" />
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-yellow-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 rounded-full border border-white/5 lg:block" />
      <div className="pointer-events-none absolute right-[calc(33%-80px)] top-1/2 hidden h-[680px] w-[680px] -translate-y-1/2 rounded-full border border-white/5 lg:block" />

      <div className="contenedor relative grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div key={indice} className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-300">
            <Sparkles className="h-3.5 w-3.5" />
            {diapositiva.ojo}
          </span>

          <div className="mt-6 flex items-center gap-3">
            <img className="w-20" src="/public/logo-tec.png" alt="Logo del Instituto Tecnológico de Mexicali" />
            <h1 className="mt-5 max-w-xl text-balance font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {diapositiva.titulo}{" "}
              <span className="relative inline-block text-yellow-400">
                {diapositiva.resaltado}
                <svg
                  viewBox="0 0 200 12"
                  className="absolute -bottom-1 left-0 h-2.5 w-full text-yellow-500/60"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 9C50 3 150 2 198 6"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
          </div>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-100/80 sm:text-lg">
            {diapositiva.descripcion}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="yellow" size="lg" className="group">
              <Link to={diapositiva.principal.a}>
                {diapositiva.principal.texto}
                <ArrowRight className="transition group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10"
            >
              <Link to={diapositiva.secundario.a}>
                {diapositiva.secundario.texto}
              </Link>
            </Button>
          </div>

          <div className="mt-10 flex items-center gap-6 text-xs text-blue-200/70">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-yellow-400" />
              Empresas verificadas
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-yellow-400" />
              Postulacion en linea
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <BadgeCheck className="h-4 w-4 text-yellow-400" />
              Sin costo para alumnos
            </div>
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-md lg:block">
          <div className="animate-flotar">
            <div className="absolute -left-6 -top-6 z-10 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/95 px-3.5 py-2.5 text-blue-900 shadow-flotante">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-blue-950">
                <BadgeCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] font-bold leading-none">
                  CV verificado
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Perfil ITM
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white p-6 text-blue-950 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.65)]">
              <div className="flex items-center justify-between">
                <Badge variant="yellow">Vacante destacada</Badge>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {totalVacantes} activas
                </span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-800 text-sm font-extrabold text-yellow-300">
                  {iniciales(destacada?.empresa.nombre ?? "Grupo Industrial")}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-blue-600">
                    {destacada?.empresa.nombre ?? "Grupo Industrial del Valle"}
                  </p>
                  <p className="truncate text-base font-extrabold leading-tight">
                    {destacada?.titulo ?? "Desarrollador Full Stack"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Badge variant="suave">Empleo de planta</Badge>
                <Badge variant="outline">
                  {etiquetaModalidad(destacada?.modalidad ?? "hibrida")}
                </Badge>
              </div>

              <div className="mt-4 space-y-2 rounded-xl bg-blue-50/70 p-3.5 text-xs">
                <p className="flex items-center gap-2 text-blue-800">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  {destacada?.ciudad ?? "Mexicali"}, Baja California
                </p>
                <p className="flex items-center gap-2 font-bold text-blue-900">
                  <Wallet className="h-3.5 w-3.5 text-blue-500" />
                  {destacada
                    ? rangoSalario(destacada.salario)
                    : "$18,000 – $26,000 MXN"}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {["AL", "BR", "CR"].map((sigla, i) => (
                    <span
                      key={sigla}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold",
                        i === 0
                          ? "bg-blue-700 text-white"
                          : i === 1
                            ? "bg-blue-200 text-blue-900"
                            : "bg-yellow-400 text-blue-950",
                      )}
                    >
                      {sigla}
                    </span>
                  ))}
                </div>
                <Button asChild size="sm" variant="yellow">
                  <Link
                    to={destacada ? `/vacantes/${destacada.id}` : "/vacantes"}
                  >
                    Ver vacante <ChevronRight />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="absolute -bottom-7 -right-5 z-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-blue-900/90 px-4 py-3 shadow-flotante backdrop-blur">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-yellow-300">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold leading-none text-white">
                  Vinculacion ITM
                </p>
                <p className="mt-1 text-[10px] text-blue-200/70">
                  Empresas validadas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="contenedor relative mt-12 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="Elegir diapositiva"
        >
          {DIAPOSITIVAS.map((d, i) => (
            <button
              key={d.ojo}
              type="button"
              role="tab"
              aria-selected={i === indice}
              aria-label={d.ojo}
              onClick={() => setIndice(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === indice
                  ? "w-10 bg-yellow-400"
                  : "w-4 bg-white/25 hover:bg-white/50",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="mr-2 hidden text-xs font-semibold tabular-nums text-blue-200/60 sm:block">
            {String(indice + 1).padStart(2, "0")} /{" "}
            {String(DIAPOSITIVAS.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label="Diapositiva anterior"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/40 hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label="Siguiente diapositiva"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-white/40 hover:bg-white/15"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
