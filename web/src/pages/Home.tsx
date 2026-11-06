import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  GraduationCap,
  Lightbulb,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuscadorRapido } from "@/components/home/BuscadorRapido";
import { HeroSlider } from "@/components/home/HeroSlider";
import { VacanteCard, VacanteCardEsqueleto } from "@/components/vacantes/VacanteCard";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import type { Catalogo, FavoritoItem, Vacante } from "@/lib/tipos";

const PASOS_ALUMNO = [
  {
    icono: UserRound,
    titulo: "Crea tu perfil",
    texto: "Registrate con tu correo institucional, completa tus datos academicos y sube tu CV en PDF.",
  },
  {
    icono: Search,
    titulo: "Encuentra tu vacante",
    texto: "Filtra por carrera, tipo de empleo, modalidad y ciudad. Guarda tus favoritas para despues.",
  },
  {
    icono: Send,
    titulo: "Postulate y da seguimiento",
    texto: "Envia tu candidatura en linea y revisa el avance de cada proceso desde tu panel.",
  },
];

const PASOS_EMPRESA = [
  {
    icono: Building2,
    titulo: "Registra tu empresa",
    texto: "Vinculacion valida tu cuenta para proteger a la comunidad estudiantil.",
  },
  {
    icono: FileText,
    titulo: "Publica tu vacante",
    texto: "Captura el perfil estandarizado y envialo a revision. Sin costos ni tramites largos.",
  },
  {
    icono: Users,
    titulo: "Selecciona talento ITM",
    texto: "Revisa candidatos, descarga curriculums y mueve cada proceso hasta la contratacion.",
  },
];

const CONSEJOS = [
  {
    titulo: "Tu CV, en una sola pagina",
    texto:
      "Destaca formacion, proyectos y habilidades tecnicas. Vinculacion revisa que el archivo sea PDF y legible.",
  },
  {
    titulo: "Postulate a lo que puedas sostener",
    texto:
      "Revisa horario, modalidad y fecha de cierre. Una candidatura enfocada vale mas que diez al azar.",
  },
  {
    titulo: "Prepara tu entrevista",
    texto:
      "Investiga la empresa, practica una presentacion de dos minutos y lleva ejemplos de tu trabajo.",
  },
];

