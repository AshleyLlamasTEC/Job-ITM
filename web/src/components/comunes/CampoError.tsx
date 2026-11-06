import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Mensaje de error debajo de un campo del formulario. */
export function CampoError({ children, className }: { children?: string; className?: string }) {
  if (!children) return null;
  return (
    <p className={cn("mt-1.5 flex items-start gap-1 text-xs font-medium text-rose-600", className)}>
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
      {children}
    </p>
  );
}

export function Aviso({
  tono = "error",
  children,
}: {
  tono?: "error" | "info" | "exito";
  children: ReactNode;
}) {
  const estilos = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-800",
    exito: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm", estilos[tono])}>{children}</div>
  );
}
