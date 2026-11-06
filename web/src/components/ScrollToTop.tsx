import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Vuelve al inicio de la pagina en cada cambio de ruta. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
