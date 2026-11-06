import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export function EstadoVacio({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: { texto: string; a: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-sm ring-1 ring-blue-100">
        <Icono className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-blue-950">{titulo}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      {accion && (
        <Button asChild className="mt-5" size="sm">
          <Link to={accion.a}>{accion.texto}</Link>
        </Button>
      )}
    </div>
  );
}
