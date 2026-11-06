import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthProvider";
import type { Notificacion } from "@/lib/tipos";

/**
 * Contador de avisos sin leer. Se refresca cuando cualquier pantalla emite el
 * evento `jobitm:notificaciones` (por ejemplo, al marcar una como leida).
 */
export function useSinLeer(): number {
  const { usuario } = useAuth();
  const [sinLeer, setSinLeer] = useState(0);

  useEffect(() => {
    if (!usuario) {
      setSinLeer(0);
      return;
    }

    let activo = true;
    const cargar = async () => {
      try {
        const { meta } = await api.get<Notificacion[]>("/notificaciones");
        if (activo) setSinLeer(Number(meta?.sin_leer ?? 0));
      } catch {
        if (activo) setSinLeer(0);
      }
    };

    void cargar();
    window.addEventListener("jobitm:notificaciones", cargar);
    return () => {
      activo = false;
      window.removeEventListener("jobitm:notificaciones", cargar);
    };
  }, [usuario]);

  return sinLeer;
}

export function avisarNotificaciones(): void {
  window.dispatchEvent(new Event("jobitm:notificaciones"));
}