export function Home() {
  const { usuario } = useAuth();
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [carreras, setCarreras] = useState<Catalogo[]>([]);
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());
  const [consejo, setConsejo] = useState(0);

  useEffect(() => {
    let activo = true;
    Promise.all([
      api.get<Vacante[]>("/vacantes?orden=recientes&por_pagina=6", { publico: true }),
      api.get<Catalogo[]>("/catalogos/carreras", { publico: true }),
    ])
      .then(([v, c]) => {
        if (!activo) return;
        setVacantes(v.data);
        setTotal(Number(v.meta?.total ?? v.data.length));
        setCarreras(c.data);
      })
      .catch(() => {
        if (activo) toast.error("No pudimos cargar las vacantes. Intenta de nuevo.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!usuario || usuario.rol !== "estudiante") return;
    api
      .get<FavoritoItem[]>("/favoritos")
      .then(({ data }) => setFavoritos(new Set(data.map((f) => f.vacante.id))))
      .catch(() => undefined);
  }, [usuario]);

  useEffect(() => {
    const temporizador = window.setInterval(
      () => setConsejo((actual) => (actual + 1) % CONSEJOS.length),
      7000,
    );
    return () => window.clearInterval(temporizador);
  }, []);

  const alternarFavorito = async (vacante: Vacante) => {
    if (!usuario) {
      toast.info("Inicia sesion para guardar tus vacantes favoritas.");
      return;
    }
    if (usuario.rol !== "estudiante") return;

    const yaEsta = favoritos.has(vacante.id);
    setFavoritos((actual) => {
      const copia = new Set(actual);
      if (yaEsta) copia.delete(vacante.id);
      else copia.add(vacante.id);
      return copia;
    });

    try {
      if (yaEsta) await api.delete(`/favoritos/${vacante.id}`);
      else await api.post("/favoritos", { vacante_id: vacante.id });
      toast.success(yaEsta ? "Vacante quitada de favoritos." : "Vacante guardada en favoritos.");
    } catch {
      setFavoritos((actual) => {
        const copia = new Set(actual);
        if (yaEsta) copia.add(vacante.id);
        else copia.delete(vacante.id);
        return copia;
      });
      toast.error("No pudimos actualizar tus favoritos.");
    }
  };

  const carrerasDestacadas = useMemo(() => carreras.slice(0, 8), [carreras]);
  const destacada = vacantes[0] ?? null;

  return (
    <>
      <HeroSlider destacada={destacada} totalVacantes={total} />
      <BuscadorRapido />

      {/* Indicadores */}
      <section className="border-b border-blue-100 bg-white">
        <div className="contenedor grid grid-cols-2 gap-6 py-10 sm:grid-cols-4">
          {[
            { icono: BriefcaseBusiness, valor: `${total}`, texto: "Vacantes activas" },
            { icono: GraduationCap, valor: `${carreras.length || 11}`, texto: "Carreras del ITM" },
            { icono: BadgeCheck, valor: "100%", texto: "Empresas validadas" },
            { icono: ShieldCheck, valor: "Gratis", texto: "Para alumnos y egresados" },
          ].map(({ icono: Icono, valor, texto }) => (
            <div key={texto} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <Icono className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-xl font-extrabold leading-none text-blue-950">
                  {valor}
                </p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vacantes destacadas */}
      <section className="bg-blue-50/40 py-16 sm:py-20">
        <div className="contenedor">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="etiqueta-ojo">Oportunidades recientes</p>
              <h2 className="titulo-seccion mt-2">Vacantes destacadas</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Publicadas por empresas verificadas por Vinculacion Estudiantil del ITM.
              </p>
            </div>
            <Button asChild variant="outline" className="self-start">
              <Link to="/vacantes">
                Ver todas <ArrowRight />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cargando
              ? Array.from({ length: 6 }).map((_, i) => <VacanteCardEsqueleto key={i} />)
              : vacantes.map((vacante) => (
                  <VacanteCard
                    key={vacante.id}
                    vacante={vacante}
                    favorito={favoritos.has(vacante.id)}
                    onFavorito={usuario?.rol === "estudiante" ? alternarFavorito : undefined}
                  />
                ))}
          </div>

          {!cargando && vacantes.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-blue-200 bg-white p-12 text-center">
              <p className="text-sm font-semibold text-blue-900">
                Aun no hay vacantes publicadas.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Vuelve pronto o registra tu empresa para publicar la primera.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Carreras */}
      <section className="py-16 sm:py-20">
        <div className="contenedor">
          <div className="mx-auto max-w-2xl text-center">
            <p className="etiqueta-ojo">Explora por area</p>
            <h2 className="titulo-seccion mt-2">Encuentra vacantes para tu carrera</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Ocho programas del Tecnologico de Mexicali con oportunidades activas en la region.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {carrerasDestacadas.map((carrera) => (
              <Link
                key={carrera.id}
                to={`/vacantes?carrera_id=${carrera.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-suave transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-flotante"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-[11px] font-extrabold text-yellow-300">
                  {carrera.clave}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-blue-950 group-hover:text-blue-700">
                    {carrera.nombre.replace("Ingenieria ", "")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Ver vacantes</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-blue-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
              </Link>
            ))}
            {carrerasDestacadas.length === 0 &&
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-blue-50" />
              ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-24 bg-blue-950 py-16 text-white sm:py-20">
        <div className="contenedor">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-300">
                Asi de simple
              </p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Un solo lugar para conectar talento y empresa
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-blue-100/75">
                Job ITM es operado por Vinculacion Estudiantil. Cada empresa pasa por validacion y
                cada vacante por moderacion antes de publicarse.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Badge variant="yellow">
                  <ShieldCheck className="h-3.5 w-3.5" /> Procesos verificados
                </Badge>
                <Badge className="border-white/15 bg-white/10 text-white">
                  <Sparkles className="h-3.5 w-3.5" /> Sin costo
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
              <Tabs defaultValue="alumnos">
                <TabsList className="bg-white/10">
                  <TabsTrigger
                    value="alumnos"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-950"
                  >
                    <GraduationCap /> Soy alumno
                  </TabsTrigger>
                  <TabsTrigger
                    value="empresas"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-950"
                  >
                    <Building2 /> Soy empresa
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="alumnos" className="mt-6">
                  <ol className="space-y-5">
                    {PASOS_ALUMNO.map((paso, i) => (
                      <li key={paso.titulo} className="flex gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/20">
                          <paso.icono className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-white">
                            <span className="text-yellow-400">0{i + 1}.</span> {paso.titulo}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-blue-100/70">
                            {paso.texto}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Button asChild variant="yellow" className="mt-7">
                    <Link to="/registro">
                      Crear mi cuenta <ArrowRight />
                    </Link>
                  </Button>
                </TabsContent>

                <TabsContent value="empresas" className="mt-6">
                  <ol className="space-y-5">
                    {PASOS_EMPRESA.map((paso, i) => (
                      <li key={paso.titulo} className="flex gap-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/20">
                          <paso.icono className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="flex items-center gap-2 text-sm font-bold text-white">
                            <span className="text-yellow-400">0{i + 1}.</span> {paso.titulo}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-blue-100/70">
                            {paso.texto}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Button asChild variant="yellow" className="mt-7">
                    <Link to="/registro?tipo=empresa">
                      Registrar mi empresa <ArrowRight />
                    </Link>
                  </Button>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </section>

      {/* Consejos (slider) */}
      <section className="py-16 sm:py-20">
        <div className="contenedor grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="etiqueta-ojo">Consejos de Vinculacion</p>
            <h2 className="titulo-seccion mt-2">Preparate para dar el siguiente paso</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Recomendaciones del equipo que acompana a los alumnos del ITM en su vinculacion con
              el sector productivo.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {CONSEJOS.map((c, i) => (
                <button
                  key={c.titulo}
                  type="button"
                  aria-label={`Consejo ${i + 1}`}
                  onClick={() => setConsejo(i)}
                  className={
                    i === consejo
                      ? "h-1.5 w-8 rounded-full bg-blue-700 transition-all"
                      : "h-1.5 w-3 rounded-full bg-blue-200 transition-all hover:bg-blue-400"
                  }
                />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-yellow-300/20 p-8 shadow-suave sm:p-10">
            <Lightbulb className="absolute -right-4 -top-4 h-28 w-28 text-blue-100" />
            <div key={consejo} className="relative animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
                <TrendingUp className="h-3.5 w-3.5" /> Consejo {consejo + 1} de {CONSEJOS.length}
              </span>
              <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-blue-950">
                {CONSEJOS[consejo].titulo}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {CONSEJOS[consejo].texto}
              </p>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-700">
                <CheckCircle2 className="h-4 w-4" /> Vinculacion Estudiantil ITM
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA empresas */}
      <section id="empresas" className="scroll-mt-24 pb-20">
        <div className="contenedor">
          <div className="relative overflow-hidden rounded-3xl bg-blue-900 px-6 py-12 text-white shadow-flotante sm:px-12">
            <div className="absolute inset-0 fondo-cuadricula opacity-60" />
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-yellow-300">
                  Para empresas
                </p>
                <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Tu proximo colaborador estudia en el ITM
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-blue-100/80">
                  Publica vacantes, recibe candidaturas y da seguimiento al proceso de seleccion.
                  Vinculacion valida tu empresa sin costo.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="yellow" size="lg">
                  <Link to="/registro?tipo=empresa">
                    Publicar vacante <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link to="/login">Ya tengo cuenta</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
