import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  Heart,
  MapPin,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { EstadoVacio } from "@/components/comunes/EstadoVacio";
import { CabeceraPanel } from "@/components/layout/UserLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import {
  diasPara,
  etiquetaModalidad,
  etiquetaTipo,
  fecha,
  hace,
  rangoSalario,
} from "@/lib/formato";
import { iniciales } from "@/lib/utils";
import type { FavoritoItem } from "@/lib/tipos";

export function Favoritos() {
  const [favoritos, setFavoritos] = useState<FavoritoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [quitando, setQuitando] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    api
      .get<FavoritoItem[]>("/favoritos")
      .then(({ data }) => {
        if (activo) setFavoritos(data);
      })
      .catch((fallo) => {
        if (activo) {
          toast.error(
            fallo instanceof ApiError ? fallo.message : "No pudimos cargar tus favoritos.",
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const quitar = async (item: FavoritoItem) => {
    setQuitando(item.vacante.id);
    try {
      await api.delete(`/favoritos/${item.vacante.id}`);
      setFavoritos((actual) => actual.filter((f) => f.vacante.id !== item.vacante.id));
      toast.success("Vacante quitada de favoritos.");
    } catch (fallo) {
      toast.error(
        fallo instanceof ApiError ? fallo.message : "No pudimos quitar la vacante.",
      );
    } finally {
      setQuitando(null);
    }
  };

  return (
    <>
      <CabeceraPanel
        titulo="Favoritos"
        descripcion="Las vacantes que guardaste para revisarlas despues."
        accion={
          <Button asChild variant="outline">
            <Link to="/vacantes">
              <BriefcaseBusiness /> Explorar vacantes
            </Link>
          </Button>
        }
      />

      {cargando ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : favoritos.length === 0 ? (
        <EstadoVacio
          icono={Heart}
          titulo="Tu lista de favoritos esta vacia"
          descripcion="Guarda las vacantes que te interesen con el corazon y vuelve a ellas cuando quieras postularte."
          accion={{ texto: "Buscar vacantes", a: "/vacantes" }}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {favoritos.map((item) => {
            const vacante = item.vacante;
            const dias = diasPara(vacante.fecha_cierre);
            const abierta = vacante.estado === "publicada" && dias >= 0;

            return (
              <article
                key={vacante.id}
                className="group relative flex flex-col rounded-2xl border border-blue-100 bg-white p-5 shadow-suave transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-flotante"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-sm font-extrabold text-blue-700 ring-1 ring-blue-100">
                      {iniciales(vacante.empresa)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-blue-600">
                        {vacante.empresa ?? "Empresa ITM"}
                      </p>
                      <Link
                        to={`/vacantes/${vacante.id}`}
                        className="line-clamp-2 text-[15px] font-bold leading-snug text-blue-950 transition group-hover:text-blue-700"
                      >
                        {vacante.titulo}
                      </Link>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void quitar(item)}
                    disabled={quitando === vacante.id}
                    aria-label="Quitar de favoritos"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500 transition hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  <Badge variant="suave">{etiquetaTipo(vacante.tipo)}</Badge>
                  <Badge variant="outline">{etiquetaModalidad(vacante.modalidad)}</Badge>
                  {!abierta && <Badge variant="destructivo">No disponible</Badge>}
                  {abierta && dias <= 7 && <Badge variant="yellow">Cierra pronto</Badge>}
                </div>

                <div className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" /> {vacante.ciudad}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-blue-800">
                    <Wallet className="h-3.5 w-3.5 text-blue-400" />
                    {rangoSalario(vacante.salario)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-blue-400" />
                    Cierre {fecha(vacante.fecha_cierre)}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-blue-50 pt-3.5">
                  <span className="text-[11px] text-muted-foreground">
                    Guardada {hace(item.guardado_en)}
                  </span>
                  <Button asChild variant="ghost" size="sm" className="px-2 text-blue-700">
                    <Link to={`/vacantes/${vacante.id}`}>
                      Ver vacante <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
