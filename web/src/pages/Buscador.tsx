import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Filter,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { VacanteCard, VacanteCardEsqueleto } from "@/components/vacantes/VacanteCard";
import { useAuth } from "@/context/AuthProvider";
import { api } from "@/lib/api";
import type { Catalogo, FavoritoItem, Opcion, Vacante } from "@/lib/tipos";

const ORDENES = [
  { valor: "recientes", etiqueta: "Mas recientes" },
  { valor: "antiguas", etiqueta: "Mas antiguas" },
  { valor: "sueldo", etiqueta: "Mejor salario" },
  { valor: "relevancia", etiqueta: "Relevancia" },
];

const SALARIOS = [0, 5000, 8000, 10000, 15000, 20000, 25000, 30000];

interface Filtros {
  q: string;
  carrera_id: string;
  tipo: string;
  modalidad: string;
  ciudad: string;
  salario_min: string;
  orden: string;
}

const FILTROS_VACIOS: Filtros = {
  q: "",
  carrera_id: "",
  tipo: "",
  modalidad: "",
  ciudad: "",
  salario_min: "",
  orden: "recientes",
};

export function Buscador() {
  const { usuario } = useAuth();
  const [parametros, setParametros] = useSearchParams();
  const [filtros, setFiltros] = useState<Filtros>(() => ({
    ...FILTROS_VACIOS,
    q: parametros.get("q") ?? "",
    carrera_id: parametros.get("carrera_id") ?? "",
    tipo: parametros.get("tipo") ?? "",
    modalidad: parametros.get("modalidad") ?? "",
    ciudad: parametros.get("ciudad") ?? "",
    salario_min: parametros.get("salario_min") ?? "",
    orden: parametros.get("orden") ?? "recientes",
  }));
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [total, setTotal] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [carreras, setCarreras] = useState<Catalogo[]>([]);
  const [tipos, setTipos] = useState<Opcion[]>([]);
  const [modalidades, setModalidades] = useState<Opcion[]>([]);
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());
  const [panelFiltros, setPanelFiltros] = useState(false);

  const pagina = Math.max(1, Number(parametros.get("pagina") ?? 1));

  useEffect(() => {
    Promise.all([
      api.get<Catalogo[]>("/catalogos/carreras", { publico: true }),
      api.get<Opcion[]>("/catalogos/tipos-vacante", { publico: true }),
      api.get<Opcion[]>("/catalogos/modalidades", { publico: true }),
    ])
      .then(([c, t, m]) => {
        setCarreras(c.data);
        setTipos(t.data);
        setModalidades(m.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!usuario || usuario.rol !== "estudiante") return;
    api
      .get<FavoritoItem[]>("/favoritos")
      .then(({ data }) => setFavoritos(new Set(data.map((f) => f.vacante.id))))
      .catch(() => undefined);
  }, [usuario]);

  const cadenaParametros = parametros.toString();

  useEffect(() => {
    let activo = true;
    setCargando(true);
    const consulta = new URLSearchParams(cadenaParametros);
    consulta.set("por_pagina", "12");

    api
      .get<Vacante[]>(`/vacantes?${consulta.toString()}`, { publico: true })
      .then(({ data, meta }) => {
        if (!activo) return;
        setVacantes(data);
        setTotal(Number(meta?.total ?? 0));
        setPaginas(Number(meta?.paginas ?? 0));
      })
      .catch(() => {
        if (activo) toast.error("No pudimos cargar el buscador.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [cadenaParametros]);

  const aplicar = (evento?: FormEvent) => {
    evento?.preventDefault();
    const nuevos = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor && !(clave === "orden" && valor === "recientes")) nuevos.set(clave, valor);
    });
    setParametros(nuevos);
    setPanelFiltros(false);
  };

  const limpiar = () => {
    setFiltros({ ...FILTROS_VACIOS });
    setParametros(new URLSearchParams());
  };

  const irAPagina = (nueva: number) => {
    const nuevos = new URLSearchParams(parametros);
    if (nueva <= 1) nuevos.delete("pagina");
    else nuevos.set("pagina", String(nueva));
    setParametros(nuevos);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const alternarFavorito = async (vacante: Vacante) => {
    if (!usuario) {
      toast.info("Inicia sesion para guardar favoritos.");
      return;
    }
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
      toast.success(yaEsta ? "Quitada de favoritos." : "Guardada en favoritos.");
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

  const filtrosActivos = useMemo(
    () =>
      Object.entries(filtros).filter(
        ([clave, valor]) => valor && !(clave === "orden" && valor === "recientes"),
      ).length,
    [filtros],
  );

  const panel = (
    <form onSubmit={aplicar} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="f-q">Palabra clave</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
          <Input
            id="f-q"
            value={filtros.q}
            onChange={(e) => setFiltros((f) => ({ ...f, q: e.target.value }))}
            placeholder="Puesto, empresa o habilidad"
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-carrera">Carrera</Label>
        <Select
          id="f-carrera"
          value={filtros.carrera_id}
          onChange={(e) => setFiltros((f) => ({ ...f, carrera_id: e.target.value }))}
        >
          <option value="">Todas las carreras</option>
          {carreras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-tipo">Tipo de vacante</Label>
        <Select
          id="f-tipo"
          value={filtros.tipo}
          onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
        >
          <option value="">Cualquier tipo</option>
          {tipos.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-modalidad">Modalidad</Label>
        <Select
          id="f-modalidad"
          value={filtros.modalidad}
          onChange={(e) => setFiltros((f) => ({ ...f, modalidad: e.target.value }))}
        >
          <option value="">Cualquier modalidad</option>
          {modalidades.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.etiqueta}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-ciudad">Ciudad</Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
          <Input
            id="f-ciudad"
            value={filtros.ciudad}
            onChange={(e) => setFiltros((f) => ({ ...f, ciudad: e.target.value }))}
            placeholder="Mexicali, Tijuana..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-salario">Salario minimo</Label>
        <Select
          id="f-salario"
          value={filtros.salario_min}
          onChange={(e) => setFiltros((f) => ({ ...f, salario_min: e.target.value }))}
        >
          <option value="">Sin minimo</option>
          {SALARIOS.filter((s) => s > 0).map((s) => (
            <option key={s} value={s}>
              ${s.toLocaleString("es-MX")} MXN
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="f-orden">Ordenar por</Label>
        <Select
          id="f-orden"
          value={filtros.orden}
          onChange={(e) => setFiltros((f) => ({ ...f, orden: e.target.value }))}
        >
          {ORDENES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" className="flex-1">
          <Filter /> Aplicar
        </Button>
        <Button type="button" variant="outline" onClick={limpiar} aria-label="Limpiar filtros">
          <RotateCcw />
        </Button>
      </div>
    </form>
  );

  return (
    <div className="bg-blue-50/40">
      <div className="border-b border-blue-100 bg-white">
        <div className="contenedor py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Inicio
          </Link>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="etiqueta-ojo">Bolsa de trabajo ITM</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-blue-950 sm:text-4xl">
                Buscar vacantes
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {cargando
                  ? "Buscando oportunidades..."
                  : `${total} vacante${total === 1 ? "" : "s"} publicada${total === 1 ? "" : "s"}`}
                {filtrosActivos > 0 ? ` con ${filtrosActivos} filtro${filtrosActivos === 1 ? "" : "s"} activo${filtrosActivos === 1 ? "" : "s"}` : ""}
                .
              </p>
            </div>
            <Button
              variant="outline"
              className="self-start lg:hidden"
              onClick={() => setPanelFiltros((v) => !v)}
            >
              {panelFiltros ? <X /> : <SlidersHorizontal />} Filtros
              {filtrosActivos > 0 && <Badge variant="yellow">{filtrosActivos}</Badge>}
            </Button>
          </div>
        </div>
      </div>

      <div className="contenedor grid gap-8 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-blue-100 bg-white p-5 shadow-suave">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-blue-950">
                <SlidersHorizontal className="h-4 w-4 text-blue-500" /> Filtros
              </h2>
              {filtrosActivos > 0 && (
                <button
                  onClick={limpiar}
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  Limpiar
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        {panelFiltros && (
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-suave lg:hidden">
            {panel}
          </div>
        )}

        <section>
          {cargando ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <VacanteCardEsqueleto key={i} />
              ))}
            </div>
          ) : vacantes.length === 0 ? (
            <EstadoVacio
              icono={BriefcaseBusiness}
              titulo="No encontramos vacantes con esos filtros"
              descripcion="Prueba con menos filtros o una palabra clave mas general. Tambien puedes explorar todas las vacantes activas."
              accion={{ texto: "Ver todas las vacantes", a: "/vacantes" }}
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {vacantes.map((vacante) => (
                  <VacanteCard
                    key={vacante.id}
                    vacante={vacante}
                    favorito={favoritos.has(vacante.id)}
                    onFavorito={usuario?.rol === "estudiante" ? alternarFavorito : undefined}
                  />
                ))}
              </div>

              {paginas > 1 && (
                <div className="mt-10 flex items-center justify-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina <= 1}
                    onClick={() => irAPagina(pagina - 1)}
                  >
                    <ArrowLeft /> Anterior
                  </Button>
                  {Array.from({ length: paginas }, (_, i) => i + 1)
                    .filter((n) => Math.abs(n - pagina) <= 2 || n === 1 || n === paginas)
                    .map((n, i, lista) => (
                      <span key={n} className="flex items-center gap-1.5">
                        {i > 0 && n - lista[i - 1] > 1 && (
                          <span className="px-1 text-xs text-muted-foreground">...</span>
                        )}
                        <Button
                          size="sm"
                          variant={n === pagina ? "default" : "outline"}
                          onClick={() => irAPagina(n)}
                          className="min-w-9"
                        >
                          {n}
                        </Button>
                      </span>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagina >= paginas}
                    onClick={() => irAPagina(pagina + 1)}
                  >
                    Siguiente <ArrowRight />
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
