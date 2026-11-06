import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, Clock3, Heart, MapPin, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, iniciales } from "@/lib/utils";
import { diasPara, etiquetaModalidad, etiquetaTipo, hace, rangoSalario } from "@/lib/formato";
import type { Vacante } from "@/lib/tipos";

export function VacanteCard({
  vacante,
  favorito = false,
  onFavorito,
  compacta = false,
}: {
  vacante: Vacante;
  favorito?: boolean;
  onFavorito?: (vacante: Vacante) => void;
  compacta?: boolean;
}) {
  const dias = diasPara(vacante.fecha_cierre);
  const urgente = dias <= 7 && dias >= 0;

  return (
    <article className="tarjeta-vacante group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 text-sm font-extrabold text-blue-700 ring-1 ring-blue-100">
            {iniciales(vacante.empresa.nombre)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-blue-600">
              {vacante.empresa.nombre ?? "Empresa ITM"}
            </p>
            <Link
              to={`/vacantes/${vacante.id}`}
              className="line-clamp-2 text-[15px] font-bold leading-snug text-blue-950 transition group-hover:text-blue-700"
            >
              {vacante.titulo}
            </Link>
          </div>
        </div>

        {onFavorito && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onFavorito(vacante);
            }}
            aria-label={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition",
              favorito
                ? "border-rose-200 bg-rose-50 text-rose-500"
                : "border-blue-100 bg-white text-blue-300 hover:border-rose-200 hover:text-rose-400",
            )}
          >
            <Heart className={cn("h-4 w-4", favorito && "fill-current")} />
          </button>
        )}
      </div>

      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <Badge variant="suave">{etiquetaTipo(vacante.tipo)}</Badge>
        <Badge variant="outline">{etiquetaModalidad(vacante.modalidad)}</Badge>
        {urgente && <Badge variant="yellow">Cierra pronto</Badge>}
      </div>

      {!compacta && (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {vacante.carrera ? `Dirigida a ${vacante.carrera.nombre}.` : "Vacante abierta a todas las carreras."}{" "}
          Consulta los requisitos y postulate en linea.
        </p>
      )}

      <div className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-blue-400" />
          {vacante.ciudad}
          {vacante.estado_geo ? `, ${vacante.estado_geo}` : ""}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-blue-800">
          <Wallet className="h-3.5 w-3.5 text-blue-400" />
          {rangoSalario(vacante.salario)}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-blue-50 pt-3.5">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          {hace(vacante.publicada_en)}
        </span>
        <Button asChild variant="ghost" size="sm" className="group/boton px-2 text-blue-700">
          <Link to={`/vacantes/${vacante.id}`}>
            Ver vacante
            <ArrowUpRight className="transition group-hover/boton:-translate-y-0.5 group-hover/boton:translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function VacanteCardEsqueleto() {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-suave">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-blue-100/70" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-blue-100/70" />
          <div className="h-4 w-full animate-pulse rounded bg-blue-100/70" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-24 animate-pulse rounded-full bg-blue-100/70" />
        <div className="h-5 w-20 animate-pulse rounded-full bg-blue-100/70" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-1/2 animate-pulse rounded bg-blue-100/70" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-blue-100/70" />
      </div>
      <div className="mt-5 h-9 w-full animate-pulse rounded-lg bg-blue-100/70" />
    </div>
  );
}

export function EmpresaAvatar({ nombre, className }: { nombre: string | null; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 font-extrabold text-blue-700 ring-1 ring-blue-100",
        className,
      )}
    >
      {nombre ? iniciales(nombre) : <Building2 className="h-5 w-5" />}
    </div>
  );
}
