import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

export function Logo({
  compacto = false,
  className,
  tono = "oscuro",
}: {
  compacto?: boolean;
  className?: string;
  tono?: "oscuro" | "claro";
}) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-blue-800 shadow-sm transition-transform group-hover:-rotate-3">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(200,241,105,0.45),transparent_60%)]" />
        <svg viewBox="0 0 32 32" className="relative h-6 w-6" aria-hidden="true">
          <path d="M6 8h20v4h-8v14h-4V12H6z" fill="#fde047" />
          <circle cx="24" cy="24" r="3" fill="#93c5fd" />
        </svg>
      </span>
      {!compacto && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-lg font-extrabold tracking-tight",
              tono === "claro" ? "text-white" : "text-blue-950",
            )}
          >
            Job ITM
          </span>
          <span
            className={cn(
              "mt-1 text-[9px] font-bold uppercase tracking-[0.22em]",
              tono === "claro" ? "text-blue-200" : "text-blue-600",
            )}
          >
            Tec de Mexicali
          </span>
        </span>
      )}
    </Link>
  );
}
